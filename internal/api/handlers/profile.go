package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	"github.com/google/uuid"
	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/runner"
	session "google.golang.org/adk/session"
	"google.golang.org/genai"
)

func (h *Handlers) ProfileGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		URL string `json:"url"`
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

	log.Printf("Generating profile for URL: %s", req.URL)

	// 1. Fetch HTML
	resp, err := http.Get(req.URL)
	if err != nil {
		http.Error(w, "Failed to fetch URL", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Let's just use a buffer to read the first 100kb
	buf := make([]byte, 100000)
	n, _ := io.ReadFull(resp.Body, buf)
	if n == 0 {
		n, _ = resp.Body.Read(buf)
	}
	htmlContent := string(buf[:n])

	// 2. Call the ADK Agent via Runner
	profileAgent := h.Agents["profile_generator"]
	if profileAgent == nil {
		http.Error(w, "Profile generator agent not found", http.StatusInternalServerError)
		return
	}

	agentRunner, err := runner.New(runner.Config{
		AppName:        "BacklinkEngine",
		Agent:          profileAgent,
		SessionService: h.Session,
	})
	if err != nil {
		log.Printf("Runner init failed: %v", err)
		http.Error(w, "Runner failed", http.StatusInternalServerError)
		return
	}

	prompt := fmt.Sprintf("Here is the HTML context for %s:\n%s", req.URL, htmlContent)

	ctx := context.Background()
	sessID := fmt.Sprintf("session-%d", time.Now().UnixNano())
	_, err = h.Session.Create(ctx, &session.CreateRequest{
		SessionID: sessID,
		AppName:   "BacklinkEngine",
		UserID:    "user-id",
	})
	if err != nil {
		log.Printf("Session create failed: %v", err)
	}

	iter := agentRunner.Run(ctx, "user-id", sessID,
		&genai.Content{Parts: []*genai.Part{{Text: prompt}}, Role: "user"},
		adkagent.RunConfig{})

	rawOutput := ""
	for ev, err := range iter {
		if err != nil {
			log.Printf("Agent run stream error: %v", err)
			http.Error(w, "Agent generation failed", http.StatusInternalServerError)
			return
		}

		// Extract from model's response parts
		if ev != nil && ev.Content != nil {
			for _, part := range ev.Content.Parts {
				if part.Text != "" {
					rawOutput += part.Text
				}
			}
		}
	}

	if rawOutput == "" {
		http.Error(w, "Invalid agent response", http.StatusInternalServerError)
		return
	}

	log.Printf("DEBUG: Raw Output from Agent: %s", rawOutput)

	// Keep only the JSON object by finding the first '{' and last '}'
	startIdx := strings.Index(rawOutput, "{")
	endIdx := strings.LastIndex(rawOutput, "}")

	if startIdx != -1 && endIdx != -1 && endIdx > startIdx {
		rawOutput = rawOutput[startIdx : endIdx+1]
	} else {
		// fallback to stripping backticks if curly braces didn't enclose it correctly
		if len(rawOutput) > 7 && rawOutput[:7] == "```json" {
			rawOutput = rawOutput[7:]
			if rawOutput[len(rawOutput)-3:] == "```" {
				rawOutput = rawOutput[:len(rawOutput)-3]
			}
		}
	}

	var result struct {
		CompanyProfile db.Profile `json:"company_profile"`
	}

	if err := json.Unmarshal([]byte(rawOutput), &result); err != nil {
		log.Printf("Failed to parse agent JSON: %s\nError: %v", rawOutput, err)
		http.Error(w, "Failed to parse profile", http.StatusInternalServerError)
		return
	}

	profile := result.CompanyProfile

	// Fallback if LLM didn't use the wrapper
	if profile.ShortDescription == "" && profile.LongDescription == "" {
		if err := json.Unmarshal([]byte(rawOutput), &profile); err != nil {
			log.Printf("Failed to parse agent JSON fallback: %s\nError: %v", rawOutput, err)
		}
	}

	profile.TargetURL = req.URL
	profile.ID = uuid.NewString()
	profile.UserID = userID

	// 4. Save to Firestore (upsert)
	_, err = h.DB.Firestore.Collection("profiles").Doc(profile.ID).Set(ctx, profile)
	if err != nil {
		log.Printf("Failed to save to Firestore: %v", err)
		http.Error(w, "Failed to save profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

func (h *Handlers) ProfileUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var profile db.Profile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if profile.ID == "" {
		http.Error(w, "Bad Request: Missing ID", http.StatusBadRequest)
		return
	}

	if profile.UserID != userID && profile.UserID != "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profile.UserID = userID // Ensure it's correctly mapped

	ctx := context.Background()
	_, err := h.DB.Firestore.Collection("profiles").Doc(profile.ID).Set(ctx, profile)
	if err != nil {
		log.Printf("Failed to update profile: %v", err)
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handlers) ProfilesList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	ctx := context.Background()
	iter := h.DB.Firestore.Collection("profiles").Where("userId", "==", userID).Documents(ctx)
	docs, err := iter.GetAll()
	if err != nil {
		log.Printf("Failed to get profiles: %v", err)
		http.Error(w, "Failed to fetch profiles", http.StatusInternalServerError)
		return
	}

	var profiles []db.Profile
	for _, doc := range docs {
		var p db.Profile
		doc.DataTo(&p)
		profiles = append(profiles, p)
	}

	if profiles == nil {
		profiles = []db.Profile{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profiles)
}

func (h *Handlers) ProfileGet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profileID := r.URL.Query().Get("profileId")
	if profileID == "" {
		http.Error(w, "Bad Request: Missing profileId", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	doc, err := h.DB.Firestore.Collection("profiles").Doc(profileID).Get(ctx)
	if err != nil {
		log.Printf("Failed to get profile: %v", err)
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	var p db.Profile
	doc.DataTo(&p)

	if p.UserID != userID && p.UserID != "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (h *Handlers) ProfileDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value(UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profileID := r.URL.Query().Get("profileId")
	if profileID == "" {
		http.Error(w, "Bad Request: Missing profileId", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	doc, err := h.DB.Firestore.Collection("profiles").Doc(profileID).Get(ctx)
	if err != nil {
		log.Printf("Failed to get profile to delete: %v", err)
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	var p db.Profile
	doc.DataTo(&p)

	if p.UserID != userID && p.UserID != "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	_, err = h.DB.Firestore.Collection("profiles").Doc(profileID).Delete(ctx)
	if err != nil {
		log.Printf("Failed to delete profile: %v", err)
		http.Error(w, "Failed to delete profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
