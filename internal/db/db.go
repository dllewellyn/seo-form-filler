package db

import (
	"context"
	"fmt"
	"log"
	"os"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
)

// Profile represents the user's master company profile
// Profile represents the user's master company profile
type Profile struct {
	ID               string            `json:"id" firestore:"id,omitempty"`
	UserID           string            `json:"userId" firestore:"userId,omitempty"`
	TargetURL        string            `json:"targetUrl" firestore:"targetUrl,omitempty"`
	CompanyName      string            `json:"companyName" firestore:"companyName"`
	ShortDescription string            `json:"shortDescription" firestore:"shortDescription"`
	LongDescription  string            `json:"longDescription" firestore:"longDescription"`
	Keywords         []string          `json:"keywords" firestore:"keywords"`
	FounderName      string            `json:"founderName,omitempty" firestore:"founderName,omitempty"`
	DynamicFields    map[string]string `json:"dynamicFields" firestore:"dynamicFields"`
}

// Target represents a backlink directory/target
type Target struct {
	ID                string `json:"id" firestore:"id"`
	ProfileID         string `json:"profileId" firestore:"profileId"`
	Type              string `json:"type" firestore:"type"` // "directory" or "outreach"
	Domain            string `json:"domain" firestore:"domain"`
	URL               string `json:"url" firestore:"url"`
	ColumnID          string `json:"columnId" firestore:"columnId"`   // e.g. "shortlist", "submitted", "contacted"
	TargetURL         string `json:"targetUrl" firestore:"targetUrl"` // URL where backlink points to
	PitchDraft        string `json:"pitchDraft,omitempty" firestore:"pitchDraft,omitempty"`
	Notes             string `json:"notes,omitempty" firestore:"notes,omitempty"`
	IsGeneratingPitch bool   `json:"isGeneratingPitch,omitempty" firestore:"isGeneratingPitch,omitempty"`
}

type PageSummary struct {
	TargetURL string `json:"targetUrl" firestore:"targetUrl"`
	URL       string `json:"url" firestore:"url"`
	Summary   string `json:"summary" firestore:"summary"`
}

type Client struct {
	Firestore *firestore.Client
	Auth      *auth.Client
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

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("error initializing auth client: %v", err)
	}

	// Make sure process doesn't exit before writing log
	emulatorHost := os.Getenv("FIRESTORE_EMULATOR_HOST")
	if emulatorHost != "" {
		log.Printf("Connected to Firestore emulator at %s", emulatorHost)
	} else {
		log.Println("Connected to production Firestore")
	}

	authEmulatorHost := os.Getenv("FIREBASE_AUTH_EMULATOR_HOST")
	if authEmulatorHost != "" {
		log.Printf("Connected to Firebase Auth emulator at %s", authEmulatorHost)
	} else {
		log.Println("Connected to production Firebase Auth")
	}

	return &Client{Firestore: client, Auth: authClient}, nil
}
