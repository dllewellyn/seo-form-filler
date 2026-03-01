package db

import (
	"context"
	"fmt"
	"log"
	"os"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
)

// Profile represents the user's master company profile
type Profile struct {
	ShortDescription string   `json:"shortDescription"`
	LongDescription  string   `json:"longDescription"`
	Keywords         []string `json:"keywords"`
	FounderName      string   `json:"founderName,omitempty"`
}

// Target represents a backlink directory/target
type Target struct {
	ID         string `json:"id" firestore:"id"`
	Domain     string `json:"domain" firestore:"domain"`
	URL        string `json:"url" firestore:"url"`
	Status     string `json:"status" firestore:"status"`       // e.g. "shortlist", "submitted", "contacted"
	TargetURL  string `json:"targetUrl" firestore:"targetUrl"` // URL where backlink points to
	PitchDraft string `json:"pitchDraft,omitempty" firestore:"pitchDraft,omitempty"`
}

type Client struct {
	Firestore *firestore.Client
}

func InitFirestore(ctx context.Context) (*Client, error) {
	// Let the Firebase Admin SDK find credentials automatically
	// Make sure FIRESTORE_EMULATOR_HOST is set during local dev
	conf := &firebase.Config{ProjectID: "demo-seo-backlink"}
	app, err := firebase.NewApp(ctx, conf)
	if err != nil {
		return nil, fmt.Errorf("error initializing app: %v", err)
	}

	client, err := app.Firestore(ctx)
	if err != nil {
		return nil, fmt.Errorf("error initializing firestore client: %v", err)
	}

	// Make sure process doesn't exit before writing log
	emulatorHost := os.Getenv("FIRESTORE_EMULATOR_HOST")
	if emulatorHost != "" {
		log.Printf("Connected to Firestore emulator at %s", emulatorHost)
	} else {
		log.Println("Connected to production Firestore")
	}

	return &Client{Firestore: client}, nil
}
