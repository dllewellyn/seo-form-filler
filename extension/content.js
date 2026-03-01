chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape_and_fill") {

        // Simple mock of scraping the form structure
        // In production, you'd extract input names, IDs, labels, etc.
        const pageHtml = document.body.innerHTML;

        // Send the HTML back to the background script to talk to the backend
        chrome.runtime.sendMessage(
            { action: "fetch_autofill", url: request.url, content: pageHtml.substring(0, 5000) }, // Truncated for demo
            (response) => {
                if (response && response.success) {
                    console.log("Received AI instructions:", response.data);
                    // Here we would iterate through response.data and map values to inputs
                    // document.querySelector('input[name="company"]').value = response.data.CompanyName;
                    alert("AI Autofill complete! Review inputs and submit.");
                } else {
                    console.error("Autofill failed:", response?.error);
                    alert("Failed to get autofill data from backend.");
                }
            }
        );
    }
});
