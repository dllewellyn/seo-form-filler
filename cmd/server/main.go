package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/dllewellyn/seo-backlink-trello/internal/agent"
	"github.com/dllewellyn/seo-backlink-trello/internal/api"
	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	"github.com/firebase/genkit/go/genkit"
	session "google.golang.org/adk/session"
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

	// Initialize Genkit
	g := genkit.Init(ctx, genkit.WithPromptDir("./prompts"))

	// Initialize ADK Agents
	agents, err := agent.InitAgents(ctx, dbClient, g)
	if err != nil {
		log.Fatalf("Failed to initialize agents: %v", err)
	}
	log.Printf("Successfully loaded %d agents", len(agents))

	sessionSvc := session.InMemoryService()

	// Setup Server and Routes
	mux := http.NewServeMux()

	// Serve React UI from ui/dist
	fs := http.FileServer(http.Dir("./ui/dist"))
	mux.Handle("/", fs)

	srv := api.NewServer(dbClient, agents, sessionSvc, g)
	srv.RegisterRoutes(mux)

	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
