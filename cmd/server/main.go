package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/dllewellyn/seo-backlink-trello/internal/agent"
	"github.com/dllewellyn/seo-backlink-trello/internal/db"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Set Emulator Host for local development
	os.Setenv("FIRESTORE_EMULATOR_HOST", "localhost:8081")

	ctx := context.Background()

	// Initialize Database
	dbClient, err := db.InitFirestore(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to Firestore: %v", err)
	}
	defer dbClient.Firestore.Close()

	// Initialize ADK Agents
	agents, err := agent.InitAgents(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize agents: %v", err)
	}
	log.Printf("Successfully loaded %d agents", len(agents))

	// Serve React UI from ui/dist
	fs := http.FileServer(http.Dir("./ui/dist"))
	http.Handle("/", fs)

	// API Endpoints
	http.HandleFunc("/api/profile/generate", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement Profile Generator Agent
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotImplemented)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not implemented"})
	})

	http.HandleFunc("/api/profile", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement Update Profile
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotImplemented)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not implemented"})
	})

	http.HandleFunc("/api/research/start", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement Researcher Agent logic
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotImplemented)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not implemented"})
	})

	http.HandleFunc("/api/pitch/draft", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Implement Pitch Agent
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotImplemented)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not implemented"})
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
