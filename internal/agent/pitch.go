package agent

import (
	"fmt"

	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	adkmodel "google.golang.org/adk/model"
	"google.golang.org/adk/tool"
)

func NewPitchAgent(model adkmodel.LLM) (adkagent.Agent, error) {
	sitemapTool, err := CreateSitemapCrawlerTool()
	if err != nil {
		return nil, fmt.Errorf("failed to create sitemap tool for pitch agent: %v", err)
	}

	scraperTool, err := CreatePageScraperTool()
	if err != nil {
		return nil, fmt.Errorf("failed to create scraper tool for pitch agent: %v", err)
	}

	pitchAgent, err := llmagent.New(llmagent.Config{
		Name:        "pitch_agent",
		Model:       model,
		Description: "Drafts bespoke email pitches for SEO backlink outreach by researching both the target website and our own site.",
		Instruction: `You are a skilled PR executive specialising in SEO backlink outreach.

When asked to draft a pitch for a target website:
1. Use the scrape_page tool to fetch and read the target website homepage (and optionally 1-2 blog/article pages you discover via the sitemap tool).
2. Understand the target site's purpose, audience, and the kind of content they publish.
3. Use the company profile information provided to understand what we are pitching and why it is relevant to the target.
4. Write a short, personalised pitch email (150-220 words) with a compelling subject line.
5. Output ONLY the final email – subject line first, then body. No commentary.`,
		Tools: []tool.Tool{sitemapTool, scraperTool},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Pitch Agent: %v", err)
	}
	return pitchAgent, nil
}
