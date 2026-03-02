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

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getServerUrl, DEFAULT_SERVER_URL };
}
