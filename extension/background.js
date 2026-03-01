chrome.action.onClicked.addListener((tab) => {
    // Send a message to the content script to trigger scraping
    chrome.tabs.sendMessage(tab.id, { action: "scrape_and_fill", url: tab.url });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetch_autofill") {
        // Call the Go backend
        fetch("http://localhost:8080/api/extension/autofill", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                targetUrl: request.url,
                pageContent: request.content
            })
        })
            .then(response => response.json())
            .then(data => {
                sendResponse({ success: true, data: data });
            })
            .catch(error => {
                console.error("Error fetching autofill data:", error);
                sendResponse({ success: false, error: error.toString() });
            });

        return true; // Indicates we will send a response asynchronously
    }
});
