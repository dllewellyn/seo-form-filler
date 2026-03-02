package agent

import (
	"fmt"

	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	adkmodel "google.golang.org/adk/model"
)

func NewResearcher(model adkmodel.LLM) (adkagent.Agent, error) {
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
	return researcher, nil
}
