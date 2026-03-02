# SEO Autofill Agent - Chrome Extension

AI-powered form filler for SEO backlink submission, powered by Google ADK agents.

## Features

- **Configurable Backend Server**: Set your backend server URL in the extension settings
- **Autonomous Form Filling**: Iterative AI-driven form field detection and filling
- **Side Panel UI**: Convenient sidebar for triggering autofill and viewing targets
- **Error Context Support**: Manually provide error context to help the AI correct mistakes
- **Target Management**: View and filter your backlink targets by status

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `extension/` directory from this repository

## Configuration

### Setting the Server URL

The extension can connect to any backend server instance (local or remote):

1. Click the extension icon to open the side panel
2. Click **⚙️ Configure Server URL** at the top
3. Enter your backend server URL (e.g., `http://localhost:8080` or `https://your-app.run.app`)
4. Click **Save Settings**

Alternatively, right-click the extension icon and select **Options** to access the settings page directly.

### Default Configuration

- **Default Server URL**: `http://localhost:8080`
- Settings are saved using Chrome's sync storage and will persist across browser sessions

### Presets

The settings page includes quick presets for common configurations:
- **Localhost (Default)**: `http://localhost:8080`
- **Cloud Run**: `https://your-app.run.app` (customize as needed)

## Usage

1. **Ensure your backend is running** at the configured URL
2. Navigate to a target directory website you want to submit to
3. Click the extension icon to open the side panel
4. Click **Autofill Target Form** to start the AI-powered form filling process
5. (Optional) Add manual error context in the text area if the form shows validation errors
6. Review the filled form and submit manually

## How It Works

1. The extension scrapes interactive elements (inputs, selects, textareas, buttons) from the current page
2. Sends the page context to your backend server's ADK Form Filler agent
3. The AI agent determines the next action (TYPE, SELECT, CLICK, or STOP)
4. The extension executes the action on the page
5. Repeats until the form is complete (max 15 iterations to prevent infinite loops)

## Permissions

- **activeTab**: Access the current tab's content
- **scripting**: Inject content scripts for DOM interaction
- **storage**: Save server configuration settings
- **sidePanel**: Display the side panel UI
- **host_permissions**: Connect to your backend server and any target websites

## Troubleshooting

### "Could not load profile. Is backend running?"

- Verify your backend server is running at the configured URL
- Check the server URL in Settings (⚙️ icon)
- Ensure there are no CORS issues (backend should allow requests from `chrome-extension://`)

### "Failed to communicate with content script"

- Reload the extension from `chrome://extensions/`
- Refresh the target website page
- The content script will be automatically injected on first autofill attempt

### Connection Test

The settings page automatically tests the connection when you save settings. If the test fails:
1. Verify the URL is correct (no trailing slash)
2. Ensure the backend server is running
3. Check that the `/api/extension/profile` endpoint is accessible

## Development

### Files

- `manifest.json` - Extension manifest with permissions and configuration
- `background.js` - Service worker handling the autofill loop orchestration
- `content.js` - Content script for DOM scraping and action execution
- `sidepanel.html/js` - Side panel UI for triggering actions and viewing targets
- `options.html/js` - Settings page for configuring the server URL
- `config.js` - Shared utility for retrieving server configuration

### Version History

- **v1.1** - Added configurable server URL and settings page
- **v1.0** - Initial release with hardcoded localhost server

## License

See the main repository LICENSE file.
