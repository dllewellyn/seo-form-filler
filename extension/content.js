// Store a map of temporary IDs to actual DOM elements
window.__autofillElements = window.__autofillElements || new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape_page") {
        try {
            const elementsData = extractInteractiveElements();
            const errorsData = extractErrorMessages();
            sendResponse({ success: true, elements: elementsData, errors: errorsData, url: window.location.href });
        } catch (err) {
            console.error("Error scraping page:", err);
            sendResponse({ success: false, error: err.message });
        }
        return false; // Sync response
    }

    if (request.action === "execute_action") {
        console.log("AI Agent executing action:", request.action_data);

        executeAction(request.action_data)
            .then(() => sendResponse({ success: true }))
            .catch(err => {
                console.error("Execute error:", err);
                sendResponse({ success: false, error: err.message });
            });

        return true; // Async response
    }
});

function getVisibleLabel(el) {
    if (el.labels && el.labels.length > 0) {
        return Array.from(el.labels).map(l => l.innerText).join(' ').trim();
    }
    if (el.getAttribute('aria-label')) {
        return el.getAttribute('aria-label').trim();
    }
    if (el.getAttribute('placeholder')) {
        return el.getAttribute('placeholder').trim();
    }
    // Try to find a preceding sibling or parent text
    if (el.previousElementSibling && el.previousElementSibling.innerText) {
        const text = el.previousElementSibling.innerText.trim();
        if (text.length > 0 && text.length < 50) return text;
    }
    return "";
}

function extractErrorMessages() {
    const errors = [];

    // Attempt to find common error elements
    const errorElements = document.querySelectorAll('.error, .invalid, [role="alert"], .text-danger, .has-error, .invalid-feedback, [aria-invalid="true"]');

    errorElements.forEach(el => {
        // Only include visible elements with text
        if (el.style.display !== 'none' && el.style.visibility !== 'hidden' && el.innerText.trim().length > 0) {

            // If the element itself is an input (e.g., aria-invalid="true"), we want to find associated error text
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                // Look for an adjacent element that might be the error message
                const nextEl = el.nextElementSibling;
                if (nextEl && nextEl.innerText.trim().length > 0) {
                    errors.push(`Field '${el.name || el.id || getVisibleLabel(el)}' is invalid: ${nextEl.innerText.trim()}`);
                } else {
                    errors.push(`Field '${el.name || el.id || getVisibleLabel(el)}' is marked as invalid.`);
                }
            } else {
                // Otherwise it's likely an error container
                errors.push(el.innerText.trim());
            }
        }
    });

    // Deduplicate and filter out very long texts that might just be large sections of the page matching a vague class
    return [...new Set(errors)].filter(e => e.length < 200);
}

function extractInteractiveElements() {
    // Clear previous mapping
    window.__autofillElements.clear();

    const interactives = document.querySelectorAll('input, select, textarea, button');
    const elementsData = [];
    let idCounter = 1;

    interactives.forEach(el => {
        // Skip hidden elements, disabled elements, or hidden inputs
        if (el.type === 'hidden' || el.disabled || el.style.display === 'none' || el.style.visibility === 'hidden') {
            return;
        }

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return;
        }

        const tempId = `ext-${idCounter++}`;
        window.__autofillElements.set(tempId, el);

        const data = {
            id: tempId,
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name || el.id || '',
            visible_label: getVisibleLabel(el),
            value: el.value || '',
            checked: el.checked || false
        };

        // Add visual indicator if the element already has a value so user knows it'll be skipped
        if ((data.value && data.value.trim() !== '') || data.checked) {
            el.style.outline = "2px dashed #aaa";
            el.title = "AI will ignore pre-filled fields";
        }

        // Add options context for select elements
        if (el.tagName.toLowerCase() === 'select') {
            data.options = Array.from(el.options).map(opt => ({
                value: opt.value,
                text: opt.text
            }));
        }

        elementsData.push(data);
    });

    return elementsData;
}

async function executeAction(actionData) {
    const { action_type, target_id, value } = actionData;

    if (action_type === 'STOP') {
        alert("AI Agent finished filling the form.");
        return;
    }

    const element = window.__autofillElements.get(target_id);

    if (!element) {
        throw new Error(`Element with id ${target_id} not found.`);
    }

    try {
        switch (action_type) {
            case "TYPE":
                element.focus();
                element.value = value || "";
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.blur();
                break;
            case "SELECT":
                element.focus();
                element.value = value;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.blur();
                break;
            case "CLICK":
                element.click();
                break;
            default:
                console.warn(`Unknown action type: ${action_type}`);
        }
    } catch (err) {
        throw new Error(`Error executing ${action_type}: ${err.message}`);
    }

    // Small delay between actions to look natural and let DOM settle
    await new Promise(r => setTimeout(r, 800));
}

