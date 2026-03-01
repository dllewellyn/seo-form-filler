package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/dllewellyn/seo-backlink-trello/internal/agent"
	"github.com/dllewellyn/seo-backlink-trello/internal/trello"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	ctx := context.Background()

	// Initialize ADK Agents
	agents, err := agent.InitAgents(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize agents: %v", err)
	}
	log.Printf("Successfully loaded %d agents", len(agents))

	// Serve Static Files for Trello Power-Up
	fs := http.FileServer(http.Dir("./powerup"))
	http.Handle("/powerup/", http.StripPrefix("/powerup/", fs))

	// Trello Webhook Endpoint
	http.HandleFunc("/api/trello/webhook", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodHead {
			w.WriteHeader(http.StatusOK)
			return
		}

		var payload trello.WebhookPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		// Handle asynchronous Trello events (e.g. moving a card to 'Shortlist')
		go trello.HandleWebhook(ctx, payload)

		w.WriteHeader(http.StatusOK)
	})

	// Chrome Extension Autofill Endpoint
	http.HandleFunc("/api/extension/autofill", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			TargetURL   string `json:"targetUrl"`
			PageContent string `json:"pageContent"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		// TODO: Call Form Filler Agent
		res := map[string]string{
			"status": "success",
			"mock":   "data",
		}
		json.NewEncoder(w).Encode(res)
	})

	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
