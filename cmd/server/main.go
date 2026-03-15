package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/dllewellyn/seo-backlink-trello/internal/agent"
	"github.com/dllewellyn/seo-backlink-trello/internal/api"
	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	"github.com/firebase/genkit/go/genkit"
	"github.com/joho/godotenv"
	session "google.golang.org/adk/session"
)

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on system environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// Start the HTTP server immediately so Cloud Run can detect the open port
	// within the startup timeout. Initialization happens below before routes
	// are registered, but the listener is already accepting connections.
	go func() {
		log.Printf("Server listening on port %s...", port)
		if err := http.ListenAndServe(":"+port, mux); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}()

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

	// Serve React UI from ui/dist
	fs := http.FileServer(http.Dir("./ui/dist"))
	mux.Handle("/", fs)

	// Register API routes now that all dependencies are initialised
	srv := api.NewServer(dbClient, agents, sessionSvc, g)
	srv.RegisterRoutes(mux)

	log.Println("Server fully initialised and ready to serve requests")

	// Wait for a termination signal (e.g. SIGTERM from Cloud Run) before exiting
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutdown signal received, exiting")
}
