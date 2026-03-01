Product Requirements Document: AI SEO Backlink Engine (Power-Up Edition)

1. Objective & Architecture Summary

Build a zero/low-cost, serverless AI-driven SEO backlink acquisition system.

UI/Database: Trello (via Custom Power-Up & Webhooks). Trello handles state, auth, and data storage.

Brain: Google ADK (Agent Development Kit) running in a single Google Cloud Run container.

Execution: Headless Chrome (via MCP) for visual site navigation, and free-tier SMTP APIs (Resend/Brevo) for email outreach.

2. Data Model (Trello as DB)

Lists (Pipelines): Config, Discovery Pipeline, Directory Targets, Bespoke Targets, Approved to Send, Contacted, Completed, Failed.

Custom Fields (Visible Data): Target URL, Contact Email, Domain Authority, Target Category (SaaS, Psychology, General).

PluginData (Hidden DB): AI reasoning logs, raw scraped HTML context, and previous prompt chains (stored as JSON payloads attached to the card).

3. Implementation Phases & User Stories

Phase 1: The Foundation (Infrastructure & Comms)

Goal: Establish bi-directional communication between Trello and the Cloud Run backend.

Story 1.1 (Backend): As a developer, I want to deploy a Node.js/Python server on Google Cloud Run hosting Google ADK, providing a scalable environment to execute agent tasks.

Story 1.2 (Webhooks): As a user, I want Trello webhooks registered to my Cloud Run endpoint, so that moving a card between lists triggers an immediate JSON payload to my backend.

Story 1.3 (Power-Up): As a user, I want a private Trello Power-Up enabled on my board to add custom "Action" buttons and metadata fields (URL, DA Score, Status) to my cards.

Phase 2: The Master Profile (Data Capture)

Goal: Give the AI the structured data it needs to fill out forms and write pitches.

Story 2.1 (Company Profile): As a user, I want a dedicated "Config" card in Trello containing my Master Company Profile (Target URL, Short/Long Descriptions, Logo URL, Founder Name, custom SEO keywords).

Story 2.2 (Data Retrieval): As the ADK system, I want to fetch the Config card's data via the Trello API before starting any execution job, ensuring I use the most up-to-date company info.

Phase 3: Discovery & Shortlisting

Goal: Automate the lead generation and identification of backlink targets.

Story 3.1 (Trigger Discovery): As a user, I want to click a custom "Find Directories" Power-Up button, triggering the ADK Researcher Agent to search the web for relevant niche directories.

Story 3.2 (Card Generation): As a user, I want the ADK agent's findings to automatically populate as individual cards in a "Shortlist" Trello list, pre-filled with custom fields mapped to the directory URL and inferred Domain Authority.

Phase 4: Autonomous Submission & The Verification Loop

Goal: Let the AI drive the browser, fill out forms, and handle account creation hurdles.

Story 4.1 (Trigger Submission): As a user, I want to drag a directory card into the "Submit" list, triggering a webhook that wakes up the ADK MCP Browser Agent.

Story 4.2 (Form Filling): As the Browser Agent, I want to launch a headless Chrome instance, navigate to the target URL, visually map the Master Company Profile to the DOM elements, and submit the directory form.

Story 4.3 (The Email Verification Loop): As the system, if the directory requires an account, I want the agent to:

Sign up using a dedicated system email (submissions@yourdomain.com).

Pause the browser state and poll that email inbox (via Gmail API/IMAP).

Extract the verification link from the incoming email.

Open the link in the headless browser to verify the account and finalize the submission.

Story 4.4 (Resolution): As a user, I want the Trello card to automatically move to "Completed" (or "Failed" with an error log in the comments) once the agent finishes.

Phase 5: Bespoke Pitch Generation & Outreach

Goal: Automate high-value, personalized email outreach.

Story 5.1 (Draft Pitch): As a user, I click "Draft Pitch" on a bespoke target card. The ADK agent scrapes the target URL, identifies the backlink angle, drafts a personalized email, and saves it to the card description.

Story 5.2 (Email Dispatch): As a user, I move the card to the "Approved to Send" list. Cloud Run receives the webhook, packages the drafted text and Contact Email, and fires it via the SMTP API.