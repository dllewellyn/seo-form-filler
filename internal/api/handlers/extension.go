package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/runner"
	session "google.golang.org/adk/session"
	"google.golang.org/genai"
)

// Chrome Extension Targets Endpoint
func (h *Handlers) ExtensionTargets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := context.Background()

	// Fetch targets from Firestore (e.g., in "shortlist" or "in-progress")
	docs, err := h.DB.Firestore.Collection("targets").Documents(ctx).GetAll()
	if err != nil {
		log.Printf("Failed to fetch targets: %v", err)
		http.Error(w, "Failed to fetch targets", http.StatusInternalServerError)
		return
	}

	var targets []db.Target
	for _, doc := range docs {
		var t db.Target
		doc.DataTo(&t)
		targets = append(targets, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(targets)
}

// Chrome Extension Master Profile Endpoint
func (h *Handlers) ExtensionProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := context.Background()

	doc, err := h.DB.Firestore.Collection("profiles").Doc("master").Get(ctx)
	if err != nil {
		log.Printf("Failed to fetch master profile: %v", err)
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	var profile db.Profile
	if err := doc.DataTo(&profile); err != nil {
		http.Error(w, "Failed to parse profile data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

// Chrome Extension Autofill Endpoint
func (h *Handlers) ExtensionAutofill(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TargetURL   string                   `json:"targetUrl"`
		PageContext string                   `json:"pageContext"`
		Elements    []map[string]interface{} `json:"elements"`
		Errors      []string                 `json:"errors"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Fetch Master Profile
	doc, err := h.DB.Firestore.Collection("profiles").Doc("master").Get(ctx)
	if err != nil {
		log.Printf("Failed to get master profile for autofill: %v", err)
		http.Error(w, "Master profile not found", http.StatusNotFound)
		return
	}

	var profile db.Profile
	if err := doc.DataTo(&profile); err != nil {
		http.Error(w, "Failed to parse profile", http.StatusInternalServerError)
		return
	}
	profileJSON, _ := json.Marshal(profile)

	// Call Form Filler Agent
	formFiller := h.Agents["form_filler"]
	if formFiller == nil {
		http.Error(w, "Form filler agent not found", http.StatusInternalServerError)
		return
	}

	agentRunner, err := runner.New(runner.Config{
		AppName:        "BacklinkEngine",
		Agent:          formFiller,
		SessionService: h.Session,
	})
	if err != nil {
		log.Printf("Runner init failed: %v", err)
		http.Error(w, "Runner failed", http.StatusInternalServerError)
		return
	}

	elementsJSON, _ := json.Marshal(req.Elements)
	prompt := fmt.Sprintf("Here is the company Master Profile:\n%s\n\nHere is the interactive form elements JSON state for %s:\n%s", string(profileJSON), req.TargetURL, string(elementsJSON))

	if len(req.Errors) > 0 {
		errorsJSON, _ := json.Marshal(req.Errors)
		prompt += fmt.Sprintf("\n\nCRITICAL WARNING! The page currently has the following validation ERRORS:\n%s\n\nEnsure your next action prioritizes fixing these invalid inputs.", string(errorsJSON))
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

	iter := agentRunner.Run(ctx, "user-id", sessID,
		&genai.Content{Parts: []*genai.Part{{Text: prompt}}, Role: "user"},
		adkagent.RunConfig{})

	rawOutput := ""
	for ev, err := range iter {
		if err != nil {
			log.Printf("Form filler agent run stream error: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"status": "error",
				"error":  fmt.Sprintf("Agent form filling failed: %v", err),
			})
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

	// Validate that it's a single action object
	var action map[string]interface{}
	if err := json.Unmarshal([]byte(rawOutput), &action); err != nil {
		log.Printf("Failed to parse Form Filler JSON: %s\nError: %v", rawOutput, err)
		// Return a fallback format so the frontend doesn't break
		res := map[string]interface{}{
			"status": "error",
			"error":  "Failed to parse agent output",
			"raw":    rawOutput,
		}
		json.NewEncoder(w).Encode(res)
		return
	}

	res := map[string]interface{}{
		"status": "success",
		"action": action,
	}
	json.NewEncoder(w).Encode(res)
}
