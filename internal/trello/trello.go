package trello

import (
	"context"
	"log"
)

// WebhookPayload represents the standard Trello webhook incoming JSON payload
type WebhookPayload struct {
	Action struct {
		ID              string `json:"id"`
		IDMemberCreator string `json:"idMemberCreator"`
		Data            struct {
			List       *ListConfig  `json:"list,omitempty"`
			ListAfter  *ListConfig  `json:"listAfter,omitempty"`
			ListBefore *ListConfig  `json:"listBefore,omitempty"`
			Card       *CardConfig  `json:"card,omitempty"`
			Board      *BoardConfig `json:"board,omitempty"`
		} `json:"data"`
		Type string `json:"type"`
	} `json:"action"`
}

type ListConfig struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type CardConfig struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	IDShort   int    `json:"idShort"`
	ShortLink string `json:"shortLink"`
}

type BoardConfig struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	ShortLink string `json:"shortLink"`
}

// HandleWebhook processes Trello events asynchronously
func HandleWebhook(ctx context.Context, payload WebhookPayload) {
	log.Printf("Received Trello Webhook Event: %s", payload.Action.Type)

	// Example: Detect a card move to a specific list
	if payload.Action.Type == "updateCard" && payload.Action.Data.ListAfter != nil {
		log.Printf("Card moved to list: %s", payload.Action.Data.ListAfter.Name)
		// Trigger Researcher Agent or Pitch Agent based on the list name
	}
}

// FetchMasterProfile simulates fetching the "Config" card data from Trello
func FetchMasterProfile() map[string]string {
	return map[string]string{
		"TargetURL":      "https://example.com/saas",
		"Contact":        "hello@example.com",
		"TargetCategory": "SaaS",
	}
}
