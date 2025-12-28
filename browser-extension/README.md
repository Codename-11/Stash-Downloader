# Stash Downloader Browser Extension

A Firefox extension for sending URLs directly to your Stash Downloader queue.

## Features

- **One-click saving** - Click the extension icon to add the current page to your queue
- **Context menu** - Right-click any link to send it to Stash Downloader
- **Real-time updates** - URLs appear in your queue instantly (no page refresh needed)
- **Content type detection** - Auto-detects Video/Image/Gallery based on URL patterns
- **Connection status** - Shows whether your Stash instance is reachable

## Installation

### Firefox Add-ons (Recommended)

[![Firefox Add-ons](https://img.shields.io/amo/v/stash-downloader-extension?logo=firefox&label=Firefox%20Add-on)](https://addons.mozilla.org/en-US/firefox/addon/stash-downloader-extension/)

[**Install from Firefox Add-ons**](https://addons.mozilla.org/en-US/firefox/addon/stash-downloader-extension/)

### Manual Installation (Development/Testing)

1. Open Firefox and go to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on..."
4. Select the `manifest.json` file from the `browser-extension/` folder

> **Note:** Temporary add-ons are removed when Firefox closes.

### Configure

1. Click the extension icon in the toolbar
2. Click "Config" to open settings
3. Enter your Stash URL (e.g., `http://localhost:9999`)
4. Add your API key if authentication is enabled
5. Click "Save Settings"

## Usage

### From the Popup
1. Navigate to a page with content you want to download
2. Click the Stash Downloader extension icon
3. Select the content type (Video/Image/Gallery)
4. Click "Save"

### From Context Menu
1. Right-click any link on a page
2. Select "Send to Stash Downloader"
3. Choose the content type (Video/Image/Gallery)

## Requirements

- Firefox 142+ (or latest version recommended)
- Stash with the Stash Downloader plugin installed
- The Stash Downloader page should be open for real-time updates (otherwise it will open a new tab)

## How It Works

1. The extension captures URLs from the current page or right-click context
2. It sends a message to a content script running on your Stash domain
3. The content script dispatches a custom event that the React app listens for
4. The URL is added to the queue in real-time

If the Stash Downloader page isn't open, it falls back to opening the page with URL parameters.

## Building for Distribution

To create a signed extension for permanent installation:

1. Create a Mozilla Add-ons account
2. Package the extension:
   ```bash
   cd browser-extension
   zip -r stash-downloader-extension.zip * -x "*.DS_Store"
   ```
   **Important**: The ZIP must contain files at root level (manifest.json, background.js, etc.), not inside a folder.
3. Upload `stash-downloader-extension.zip` to [addons.mozilla.org](https://addons.mozilla.org/developers/)

## Troubleshooting

### "Not connected" status
- Verify your Stash URL is correct
- Check if Stash is running
- If using authentication, make sure API key is correct

### URLs not appearing in queue
- Make sure the Stash Downloader page is open
- Check browser console for errors
- Try refreshing the Stash page

### Content script not running
- The extension needs permission to run on your Stash domain
- Go to `about:addons` → Stash Downloader → Permissions
- Enable "Access your data for [your-stash-domain]"

## Privacy

This extension:
- Only communicates with your configured Stash instance
- Does not collect or transmit any data to third parties
- Stores settings locally in browser sync storage
