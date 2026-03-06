package agent

import (
	"fmt"

	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	adkmodel "google.golang.org/adk/model"
)

func NewOutreachAgent(model adkmodel.LLM) (adkagent.Agent, error) {
	outreachAgent, err := llmagent.New(llmagent.Config{
		Name:        "outreach_agent",
		Model:       model,
		Description: "Finds and analyzes outreach targets.",
		Instruction: "You are an expert SEO Researcher and PR Specialist. Find high-quality blogs, news sites, and resource pages for cold outreach campaigns.",
		Tools:       nil,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Outreach Agent: %v", err)
	}
	return outreachAgent, nil
}
