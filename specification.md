# Product Requirements Document: AI SEO Backlink Engine

## 1. Objective & Architecture Summary

Build a zero/low-cost, serverless AI-driven SEO backlink acquisition system.

*   **UI/Frontend:** Custom React SPA (Vite, Tailwind CSS, dnd-kit) providing a sleek Kanban board interface for managing backlink targets.
*   **Database:** Firestore (running locally via emulator for development). Stores Master Company Profiles and Backlink Targets in real-time.
*   **Backend:** Go server (Cloud Run ready) leveraging the Google ADK (Agent Development Kit).
*   **Brain/Agents:** Google Gemini models orchestrated via ADK for profiling, research, and outreach drafting.
*   **Execution (Future):** Headless Chrome (via MCP) for visual site navigation, and free-tier SMTP APIs (Resend/Brevo) for email outreach. Chrome Extension for assisted form filling.

## 2. Data Model (Firestore)

*   **Collections:**
    *   `profiles`: Stores the Master Company Profile.
        *   Fields: `id`, `targetUrl`, `shortDescription`, `longDescription`, `founderName`, `keywords`.
    *   `targets`: Stores discovered backlink opportunities.
        *   Fields: `id`, `domain`, `url`, `columnId` (e.g., 'shortlist', 'in-progress', 'submitted', 'contacted'), `pitchDraft`.

## 3. Implementation Phases & User Stories

### Phase 1: The Foundation (Infrastructure & Database)

*   **Goal:** Establish the core database and backend infrastructure.
*   **Story 1.1 (Database):** As a developer, I want to use Firestore (via emulator) for rapid, schema-less data storage and real-time syncing to the frontend.
*   **Story 1.2 (Backend):** As a developer, I want to deploy a Go server that handles API requests from the frontend and interacts with Firestore and Google ADK.

### Phase 2: The Master Profile (Data Capture API)

*   **Goal:** Give the AI the structured data it needs to fill out forms and write pitches.
*   **Story 2.1 (Company Profile Generation):** As a user, I want the system to scrape my target URL and use the ADK `profile_generator` agent to automatically create a Master Company Profile.
*   **Story 2.2 (Profile Storage):** As a user, I want this generated profile saved to Firestore so it can be used across all agents and sessions.

### Phase 3: Custom Frontend UI & Kanban Board

*   **Goal:** Provide a sleek, intuitive interface for managing the SEO campaign.
*   **Story 3.1 (Setup & Review):** As a user, I want a premium UI to input my website URL and review/edit the AI-generated Master Company Profile.
*   **Story 3.2 (Kanban Board):** As a user, I want a drag-and-drop Kanban board (Shortlist, In Progress, Submitted, Contacted) to manage my discovered backlink targets. Real-time sync with Firestore ensures my data is always up-to-date.

### Phase 4: Discovery & Shortlisting (Research Agent)

*   **Goal:** Automate the lead generation and identification of backlink targets.
*   **Story 4.1 (Trigger Discovery):** As a user, I want to trigger the ADK `researcher` agent to search the web for relevant niche directories based on my Master Company Profile.
*   **Story 4.2 (Target Generation):** As a user, I want the ADK agent's findings to automatically populate as individual cards on my Kanban board in the "Shortlist" column.

### Phase 5: Autonomous Submission & Outreach (Future)

*   **Goal:** Automate form submissions and personalized email outreach.
*   **Story 5.1 (Draft Pitch):** As a user, I want an ADK agent to draft a highly personalized email pitch for specific targets, saving it to the target card.
*   **Story 5.2 (Chrome Extension Integration):** As a user, I want a Chrome Extension to fetch my current profile from the backend and assist in autofilling submission forms on directory websites.
*   **Story 5.3 (Email Dispatch):** As a user, I want the system to automatically send drafted pitches using an SMTP API when a card is moved to the "Contacted" column.