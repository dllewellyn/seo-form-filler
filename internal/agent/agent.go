package agent

import (
	"context"
	"fmt"
	"os"

	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	"github.com/firebase/genkit/go/genkit"
	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/genai"
)

// InitAgents configures and returns a map of all ADK LLMAgents
func InitAgents(ctx context.Context, dbClient *db.Client, g *genkit.Genkit) (map[string]adkagent.Agent, error) {
	apiKey := os.Getenv("GOOGLE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GOOGLE_API_KEY environment variable is not set")
	}

	model, err := gemini.NewModel(ctx, "gemini-3-pro-preview", &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create model: %v", err)
	}

	profileGenerator, err := NewProfileGenerator(model, dbClient, g)
	if err != nil {
		return nil, err
	}

	researcher, err := NewResearcher(model)
	if err != nil {
		return nil, err
	}

	extractionAgent, err := NewExtractionAgent(model, dbClient)
	if err != nil {
		return nil, err
	}

	formFiller, err := NewFormFiller(model, extractionAgent)
	if err != nil {
		return nil, err
	}

	pitchAgent, err := NewPitchAgent(model)
	if err != nil {
		return nil, err
	}

	agents := map[string]adkagent.Agent{
		"profile_generator": profileGenerator,
		"researcher":        researcher,
		"form_filler":       formFiller,
		"pitch":             pitchAgent,
		"extraction":        extractionAgent,
	}

	return agents, nil
}
