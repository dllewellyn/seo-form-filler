package agent

import (
	"fmt"

	"github.com/dllewellyn/seo-backlink-trello/internal/db"
	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	adkmodel "google.golang.org/adk/model"
	"google.golang.org/adk/tool"
	"google.golang.org/genai"
)

func NewExtractionAgent(model adkmodel.LLM, dbClient *db.Client) (adkagent.Agent, error) {
	scraperTool, err := CreatePageScraperTool()
	if err != nil {
		return nil, fmt.Errorf("failed to create scraper tool: %w", err)
	}

	saveFieldTool, err := CreateSaveExtractedFieldTool(dbClient)
	if err != nil {
		return nil, fmt.Errorf("failed to create save field tool: %w", err)
	}

	extractionAgent, err := llmagent.New(llmagent.Config{
		Name:        "extraction_agent",
		Model:       model,
		Description: "An agent that acts as a tool to extract specific requested information (e.g., postcode, specific email) by scraping a target website. Provide the requested_field and target_url.",
		Instruction: `You are an expert Data Extraction Agent. 
You have been called upon by another agent because information is missing from the profile.
Your goal is to find the information requested in 'requested_field' on the website 'target_url'.

1. Use the scrape_page tool to fetch the content from target_url.
2. If the information is found, IMMEDIATELY call the save_extracted_field tool with the field name and the value.
3. Then return a summary of what you found. If you cannot find it after reviewing the page, return a message saying it could not be found.`,
		InputSchema: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"requested_field": {
					Type:        genai.TypeString,
					Description: "The name of the missing piece of information (e.g. 'Postcode', 'Support Email')",
				},
				"field_description": {
					Type:        genai.TypeString,
					Description: "A description of what the field is, to help with extraction",
				},
				"target_url": {
					Type:        genai.TypeString,
					Description: "The website URL to scrape to find this information",
				},
			},
			Required: []string{"requested_field", "target_url"},
		},
		Tools: []tool.Tool{scraperTool, saveFieldTool},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Extraction Agent: %v", err)
	}
	return extractionAgent, nil
}
