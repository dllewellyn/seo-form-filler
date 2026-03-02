package agent

import (
	"fmt"

	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	adkmodel "google.golang.org/adk/model"
)

func NewPitchAgent(model adkmodel.LLM) (adkagent.Agent, error) {
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
	return pitchAgent, nil
}
