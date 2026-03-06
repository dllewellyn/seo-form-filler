package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/runner"
	session "google.golang.org/adk/session"
	"google.golang.org/genai"
)

func (h *Handlers) PitchDraft(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TargetID  string `json:"targetId"`
		ProfileID string `json:"profileId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if req.TargetID == "" || req.ProfileID == "" {
		http.Error(w, "targetId and profileId are required", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Fetch the Target document
	targetDoc, err := h.DB.Firestore.Collection("targets").Doc(req.TargetID).Get(ctx)
	if err != nil {
		log.Printf("Failed to get target %s: %v", req.TargetID, err)
		http.Error(w, "Target not found", http.StatusNotFound)
		return
	}

	var target struct {
		URL    string `firestore:"url"`
		Domain string `firestore:"domain"`
	}
	if err := targetDoc.DataTo(&target); err != nil {
		http.Error(w, "Failed to parse target", http.StatusInternalServerError)
		return
	}

	// Fetch the Profile document
	profileDoc, err := h.DB.Firestore.Collection("profiles").Doc(req.ProfileID).Get(ctx)
	if err != nil {
		log.Printf("Failed to get profile %s: %v", req.ProfileID, err)
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	profileData := profileDoc.Data()
	profileJSON, err := json.Marshal(profileData)
	if err != nil {
		http.Error(w, "Failed to serialize profile", http.StatusInternalServerError)
		return
	}

	// Mark the target as generating (MergeAll = only touch the specified fields)
	_, err = h.DB.Firestore.Collection("targets").Doc(req.TargetID).Set(ctx, map[string]interface{}{
		"isGeneratingPitch": true,
	}, firestore.MergeAll)
	if err != nil {
		log.Printf("Failed to mark target as generating: %v", err)
		// Non-fatal – continue anyway
	}

	// Respond immediately with 202 Accepted
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"status": "drafting"})

	// Run the pitch agent asynchronously
	go func() {
		bgCtx := context.Background()

		pitchAgent := h.Agents["pitch"]
		if pitchAgent == nil {
			log.Printf("Pitch agent not found")
			clearPitchFlag(bgCtx, h, req.TargetID)
			return
		}

		agentRunner, err := runner.New(runner.Config{
			AppName:        "BacklinkEngine",
			Agent:          pitchAgent,
			SessionService: h.Session,
		})
		if err != nil {
			log.Printf("Pitch runner init failed: %v", err)
			clearPitchFlag(bgCtx, h, req.TargetID)
			return
		}

		sessID := fmt.Sprintf("pitch-session-%d", time.Now().UnixNano())
		_, err = h.Session.Create(bgCtx, &session.CreateRequest{
			SessionID: sessID,
			AppName:   "BacklinkEngine",
			UserID:    "system",
		})
		if err != nil {
			log.Printf("Pitch session create failed: %v", err)
		}

		prompt := fmt.Sprintf(
			"Draft a backlink pitch email for the following target website.\n\nTarget URL: %s\nTarget Domain: %s\n\nOur Company Profile:\n%s",
			target.URL, target.Domain, string(profileJSON),
		)

		agentIter := agentRunner.Run(bgCtx, "system", sessID,
			&genai.Content{Parts: []*genai.Part{{Text: prompt}}, Role: "user"},
			adkagent.RunConfig{},
		)

		pitchDraft := ""
		for ev, err := range agentIter {
			if err != nil {
				log.Printf("Pitch agent stream error: %v", err)
				clearPitchFlag(bgCtx, h, req.TargetID)
				return
			}
			if ev != nil && ev.Content != nil {
				for _, part := range ev.Content.Parts {
					if part.Text != "" {
						pitchDraft += part.Text
					}
				}
			}
		}

		if pitchDraft == "" {
			log.Printf("Pitch agent returned empty output for target %s", req.TargetID)
			clearPitchFlag(bgCtx, h, req.TargetID)
			return
		}

		// Save the pitch draft and clear loading flag
		_, err = h.DB.Firestore.Collection("targets").Doc(req.TargetID).Set(bgCtx, map[string]interface{}{
			"pitchDraft":        pitchDraft,
			"isGeneratingPitch": false,
		}, firestore.MergeAll)
		if err != nil {
			log.Printf("Failed to save pitch draft for target %s: %v", req.TargetID, err)
		} else {
			log.Printf("Pitch draft saved for target %s (%s)", req.TargetID, target.Domain)
		}
	}()
}

func clearPitchFlag(ctx context.Context, h *Handlers, targetID string) {
	_, err := h.DB.Firestore.Collection("targets").Doc(targetID).Set(ctx, map[string]interface{}{
		"isGeneratingPitch": false,
	}, firestore.MergeAll)
	if err != nil {
		log.Printf("Failed to clear isGeneratingPitch for target %s: %v", targetID, err)
	}
}
