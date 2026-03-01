package agent

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/genai"
)

// InitAgents configures and returns a map of all ADK LLMAgents
func InitAgents(ctx context.Context) (map[string]agent.Agent, error) {
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

	// 1. Researcher Agent
	researcher, err := llmagent.New(llmagent.Config{
		Name:        "researcher_agent",
		Model:       model,
		Description: "Finds and analyzes directory targets.",
		Instruction: "You are an expert SEO Researcher. Find niche submission directories and evaluate their Domain Authority.",
		Tools:       nil, // Add GoogleSearch or custom scraper later
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Researcher Agent: %v", err)
	}

	// 2. Form Filler Agent
	formFiller, err := llmagent.New(llmagent.Config{
		Name:        "form_filler_agent",
		Model:       model,
		Description: "Takes HTML context and Master Profile data to return a JSON of form fields to fill.",
		Instruction: `You are an expert Form Filler. 
		You will be given the HTML of a form and the company Master Profile data. 
		Map the profile data to the form fields and output a structured JSON mapping ID/name of elements to values.`,
		Tools: nil,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Form Filler Agent: %v", err)
	}

	// 3. Pitch Agent
	pitchAgent, err := llmagent.New(llmagent.Config{
		Name:        "pitch_agent",
		Model:       model,
		Description: "Drafts bespoke email pitches for outreach.",
		Instruction: "You are a specialized PR executive. Draft personalized email pitches for SEO backlink requests based on the target domain.",
		Tools:       nil,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Pitch Agent: %v", err)
	}

	agents := map[string]agent.Agent{
		"researcher":  researcher,
		"form_filler": formFiller,
		"pitch":       pitchAgent,
	}

	return agents, nil
}
