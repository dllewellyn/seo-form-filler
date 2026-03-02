const DEFAULT_SERVER_URL = 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    document.getElementById('save-btn').addEventListener('click', saveSettings);
    document.getElementById('reset-btn').addEventListener('click', resetSettings);

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.getAttribute('data-url');
            document.getElementById('server-url').value = url;
        });
    });
});

async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['serverUrl']);
        const serverUrl = result.serverUrl || DEFAULT_SERVER_URL;
        
        document.getElementById('server-url').value = serverUrl;
        updateCurrentConfig(serverUrl);
    } catch (err) {
        console.error('Failed to load settings:', err);
        showStatus('Failed to load settings', 'error');
    }
}

async function saveSettings() {
    const serverUrl = document.getElementById('server-url').value.trim();
    
    // Validate URL
    if (!serverUrl) {
        showStatus('Please enter a server URL', 'error');
        return;
    }

    try {
        new URL(serverUrl);
    } catch (err) {
        showStatus('Invalid URL format. Please enter a valid URL (e.g., http://localhost:8080)', 'error');
        return;
    }

    // Remove trailing slash if present
    const cleanUrl = serverUrl.replace(/\/$/, '');

    try {
        await chrome.storage.sync.set({ serverUrl: cleanUrl });
        showStatus('Settings saved successfully!', 'success');
        updateCurrentConfig(cleanUrl);
        
        // Test connection
        testConnection(cleanUrl);
    } catch (err) {
        console.error('Failed to save settings:', err);
        showStatus('Failed to save settings', 'error');
    }
}

async function resetSettings() {
    try {
        await chrome.storage.sync.set({ serverUrl: DEFAULT_SERVER_URL });
        document.getElementById('server-url').value = DEFAULT_SERVER_URL;
        showStatus('Settings reset to default', 'success');
        updateCurrentConfig(DEFAULT_SERVER_URL);
    } catch (err) {
        console.error('Failed to reset settings:', err);
        showStatus('Failed to reset settings', 'error');
    }
}

function showStatus(message, type) {
    const statusMsg = document.getElementById('status-msg');
    statusMsg.textContent = message;
    statusMsg.className = `status-msg ${type}`;
    statusMsg.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
        statusMsg.style.display = 'none';
    }, 3000);
}

function updateCurrentConfig(serverUrl) {
    document.getElementById('current-config').innerHTML = `
        <strong>Server URL:</strong> <code>${serverUrl}</code>
    `;
}

async function testConnection(serverUrl) {
    try {
        const response = await fetch(`${serverUrl}/api/extension/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            showStatus('Settings saved! Connection test successful.', 'success');
        } else {
            showStatus(`Settings saved, but server returned status ${response.status}`, 'error');
        }
    } catch (err) {
        showStatus('Settings saved, but could not connect to server. Make sure it is running.', 'error');
    }
}
