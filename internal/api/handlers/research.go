package handlers

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	"github.com/firebase/genkit/go/genkit"
	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/runner"
	session "google.golang.org/adk/session"
	"google.golang.org/genai"
)

func (h *Handlers) ResearchStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ProfileID string `json:"profileId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if req.ProfileID == "" {
		http.Error(w, "ProfileID is required", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// 1. Fetch Profile and Existing Targets from Firestore
	doc, err := h.DB.Firestore.Collection("profiles").Doc(req.ProfileID).Get(ctx)
	if err != nil {
		log.Printf("Failed to get profile: %v", err)
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	var profile db.Profile
	if err := doc.DataTo(&profile); err != nil {
		http.Error(w, "Failed to parse profile", http.StatusInternalServerError)
		return
	}

	if profile.UserID != userID && profile.UserID != "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Fetch existing targets to avoid duplicates
	iter := h.DB.Firestore.Collection("targets").Where("profileId", "==", req.ProfileID).Documents(ctx)
	existingDocs, _ := iter.GetAll()
	existingDomains := []string{}
	for _, d := range existingDocs {
		var t db.Target
		d.DataTo(&t)
		existingDomains = append(existingDomains, t.Domain)
	}

	// 2. Call Researcher Agent
	profileJSON, _ := json.Marshal(profile)

	researchPrompt := genkit.LookupPrompt(h.Genkit, "researcher_targets")
	if researchPrompt == nil {
		log.Printf("Failed to lookup researcher_targets prompt")
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	reqOpts, err := researchPrompt.Render(ctx, map[string]any{
		"company_profile":  string(profileJSON),
		"existing_targets": strings.Join(existingDomains, ", "),
	})
	if err != nil {
		log.Printf("Failed to render prompt: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	prompt := ""
	for _, msg := range reqOpts.Messages {
		prompt += msg.Text() + "\n"
	}

	researchAgent := h.Agents["researcher"]
	if researchAgent == nil {
		http.Error(w, "Researcher agent not found", http.StatusInternalServerError)
		return
	}

	agentRunner, err := runner.New(runner.Config{
		AppName:        "BacklinkEngine",
		Agent:          researchAgent,
		SessionService: h.Session,
	})
	if err != nil {
		log.Printf("Runner init failed: %v", err)
		http.Error(w, "Runner failed", http.StatusInternalServerError)
		return
	}

	sessID := fmt.Sprintf("session-%d", time.Now().UnixNano())
	_, err = h.Session.Create(ctx, &session.CreateRequest{
		SessionID: sessID,
		AppName:   "BacklinkEngine",
		UserID:    "user-id",
	})
	if err != nil {
		log.Printf("Session create failed: %v", err)
	}

	agentIter := agentRunner.Run(ctx, "user-id", sessID,
		&genai.Content{Parts: []*genai.Part{{Text: prompt}}, Role: "user"},
		adkagent.RunConfig{})

	rawOutput := ""
	for ev, err := range agentIter {
		if err != nil {
			log.Printf("Agent run stream error: %v", err)
			http.Error(w, "Agent research failed", http.StatusInternalServerError)
			return
		}
		if ev != nil && ev.Content != nil {
			for _, part := range ev.Content.Parts {
				if part.Text != "" {
					rawOutput += part.Text
				}
			}
		}
	}

	// Strip markdown backticks if present
	if len(rawOutput) > 7 && rawOutput[:7] == "```json" {
		rawOutput = rawOutput[7:]
		if rawOutput[len(rawOutput)-3:] == "```" {
			rawOutput = rawOutput[:len(rawOutput)-3]
		}
	}

	// 3. Parse targets
	var generatedTargets []struct {
		Domain string `json:"domain"`
		URL    string `json:"url"`
	}
	if err := json.Unmarshal([]byte(rawOutput), &generatedTargets); err != nil {
		log.Printf("Failed to parse researcher JSON: %s\nError: %v", rawOutput, err)
		http.Error(w, "Failed to parse targets", http.StatusInternalServerError)
		return
	}

	// 4. Save targets to Firestore
	for _, gt := range generatedTargets {
		targetID := fmt.Sprintf("target_%x", md5.Sum([]byte(gt.URL)))
		target := db.Target{
			ID:        targetID,
			ProfileID: req.ProfileID,
			Type:      "directory",
			ColumnID:  "shortlist",
			Domain:    gt.Domain,
			URL:       gt.URL,
			TargetURL: profile.TargetURL,
		}
		_, err = h.DB.Firestore.Collection("targets").Doc(targetID).Set(ctx, target)
		if err != nil {
			log.Printf("Failed to save target %s: %v", gt.Domain, err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "count": fmt.Sprintf("%d", len(generatedTargets))})
}

