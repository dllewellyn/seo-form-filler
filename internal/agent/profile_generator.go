package agent

import (
	"context"
	"fmt"

	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	"github.com/firebase/genkit/go/genkit"
	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	adkmodel "google.golang.org/adk/model"
	"google.golang.org/adk/tool"
)

func NewProfileGenerator(model adkmodel.LLM, dbClient *db.Client, g *genkit.Genkit) (adkagent.Agent, error) {
	sitemapTool, err := CreateSitemapCrawlerTool()
	if err != nil {
		return nil, fmt.Errorf("failed to create sitemap tool: %w", err)
	}

	scraperTool, err := CreatePageScraperTool()
	if err != nil {
		return nil, fmt.Errorf("failed to create scraper tool: %w", err)
	}

	storeSummaryTool, err := CreateStorePageSummaryTool(dbClient.Firestore)
	if err != nil {
		return nil, fmt.Errorf("failed to create store summary tool: %w", err)
	}

	genkitPrompt := genkit.LookupPrompt(g, "profile_generator")
	if genkitPrompt == nil {
		return nil, fmt.Errorf("failed to lookup profile_generator prompt")
	}

	req, err := genkitPrompt.Render(context.Background(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to render profile_generator prompt: %w", err)
	}

	instruction := ""
	for _, msg := range req.Messages {
		instruction += msg.Text() + "\n"
	}

	profileGenerator, err := llmagent.New(llmagent.Config{
		Name:        "profile_generator_agent",
		Model:       model,
		Description: "Scrapes the user's main website and generates a comprehensive SEO Master Profile.",
		Instruction: instruction,
		Tools:       []tool.Tool{sitemapTool, scraperTool, storeSummaryTool},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Profile Generator Agent: %v", err)
	}
	return profileGenerator, nil
}
