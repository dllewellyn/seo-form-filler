# AI SEO Backlink Engine

A bespoke tool for orchestrating Google ADK agents to discover backlink targets, draft pitches, and automate submissions.

This application uses a sophisticated modern tech stack to provide an end-to-end SEO automation experience.

## Architecture

*   **Frontend:** React (Vite-powered SPA), Tailwind CSS, dnd-kit (Kanban), Lucide React.
*   **Backend:** Go (Golang) REST API natively integrating Google ADK (Agent Development Kit).
*   **AI Models:** Google Gemini 2.5 Flash via ADK.
*   **Database:** Firebase/Firestore (Local Emulator for development).

## Core Features

*   **AI Profile Generation:** Automatically generates a comprehensive Master Company Profile by analyzing a target URL.
*   **Dynamic Data Model:** Support for a flexible, schema-less dataset through `DynamicFields`, allowing users to store any custom data (Postcode, Support Email, Telephone) required for submissions.
*   **AI Target Discovery:** Autonomously researches and discovers relevant backlink targets (directories, blogs, lists) tailored to your Master Profile.
*   **Real-time Kanban Board:** A premium drag-and-drop interface to manage targets through their lifecycle: Shortlist, In Progress, Submitted, and Contacted.
*   **Agent-to-Agent Communication:** Advanced "Agent as Tool" orchestration where the Form Filler agent can autonomously request missing data from a specialized Extraction Agent.
*   **Chrome Extension Autofill:** Integrated extension for automated form filling using the dynamic Master Profile dataset.
*   **(Upcoming) Pitch Drafting:** AI-generated personalized outreach emails for bespoke targets.

## Run Locally

You will need three terminal tabs to run the local stack:

**Terminal 1: Firebase Emulator**
Starts the local Firestore database on port 8081.
```bash
firebase emulators:start --only firestore
```

**Terminal 2: Go Backend**
Runs the Go server on port 8080. It requires a Google API key authorized for Gemini.
```bash
export FIRESTORE_EMULATOR_HOST=localhost:8081
export GOOGLE_API_KEY=your-gemini-api-key
go run ./cmd/server/main.go
```

**Terminal 3: React UI**
Starts the Vite development server on port 5173. Network requests to `/api` are automatically proxied to the Go backend.
```bash
cd ui/
npm run dev
```

Visit `http://localhost:5173/` in your browser to launch the SEO Engine.
