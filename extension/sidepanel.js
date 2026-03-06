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

async function getProfileId() {
    try {
        const result = await chrome.storage.sync.get(['profileId']);
        return result.profileId || '';
    } catch (err) {
        console.error('Failed to get profile ID from storage:', err);
        return '';
    }
}

let allTargets = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Setup event listeners
    document.getElementById('autofill-btn').addEventListener('click', triggerAutofill);
    document.getElementById('status-filter').addEventListener('change', renderTargets);

    document.querySelectorAll('.open-settings-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage().catch(err => {
                console.error('Could not open options page:', err);
            });
        });
    });

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Check auth state
    const token = await getValidToken();
    if (token) {
        showAppView();
        loadProfilesList(token);
    } else {
        showLoginView();
    }
});

function showLoginView() {
    document.getElementById('app-view').style.display = 'none';
    document.getElementById('login-view').style.display = 'block';
}

function showAppView() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('app-view').style.display = 'block';
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');

    if (!email || !password) {
        errorDiv.textContent = 'Please enter both email and password.';
        errorDiv.style.display = 'block';
        return;
    }

    loginBtn.disabled = true;
    errorDiv.style.display = 'none';
    loginBtn.textContent = 'Logging in...';

    const result = await loginWithEmail(email, password);

    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';

    if (result.success) {
        const token = await getValidToken();
        showAppView();
        loadProfilesList(token);
    } else {
        errorDiv.textContent = result.error || 'Login failed.';
        errorDiv.style.display = 'block';
    }
}

async function handleLogout() {
    await logout();
    showLoginView();
    document.getElementById('profile-summary').innerHTML = 'Loading profile...';
    document.getElementById('profile-select').innerHTML = '<option value="">Loading profiles...</option>';
    document.getElementById('targets-list').innerHTML = 'Loading targets...';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

async function loadProfilesList(token) {
    const serverUrl = await getServerUrl();
    try {
        const res = await fetch(`${serverUrl}/api/profiles`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            handleLogout(); // force logout if token is invalid
            throw new Error('Unauthorized');
        }
        if (!res.ok) throw new Error('Failed to fetch profiles');

        const profiles = await res.json();
        const select = document.getElementById('profile-select');
        select.innerHTML = '';

        if (!profiles || profiles.length === 0) {
            select.innerHTML = '<option value="">No profiles found</option>';
            document.getElementById('profile-summary').innerHTML = "<em>Please create a profile in the main app.</em>";
            return;
        }

        profiles.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.targetUrl || p.id;

            let desc = p.shortDescription || "No description available.";
            if (desc.length > 100) desc = desc.substring(0, 97) + "...";
            option.dataset.targetUrl = p.targetUrl || "Unknown Target";
            option.dataset.desc = desc;

            select.appendChild(option);
        });

        // Event listener for change
        select.addEventListener('change', async (e) => {
            const selectedId = e.target.value;
            const selectedOption = e.target.selectedOptions[0];
            await chrome.storage.sync.set({ profileId: selectedId });

            document.getElementById('profile-summary').innerHTML = `
                <strong>${selectedOption.dataset.targetUrl}</strong><br>
                <span style="font-size: 12px; color: #64748b;">${selectedOption.dataset.desc}</span>
            `;

            loadTargets(token);
        });

        // Select the saved one or the first one
        const currentId = await getProfileId();
        if (currentId && profiles.some(p => p.id === currentId)) {
            select.value = currentId;
        } else {
            select.value = profiles[0].id;
        }

        // Trigger the change event manually to initialize the summary and loadTargets
        select.dispatchEvent(new Event('change'));

    } catch (err) {
        console.error(err);
        document.getElementById('profile-select').innerHTML = '<option value="">Error loading profiles.</option>';
        document.getElementById('profile-summary').innerHTML = `<span style="color: #ef4444;">Error loading profile. Check settings and server connection.</span>`;
    }
}

async function loadTargets(token) {
    const serverUrl = await getServerUrl();
    const profileId = await getProfileId();

    if (!profileId) {
        document.getElementById('targets-list').innerHTML = "<em>Please configure Profile ID in settings.</em>";
        return;
    }

    try {
        const res = await fetch(`${serverUrl}/api/extension/targets?profileId=${profileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            throw new Error('Unauthorized');
        }
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
