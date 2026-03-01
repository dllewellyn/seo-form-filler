# AI SEO Backlink Engine

A zero/low-cost, serverless AI-driven SEO backlink acquisition system built using the **Google Agent Development Kit (ADK) for Go**, Trello (as a database and UI via Power-Up), and a custom Chrome Extension.

This system orchestrates multiple AI agents to discover backlink directories, map company profile data to forms, and draft bespoke email pitches.

## Architecture

1. **Trello Data Model & Power-Up**: Trello serves as the state machine and primary user interface.
   - Lists represent pipeline stages (Config, Discovery, Shortlist, Submitted, Contacted).
   - Custom Power-Up buttons ("Find Directories", "Draft Pitch", "Submit via Extension") interact with the Go backend via Webhooks and open target URLs.

2. **Go ADK Backend**: A serverless Go application running ADK agents.
   - **Researcher Agent**: Finds and analyzes directory targets based on niche keywords.
   - **Form Filler Agent**: Takes HTML context from the Chrome Extension and the Master Profile data from Trello, returning a structured JSON representation of the form fields to fill.
   - **Pitch Agent**: Drafts bespoke email pitches for outreach, saving them back to the Trello card.

3. **Chrome Extension (AI Form Filler)**: Gives the user full control of the submission process securely on the client side. It scrapes the target page's DOM, asks the Go backend for an AI-generated mapping of input fields based on your Config profile, and automatically populates the form inputs.

## Prerequisites

- [Go 1.24.4+](https://go.dev/dl/)
- A [Gemini API Key](https://aistudio.google.com/app/apikey)
- A Trello Account (for creating boards and a Custom Power-Up)
- Google Chrome (to load the unpacked extension)

## Setup & Deployment

### 1. Backend Server Setup

1. Set your Gemini API key in your environment:

```bash
export GOOGLE_API_KEY="your-gemini-api-key"
```

2. Run the Go server locally:

```bash
go run cmd/server/main.go
```

*The server will start on port `8080`, hosting the Trello Power-Up static files and webhook endpoints.*

### 2. Trello Power-Up & Webhook Setup

1. **Start a public tunnel:** Because Trello needs to send data (webhooks) to your local server, you need a public URL. In a new terminal run:
   ```bash
   ngrok http 8080
   ```
   *Note the `Forwarding` URL it gives you (e.g., `https://abc-123.ngrok.app`). Use this wherever you see `<YOUR_NGROK_URL>` below.*

2. **Create the Power-Up:**
   - Go to the [Trello Developer Portal](https://trello.com/power-ups) and create a new Custom Power-Up.
   - For the **Iframe connector URL**, enter: `<YOUR_NGROK_URL>/powerup/index.html`
   - Add this Power-Up to your SEO Backlink Trello board via the board's Power-Up menu.

3. **Set up the Webhook (Helper Script):**
   - For Trello to tell the Go server when a button is clicked, we need a Webhook mapping your Trello Board to your server.
   - Get your **API Key** and **API Token** from [Trello Power-Up Admin](https://trello.com/app-key).
   - Get your **Board ID** (Add `.json` to the end of your Trello board URL in the browser and look for the `"id": "..."` field right at the top).
   - We've provided a helper script to register the webhook. Edit `cmd/setup/create_webhook.sh` with your keys, Board ID, and ngrok URL:
     ```bash
     nano cmd/setup/create_webhook.sh
     # Fill in API_KEY, API_TOKEN, ID_MODEL, and CALLBACK_URL
     ```
   - Run the script:
     ```bash
     bash cmd/setup/create_webhook.sh
     ```

### 3. Chrome Extension Setup

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked** and select the `extension/` directory in this repository.
4. The "SEO Autofill Agent" extension will now appear in your browser. (Note: It currently expects the Go server to be running on `http://localhost:8080`).

## Usage Workflow

1. **Configure Profile**: Create a "Config" card in your Trello board with your Master Company Profile.
2. **Discover**: Click the Power-Up button **"Find Directories"** on a card. The ADK Researcher Agent will trigger and populate the "Shortlist" list with new Trello cards representing backlink targets.
3. **Autofill**:
   - Move a target card to "Submit".
   - Click **"Submit via Extension"** on the card to open the directory website.
   - Click the Chrome Extension icon. It will grab the page HTML, send it to the Go backend (`Form Filler Agent`), and automatically fill out the inputs on the page for you to review and submit.

4. **Pitch**: For bespoke blogs, click **"Draft Pitch"** on a card. The Pitch Agent will write a personalized outreach email based on the target website and save it to the card's description.

## Development

- `cmd/server/main.go`: Start here for the HTTP server handling Trello webhooks and extension API calls.
- `internal/agent/agent.go`: The core ADK initialization and instruction definitions for the 3 AI Agents.
- `powerup/client.js`: Trello UI capabilities mapping custom buttons to actions.
- `extension/content.js`: Client-side logic for DOM scraping and input injection.
