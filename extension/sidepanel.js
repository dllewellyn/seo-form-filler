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

let allTargets = [];

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadTargets();

    document.getElementById('autofill-btn').addEventListener('click', triggerAutofill);
    document.getElementById('status-filter').addEventListener('change', renderTargets);
    document.getElementById('settings-link').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });
});

async function loadProfile() {
    const serverUrl = await getServerUrl();
    try {
        const res = await fetch(`${serverUrl}/api/extension/profile`);
        if (!res.ok) throw new Error('Failed to fetch profile');
        const profile = await res.json();

        let desc = profile.shortDescription || "No description available.";
        if (desc.length > 100) desc = desc.substring(0, 97) + "...";

        document.getElementById('profile-summary').innerHTML = `
            <strong>${profile.targetUrl || "Unknown Target"}</strong><br>
            <span style="font-size: 12px; color: #64748b;">${desc}</span>
        `;
    } catch (err) {
        document.getElementById('profile-summary').textContent = "Could not load profile. Is backend running?";
        console.error(err);
    }
}

async function loadTargets() {
    const serverUrl = await getServerUrl();
    try {
        const res = await fetch(`${serverUrl}/api/extension/targets`);
        if (!res.ok) throw new Error('Failed to fetch targets');
        allTargets = await res.json() || [];
        renderTargets();
    } catch (err) {
        document.getElementById('targets-list').textContent = "Failed to load targets.";
        console.error(err);
    }
}

function renderTargets() {
    const filter = document.getElementById('status-filter').value;
    const container = document.getElementById('targets-list');

    const filteredTargets = filter === 'all'
        ? allTargets
        : allTargets.filter(t => t.columnId === filter);

    if (filteredTargets.length === 0) {
        container.innerHTML = "<em>No targets found for this status.</em>";
        return;
    }

    container.innerHTML = filteredTargets.map(t => `
        <div class="target-item">
            <div class="target-domain">${t.domain}</div>
            <div class="status">${(t.columnId || 'unknown').toUpperCase()}</div>
            <a href="${t.url}" target="_blank" style="font-size: 10px; display: block; margin-top: 4px;">Open link</a>
        </div>
    `).join('');
}

async function triggerAutofill() {
    const btn = document.getElementById('autofill-btn');
    const loader = document.getElementById('action-loader');
    const errorMsg = document.getElementById('error-msg');

    btn.disabled = true;
    loader.style.display = 'block';
    errorMsg.style.display = 'none';

    try {
        // Find the active tab in the current window
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
            throw new Error("Cannot run on this page.");
        }

        const manualError = document.getElementById('manual-error-input').value.trim();

        // Send message to background script to coordinate the action
        chrome.runtime.sendMessage({ action: "start_autofill", tabId: tab.id, url: tab.url, manualError: manualError }, (response) => {
            btn.disabled = false;
            loader.style.display = 'none';

            if (response && response.success) {
                console.log("Autofill process complete/started", response);
            } else {
                errorMsg.textContent = (response && response.error) ? response.error : "Failed to communicate with content script.";
                errorMsg.style.display = 'block';
            }
        });
    } catch (err) {
        btn.disabled = false;
        loader.style.display = 'none';
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
        console.error(err);
    }
}
