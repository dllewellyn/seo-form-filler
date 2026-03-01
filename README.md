# AI SEO Backlink Engine

A zero/low-cost, serverless AI-driven SEO backlink acquisition system built using the **Google Agent Development Kit (ADK) for Go**, Trello (as a database and UI via Power-Up), and a custom Chrome Extension.

This system orchestrates multiple AI agents to discover backlink directories, map company profile data to forms, and draft bespoke email pitches.

## Architecture

1.  **Trello Data Model & Power-Up**: Trello serves as the state machine and primary user interface. 
    - Lists represent pipeline stages (Config, Discovery, Shortlist, Submitted, Contacted).
    - Custom Power-Up buttons ("Find Directories", "Draft Pitch", "Submit via Extension") interact with the Go backend via Webhooks and open target URLs.
2.  **Go ADK Backend**: A serverless Go application running ADK agents.
    - **Researcher Agent**: Finds and analyzes directory targets based on niche keywords.
    - **Form Filler Agent**: Takes HTML context from the Chrome Extension and the Master Profile data from Trello, returning a structured JSON representation of the form fields to fill.
    - **Pitch Agent**: Drafts bespoke email pitches for outreach, saving them back to the Trello card.
3.  **Chrome Extension (AI Form Filler)**: Gives the user full control of the submission process securely on the client side. It scrapes the target page's DOM, asks the Go backend for an AI-generated mapping of input fields based on your Config profile, and automatically populates the form inputs.

## Prerequisites

- [Go 1.24.4+](https://go.dev/dl/)
- A [Gemini API Key](https://aistudio.google.com/app/apikey)
- A Trello Account (for creating boards and a Custom Power-Up)
- Google Chrome (to load the unpacked extension)

## Setup & Deployment

### 1. Backend Server Setup

1.  Set your Gemini API key in your environment:
    ```bash
    export GOOGLE_API_KEY="your-gemini-api-key"
    ```
2.  Run the Go server locally:
    ```bash
    go run cmd/server/main.go
    ```
    *The server will start on port `8080`, hosting the Trello Power-Up static files and webhook endpoints.*

### 2. Trello Power-Up Setup

1.  Use `ngrok` or expose your local port `8080` to the internet (e.g., `https://your-ngrok-url.app`).
2.  Go to the [Trello Developer Portal](https://trello.com/power-ups) and create a new Custom Power-Up.
3.  Set the **Iframe connector URL** to `https://your-ngrok-url.app/powerup/index.html`.
4.  Enable the Power-Up on your SEO Backlink Trello board.
5.  Set up Trello Webhooks via the Trello API, pointing them to `https://your-ngrok-url.app/api/trello/webhook`.

### 3. Chrome Extension Setup

1.  Open Google Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked** and select the `extension/` directory in this repository.
4.  The "SEO Autofill Agent" extension will now appear in your browser. (Note: It currently expects the Go server to be running on `http://localhost:8080`).

## Usage Workflow

1.  **Configure Profile**: Create a "Config" card in your Trello board with your Master Company Profile.
2.  **Discover**: Click the Power-Up button **"Find Directories"** on a card. The ADK Researcher Agent will trigger and populate the "Shortlist" list with new Trello cards representing backlink targets.
3.  **Autofill**: 
    - Move a target card to "Submit".
    - Click **"Submit via Extension"** on the card to open the directory website.
    - Click the Chrome Extension icon. It will grab the page HTML, send it to the Go backend (`Form Filler Agent`), and automatically fill out the inputs on the page for you to review and submit.
4.  **Pitch**: For bespoke blogs, click **"Draft Pitch"** on a card. The Pitch Agent will write a personalized outreach email based on the target website and save it to the card's description.

## Development

- `cmd/server/main.go`: Start here for the HTTP server handling Trello webhooks and extension API calls.
- `internal/agent/agent.go`: The core ADK initialization and instruction definitions for the 3 AI Agents.
- `powerup/client.js`: Trello UI capabilities mapping custom buttons to actions.
- `extension/content.js`: Client-side logic for DOM scraping and input injection.
