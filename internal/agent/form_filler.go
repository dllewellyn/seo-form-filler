package agent

import (
	"fmt"

	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	adkmodel "google.golang.org/adk/model"
)

func NewFormFiller(model adkmodel.LLM, extractionAgent adkagent.Agent) (adkagent.Agent, error) {
	formFiller, err := llmagent.New(llmagent.Config{
		Name:        "form_filler_agent",
		Model:       model,
		Description: "Takes the page state context (JSON) and Master Profile data to return a single structured action to fill.",
		Instruction: `You are an expert Form Filler operating as an agent in a ReAct loop.
		You will be given the simplified JSON state of interactive elements on a form and the company's Master Profile data (including Company Name, Descriptions, Keywords, etc.).
		Your job is to determine the SINGLE optimal next action to progress the form towards completion based on the Master Profile context.
		
		CRITICAL INSTRUCTION: If you encounter a complex field that requires specific information you DO NOT have in the Master Profile (e.g., Postcode, Telephone, specific Support Email), you MUST use the provided 'extraction_agent' tool FIRST to find that information on the target website. Only output a final DOM action once you have the required info!

		If the form is completely filled and submitted or there is nothing left to do, output a STOP action.
		Final output MUST be a valid JSON object representing a SINGLE action. DO NOT wrap it in an array or markdown block. 
		The object must strictly follow this schema:
		{
		  "action_type": string, // ENUM: "TYPE", "CLICK", "SELECT", "STOP"
		  "target_id": string, // The temporary ID (e.g., "ext-1") of the target element. Leave empty if action_type is "STOP"
		  "value": string, // Optional, the string value to insert or select
		  "reasoning": string // Brief explanation of why this action was chosen
		}
		Example: 
		{"action_type": "TYPE", "target_id": "ext-2", "value": "Acme Corp", "reasoning": "Filling company name"}`,
		SubAgents: []adkagent.Agent{extractionAgent},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Form Filler Agent: %v", err)
	}
	return formFiller, nil
}
