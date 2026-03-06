# AI SEO Backlink Engine

> A bespoke tool orchestrating Google ADK agents to discover backlink targets, draft personalized pitches, and automate form submissions — end-to-end.

[![Architecture](docs/architecture.md)](docs/architecture.md)

---

## Features

| Feature | Description |
|---|---|
| 🏢 **AI Profile Generation** | Scrapes your website and generates a rich Master Company Profile using Gemini |
| 🔍 **AI Target Discovery** | Autonomously researches niche directories and backlink opportunities tailored to your profile |
| 📋 **Kanban Board** | Drag-and-drop board to manage targets through: Shortlist → In Progress → Submitted → Contacted |
| ✉️ **Pitch Drafting** | AI-generated personalized outreach emails, auto-triggered when a card enters the *Drafting* column |
| 🤖 **Chrome Extension Autofill** | Iterative AI agent that fills submission forms on target websites using your Master Profile data |
| 🔗 **Agent-to-Agent Orchestration** | The Form Filler agent can call the Extraction Agent to resolve missing data fields autonomously |

---

## Prerequisites

| Requirement | Details |
|---|---|
| **Go** | >= 1.21 |
| **Node.js** | >= 18 |
| **Firebase CLI** | `npm install -g firebase-tools` |
| **Google API Key** | Gemini access required — [get one here](https://aistudio.google.com/app/apikey) |
| **Chrome** (optional) | For the Chrome Extension autofill feature |

---

## Quick Start

The easiest way to run the full stack locally is with a single `make` command:

```bash
# 1. Copy the environment file and add your API key
cp .env.example .env
# Edit .env and set: GOOGLE_API_KEY=your-gemini-api-key

# 2. Install UI dependencies (first time only)
cd ui && npm install && cd ..

# 3. Start everything in parallel (Firestore emulator + Go backend + Vite UI)
make dev
```

Then open **[http://localhost:5173](http://localhost:5173)** in your browser.

> `make dev` kills any processes already on the dev ports, then launches all three services concurrently.

---

## Manual Setup (Three Terminals)

If you prefer to run each service individually:

**Terminal 1 — Firebase Emulator** (Firestore on port 8081)

```bash
firebase emulators:start --project demo-seo-backlink --import=./firebase-export --export-on-exit=./firebase-export
```

**Terminal 2 — Go Backend** (API server on port 8080)

```bash
export GOOGLE_API_KEY=your-gemini-api-key
export FIRESTORE_EMULATOR_HOST=localhost:8081
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
export PROJECT_ID=demo-seo-backlink
go run ./cmd/server/main.go
```

**Terminal 3 — React UI** (Vite dev server on port 5173)

```bash
cd ui
npm install  # first time only
npm run dev
```

---

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```dotenv
GOOGLE_API_KEY=your-gemini-api-key          # Required: Gemini API key
PROJECT_ID=demo-seo-backlink               # Firebase/GCP project ID
FIRESTORE_EMULATOR_HOST=localhost:8081     # Points Go backend to local emulator
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 # Points Go backend to local auth emulator
```

> **Note:** The `.env` file is automatically loaded by the `Makefile`. When running manually, export variables in your shell.

---

## Chrome Extension Setup

The extension provides AI-powered autofill on target websites using your Master Profile data.

1. Open Chrome → navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `extension/` directory
4. Click the extension icon → **⚙️ Configure Server URL**
5. Set your backend URL (default: `http://localhost:8080`)
6. Navigate to any target website → click **Autofill Target Form** in the side panel

The extension scrapes form elements, sends them to the backend ADK Form Filler agent, receives an action (TYPE / SELECT / CLICK / STOP), executes it on the page, and repeats — up to 15 iterations.

See [extension/README.md](extension/README.md) for full details and troubleshooting.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/profile/generate` | Scrape a URL and generate a Master Profile |
| `GET` | `/api/profile/get` | Fetch the current active profile |
| `PUT` | `/api/profile` | Update profile fields |
| `DELETE` | `/api/profile/delete` | Delete a profile |
| `GET` | `/api/profiles` | List all profiles |
| `POST` | `/api/research/start` | Run the Researcher agent to discover targets |
| `POST` | `/api/research/outreach` | Run the Outreach agent for bespoke targets |
| `POST` | `/api/pitch/draft` | Generate a pitch draft for a target card |
| `GET` | `/api/extension/targets` | List targets for the extension side panel |
| `GET` | `/api/extension/profile` | Get profile data for autofill |
| `POST` | `/api/extension/autofill` | Run the Form Filler agent for one iteration |

All endpoints except `/api/pitch/draft` require Firebase Auth.

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for a full component diagram.

**Tech Stack:**

- **Frontend:** React + Vite, TypeScript, Tailwind CSS, dnd-kit (drag-and-drop), Lucide icons
- **Backend:** Go (Golang) REST API with Google ADK (Agent Development Kit)
- **AI:** Google Gemini 3 Pro via ADK — 6 specialised agents
- **Database:** Firebase Firestore (Local Emulator for development, production-ready)

---

## Makefile Reference

```bash
make dev        # Kill ports, then start firestore + backend + ui in parallel
make firestore  # Start only the Firebase emulator
make backend    # Start only the Go backend
make ui         # Start only the Vite dev server
make kill       # Kill all processes on dev ports (5173, 8080, 8081, 4002)
make clean      # Kill ports and remove .cache directory
```
