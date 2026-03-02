package handlers

import (
	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	"github.com/firebase/genkit/go/genkit"
	adkagent "google.golang.org/adk/agent"
	session "google.golang.org/adk/session"
)

type Handlers struct {
	DB      *db.Client
	Agents  map[string]adkagent.Agent
	Session session.Service
	Genkit  *genkit.Genkit
}

func New(dbClient *db.Client, agents map[string]adkagent.Agent, sessionSvc session.Service, g *genkit.Genkit) *Handlers {
	return &Handlers{
		DB:      dbClient,
		Agents:  agents,
		Session: sessionSvc,
		Genkit:  g,
	}
}
