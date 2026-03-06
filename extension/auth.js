const DEFAULT_FIREBASE_API_KEY = ''; // Typically required for production
const DEFAULT_AUTH_URL = 'http://localhost:9099/identitytoolkit.googleapis.com/v1'; // Default to emulator

async function getAuthConfig() {
    try {
        const result = await chrome.storage.sync.get(['firebaseApiKey', 'firebaseAuthUrl']);
        return {
            apiKey: result.firebaseApiKey || DEFAULT_FIREBASE_API_KEY,
            authUrl: result.firebaseAuthUrl || DEFAULT_AUTH_URL
        };
    } catch (err) {
        console.error('Failed to get auth config:', err);
        return { apiKey: DEFAULT_FIREBASE_API_KEY, authUrl: DEFAULT_AUTH_URL };
    }
}

async function loginWithEmail(email, password) {
    const config = await getAuthConfig();
    const url = `${config.authUrl}/accounts:signInWithPassword?key=${config.apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: true
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Login failed');
        }

        // Save tokens and expiration details to local storage
        const expirationTime = Date.now() + (parseInt(data.expiresIn) * 1000);

        await chrome.storage.local.set({
            authTokens: {
                idToken: data.idToken,
                refreshToken: data.refreshToken,
                expiresAt: expirationTime,
                email: data.email
            }
        });

        return { success: true, email: data.email };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

async function logout() {
    await chrome.storage.local.remove('authTokens');
}

async function getValidToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['authTokens'], async (result) => {
            const tokens = result.authTokens;

            if (!tokens || !tokens.idToken) {
                resolve(null);
                return;
            }

            // If the token is still valid (give 5 minute buffer)
            if (tokens.expiresAt > Date.now() + 5 * 60 * 1000) {
                resolve(tokens.idToken);
                return;
            }

            // Otherwise, we need to refresh it
            try {
                const newToken = await refreshToken(tokens.refreshToken);
                resolve(newToken);
            } catch (err) {
                console.error('Failed to refresh token:', err);
                resolve(null); // Force user to log in again
            }
        });
    });
}

async function refreshToken(refreshTok) {
    const config = await getAuthConfig();
    // The refresh endpoint path varies slightly for emulator vs real securetoken api
    // If using emulator, it often works with the same base URL structure.
    // Replace identitytoolkit.googleapis.com with securetoken.googleapis.com for prod
    let url = `${config.authUrl.replace('identitytoolkit', 'securetoken')}/token?key=${config.apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=refresh_token&refresh_token=${refreshTok}`
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Token refresh failed');
        }

        const expirationTime = Date.now() + (parseInt(data.expires_in) * 1000);

        // Update storage with new token
        await chrome.storage.local.get(['authTokens'], async (result) => {
            if (result.authTokens) {
                await chrome.storage.local.set({
                    authTokens: {
                        ...result.authTokens,
                        idToken: data.id_token,
                        refreshToken: data.refresh_token, // might be a new refresh token
                        expiresAt: expirationTime
                    }
                });
            }
        });

        return data.id_token;
    } catch (err) {
        await logout(); // Clear bad tokens
        throw err;
    }
}

// Ensure auth functions are exported if used as a module, or just available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loginWithEmail, logout, getValidToken, getAuthConfig };
}
