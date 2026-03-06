package api

import (
	"net/http"

	"github.com/dllewellyn/seo-backlink-trello/internal/api/handlers"
	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	"github.com/firebase/genkit/go/genkit"
	adkagent "google.golang.org/adk/agent"
	session "google.golang.org/adk/session"
)

type Server struct {
	handlers *handlers.Handlers
}

func NewServer(dbClient *db.Client, agents map[string]adkagent.Agent, sessionSvc session.Service, g *genkit.Genkit) *Server {
	return &Server{
		handlers: handlers.New(dbClient, agents, sessionSvc, g),
	}
}

func (s *Server) RegisterRoutes(mux *http.ServeMux) {
	authClient := s.handlers.DB.Auth

	mux.HandleFunc("/api/profile/generate", handlers.RequireAuth(authClient, s.handlers.ProfileGenerate))
	mux.HandleFunc("/api/profile", handlers.RequireAuth(authClient, s.handlers.ProfileUpdate))
	mux.HandleFunc("/api/profile/get", handlers.RequireAuth(authClient, s.handlers.ProfileGet))
	mux.HandleFunc("/api/profile/delete", handlers.RequireAuth(authClient, s.handlers.ProfileDelete))
	mux.HandleFunc("/api/profiles", handlers.RequireAuth(authClient, s.handlers.ProfilesList))
	mux.HandleFunc("/api/research/start", handlers.RequireAuth(authClient, s.handlers.ResearchStart))
	mux.HandleFunc("/api/research/outreach", handlers.RequireAuth(authClient, s.handlers.ResearchOutreachStart))
	mux.HandleFunc("/api/pitch/draft", s.handlers.PitchDraft)
	mux.HandleFunc("/api/extension/targets", handlers.RequireAuth(authClient, s.handlers.ExtensionTargets))
	mux.HandleFunc("/api/extension/profile", handlers.RequireAuth(authClient, s.handlers.ExtensionProfile))
	mux.HandleFunc("/api/extension/autofill", handlers.RequireAuth(authClient, s.handlers.ExtensionAutofill))
}