func (h *Handlers) ResearchOutreachStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ProfileID string `json:"profileId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if req.ProfileID == "" {
		http.Error(w, "ProfileID is required", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// 1. Fetch Profile and Existing Targets from Firestore
	doc, err := h.DB.Firestore.Collection("profiles").Doc(req.ProfileID).Get(ctx)
	if err != nil {
		log.Printf("Failed to get profile: %v", err)
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	var profile db.Profile
	if err := doc.DataTo(&profile); err != nil {
		http.Error(w, "Failed to parse profile", http.StatusInternalServerError)
		return
	}

	if profile.UserID != userID && profile.UserID != "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Fetch existing targets to avoid duplicates
	iter := h.DB.Firestore.Collection("targets").Where("profileId", "==", req.ProfileID).Documents(ctx)
	existingDocs, _ := iter.GetAll()
	existingDomains := []string{}
	for _, d := range existingDocs {
		var t db.Target
		d.DataTo(&t)
		existingDomains = append(existingDomains, t.Domain)
	}

	// 2. Call Researcher Agent
	profileJSON, _ := json.Marshal(profile)

	researchPrompt := genkit.LookupPrompt(h.Genkit, "outreach_targets")
	if researchPrompt == nil {
		log.Printf("Failed to lookup outreach_targets prompt")
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	reqOpts, err := researchPrompt.Render(ctx, map[string]any{
		"company_profile":  string(profileJSON),
		"existing_targets": strings.Join(existingDomains, ", "),
	})
	if err != nil {
		log.Printf("Failed to render prompt: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	prompt := ""
	for _, msg := range reqOpts.Messages {
		prompt += msg.Text() + "\n"
	}

	researchAgent := h.Agents["outreach"]
	if researchAgent == nil {
		http.Error(w, "Outreach agent not found", http.StatusInternalServerError)
		return
	}

	agentRunner, err := runner.New(runner.Config{
		AppName:        "BacklinkEngine",
		Agent:          researchAgent,
		SessionService: h.Session,
	})
	if err != nil {
		log.Printf("Runner init failed: %v", err)
		http.Error(w, "Runner failed", http.StatusInternalServerError)
		return
	}

	sessID := fmt.Sprintf("session-%d", time.Now().UnixNano())
	_, err = h.Session.Create(ctx, &session.CreateRequest{
		SessionID: sessID,
		AppName:   "BacklinkEngine",
		UserID:    "user-id",
	})
	if err != nil {
		log.Printf("Session create failed: %v", err)
	}

	agentIter := agentRunner.Run(ctx, "user-id", sessID,
		&genai.Content{Parts: []*genai.Part{{Text: prompt}}, Role: "user"},
		adkagent.RunConfig{})

	rawOutput := ""
	for ev, err := range agentIter {
		if err != nil {
			log.Printf("Agent run stream error: %v", err)
			http.Error(w, "Agent research failed", http.StatusInternalServerError)
			return
		}
		if ev != nil && ev.Content != nil {
			for _, part := range ev.Content.Parts {
				if part.Text != "" {
					rawOutput += part.Text
				}
			}
		}
	}

	// Strip markdown backticks if present
	if len(rawOutput) > 7 && rawOutput[:7] == "```json" {
		rawOutput = rawOutput[7:]
		if rawOutput[len(rawOutput)-3:] == "```" {
			rawOutput = rawOutput[:len(rawOutput)-3]
		}
	}

	// 3. Parse targets
	var generatedTargets []struct {
		Domain string `json:"domain"`
		URL    string `json:"url"`
	}
	if err := json.Unmarshal([]byte(rawOutput), &generatedTargets); err != nil {
		log.Printf("Failed to parse outreach JSON: %s\nError: %v", rawOutput, err)
		http.Error(w, "Failed to parse targets", http.StatusInternalServerError)
		return
	}

	// 4. Save targets to Firestore
	for _, gt := range generatedTargets {
		targetID := fmt.Sprintf("target_%x", md5.Sum([]byte(gt.URL)))
		target := db.Target{
			ID:        targetID,
			ProfileID: req.ProfileID,
			Type:      "outreach",
			ColumnID:  "shortlist",
			Domain:    gt.Domain,
			URL:       gt.URL,
			TargetURL: profile.TargetURL,
		}
		_, err = h.DB.Firestore.Collection("targets").Doc(targetID).Set(ctx, target)
		if err != nil {
			log.Printf("Failed to save target %s: %v", gt.Domain, err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "count": fmt.Sprintf("%d", len(generatedTargets))})
}
