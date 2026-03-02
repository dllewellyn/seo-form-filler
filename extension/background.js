// Shared utility to get the configured server URL
const DEFAULT_SERVER_URL = 'http://localhost:8080';

async function getServerUrl() {
    try {
        const result = await chrome.storage.sync.get(['serverUrl']);
        return result.serverUrl || DEFAULT_SERVER_URL;
    } catch (err) {
        console.error('Failed to get server URL from storage:', err);
        return DEFAULT_SERVER_URL;
    }
}

// Allow users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_autofill") {
        console.log("Starting autofill on tab", request.tabId);
        runAutofillLoop(request.tabId, request.url, request.manualError)
            .then(() => sendResponse({ success: true, message: "Autofill finished" }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep message channel open for async response
    }
});

async function runAutofillLoop(tabId, targetUrl, manualError) {
    const MAX_ITERATIONS = 15;
    let iterations = 0;
    const serverUrl = await getServerUrl();

    while (iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`--- Autofill Loop Iteration ${iterations} ---`);

        // 1. Ask content script to scrape the page state
        let scrapeResponse = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { action: "scrape_page" }, (res) => {
                if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(res);
                }
            });
        });

        // If the content script isn't loaded (e.g. extension just reloaded), inject it and retry
        if (!scrapeResponse || !scrapeResponse.success) {
            console.log("Content script not responding. Injecting now...");
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                // Small delay to allow script to initialize
                await new Promise(r => setTimeout(r, 500));

                scrapeResponse = await new Promise((resolve) => {
                    chrome.tabs.sendMessage(tabId, { action: "scrape_page" }, (res) => {
                        if (chrome.runtime.lastError) {
                            resolve({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            resolve(res);
                        }
                    });
                });
            } catch (err) {
                console.error("Injection failed:", err);
            }
        }

        if (!scrapeResponse || !scrapeResponse.success) {
            throw new Error(scrapeResponse?.error || "Failed to scrape page.");
        }

        console.log(`Captured ${scrapeResponse.elements.length} interactive elements`);

        let allErrors = scrapeResponse.errors || [];
        if (manualError && manualError.trim().length > 0) {
            allErrors.push(`MANUAL USER OVERRIDE ERROR: ${manualError}`);
        }

        // 2. Send scraped data to Backend AI
        const backendResponse = await fetch(`${serverUrl}/api/extension/autofill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                targetUrl: targetUrl,
                pageContext: scrapeResponse.url,
                elements: scrapeResponse.elements,
                errors: allErrors
            })
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            throw new Error(`Backend Error (${backendResponse.status}): ${errorText}`);
        }

        const data = await backendResponse.json();

        if (data.status !== "success" || !data.action) {
            throw new Error(data.error || "Backend failed to provide action");
        }

        console.log("Received AI Action:", data.action);

        // 3. Check for STOP condition
        if (data.action.action_type === 'STOP') {
            console.log("AI Agent signaled STOP. Form filling complete.");

            // Still send the STOP action to the content script so it can alert the user
            chrome.tabs.sendMessage(tabId, { action: "execute_action", action_data: data.action });
            break;
        }

        // 4. Send action back to content script for execution
        const execResponse = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { action: "execute_action", action_data: data.action }, (res) => {
                if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(res);
                }
            });
        });

        if (!execResponse || !execResponse.success) {
            console.warn("Execution failed:", execResponse?.error);
            // Skip to next iteration to re-scrape and try again
            continue;
        }

        // The content script already has a delay built-in before returning, so we can immediately start next iteration
    }

    if (iterations >= MAX_ITERATIONS) {
        throw new Error("Max iterations reached. Form filling aborted to prevent infinite loop.");
    }
}
