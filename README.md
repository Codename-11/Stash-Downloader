<div align="center">
  <h1>Stash Plugins</h1>
  <p>A collection of plugins for <a href="https://github.com/stashapp/stash">Stash</a> - the self-hosted media organizer</p>

  [![License](https://img.shields.io/github/license/Codename-11/Stash-Downloader)](LICENSE)
  [![GitHub Release](https://img.shields.io/github/v/release/Codename-11/Stash-Downloader)](https://github.com/Codename-11/Stash-Downloader/releases)
  [![Build](https://img.shields.io/github/actions/workflow/status/Codename-11/Stash-Downloader/publish.yml?branch=main)](https://github.com/Codename-11/Stash-Downloader/actions)
  [![Stash](https://img.shields.io/badge/Stash-v0.20%2B-blue)](https://github.com/stashapp/stash)

  [![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Development-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/codename_11)
</div>

---

## Plugins

| Plugin | Description | Status |
|--------|-------------|--------|
| [**Stash Downloader**](#stash-downloader) | Download videos/images with automatic metadata extraction | Stable |
| [**Stash Browser**](#stash-browser) | Browse and search booru sites, add to download queue | Beta |

### Quick Install

1. In Stash: **Settings** → **Plugins** → **Available Plugins**
2. Click **"Add Source"**
3. Enter: `https://codename-11.github.io/Stash-Downloader/index.yml`
4. Find your desired plugin and click **"Install"**

---

## Stash Downloader

<div align="center">
  <img src="plugins/stash-downloader/src/assets/logo.svg" alt="Stash Downloader Logo" width="80" height="80" />
</div>

Download videos and images directly to your Stash library with automatic metadata extraction.

[![Firefox Add-ons](https://img.shields.io/amo/v/stash-downloader-extension?logo=firefox&label=Firefox%20Add-on)](https://addons.mozilla.org/en-US/firefox/addon/stash-downloader-extension/)
[![Stash Forums Post](https://img.shields.io/badge/Stash%20Forums-Post-blue)](https://discourse.stashapp.cc/t/stash-downloader-download-videos-images-with-metadata-extraction)

### Features

- **URL-based Downloads** - Paste URLs to download videos and images
- **Automatic Metadata** - Extracts titles, thumbnails, performers, tags, studio via yt-dlp
- **Editable Metadata** - Review and edit performers, tags, studio before import
- **Cover Images** - Scraped thumbnails automatically set as scene covers
- **Browser Extension** - Right-click any link to send directly to your queue
- **Batch Import** - Import multiple URLs from clipboard
- **Post-Import Actions** - Identify via StashDB, Scrape URL, or None
- **Auto-Create** - Missing performers/tags/studios automatically created
- **Persistent Queue** - Queue survives page refresh and navigation

![Stash Downloader Main Interface](screenshots/stash_downloader_main_layout.png)

### Requirements

- Stash v0.20+
- Python 3.7+ with yt-dlp (`pip install yt-dlp`)

### Quick Start

1. Navigate to `http://your-stash-url/plugin/stash-downloader`
2. Paste a URL and click "Add to Queue"
3. Click "Edit" to review metadata
4. Click "Save & Import to Stash"

### Configuration

Configure in Stash at **Settings** → **Plugins** → **Stash Downloader**:

| Setting | Description |
|---------|-------------|
| **Server Download Path** | Where to save files (default: `/data/StashDownloader`) |
| **HTTP Proxy** | Proxy for geo-restricted content (`http://`, `socks5://`) |
| **Concurrent Downloads** | Max simultaneous downloads (default: 3) |
| **Download Quality** | Preferred video quality |

---

## Stash Browser

<div align="center">
  <p><em>Browse booru sites and add content directly to your Stash Downloader queue</em></p>
</div>

### Features

- **Multi-Source Search** - Browse Rule34, Gelbooru, and Danbooru
- **Tag Autocomplete** - Real autocomplete matching the actual sites
- **Category Labels** - Color-coded tag categories (Artist, Character, Copyright, etc.)
- **Sort & Filter** - Sort by Popular/Newest/Updated, filter by rating (S/Q/E)
- **Thumbnail Grid** - Responsive grid with hover effects
- **Quick Add** - Send posts directly to Stash Downloader queue
- **Post Details** - View full images/videos, tags, and metadata
- **Safe Mode** - Optional safe-only content filtering

### Requirements

- Stash v0.20+
- **Stash Downloader plugin** (for queue integration)
- API credentials for Rule34/Gelbooru (free, get from site settings)

### Quick Start

1. Navigate to `http://your-stash-url/plugin/stash-browser`
2. Select a source (Rule34, Gelbooru, or Danbooru)
3. Type tags and press Enter to search
4. Click "+" to add posts to your Stash Downloader queue

### Configuration

Configure in Stash at **Settings** → **Plugins** → **Stash Browser**:

| Setting | Description |
|---------|-------------|
| **Default Source** | Which booru to search by default |
| **Results Per Page** | Number of results to show (20-100) |
| **Safe Mode** | Only show safe-rated content |
| **Rule34 API Key/User ID** | Required for Rule34 search and autocomplete |
| **Gelbooru API Key/User ID** | Required for Gelbooru search and autocomplete |

> **Getting API Credentials**: Sign up on the respective site and find your API key in your account/options page.

---

## Browser Extension

Send URLs directly to your Stash Downloader queue from any webpage.

[![Firefox Add-ons](https://img.shields.io/amo/v/stash-downloader-extension?logo=firefox&label=Firefox%20Add-on)](https://addons.mozilla.org/en-US/firefox/addon/stash-downloader-extension/)

![Browser Extension](screenshots/stash_downloader_extension_layout.png)

### Features

- **Right-click menu** - Send links, images, videos, or highlighted text
- **Real-time updates** - URLs appear instantly in open Stash tabs
- **Content type selection** - Choose Video, Image, or Gallery
- **Popup interface** - Quick access to send current page URL

### Installation

[**Install from Firefox Add-ons**](https://addons.mozilla.org/en-US/firefox/addon/stash-downloader-extension/) (Recommended)

### Setup

1. Click the extension icon → gear icon (or right-click → Options)
2. Enter your Stash URL (e.g., `http://localhost:9999`)
3. Add API key if authentication is enabled
4. Click "Save Settings"

### Usage

- **Right-click a link** → "Send to Stash Downloader" → "As Video/Image/Gallery"
- **Highlight a URL** → Right-click → "Send to Stash Downloader"
- **Click extension icon** → Send current page URL

---

## Development

This is a monorepo containing multiple plugins:

```
stash-downloader/
├── plugins/
│   ├── stash-downloader/    # Stash Downloader plugin
│   └── stash-browser/       # Stash Browser plugin
├── browser-extension/       # Firefox browser extension
└── shared/                  # Shared utilities
```

### Commands

```bash
# Install dependencies
npm install

# Build all plugins
npm run build

# Build specific plugin
npm run build:downloader
npm run build:browser

# Development mode
cd plugins/stash-downloader && npm run dev
cd plugins/stash-browser && npm run dev

# Run tests
npm test
```

See [Development Guide](docs/DEVELOPMENT.md) for architecture details.

---

## Troubleshooting

**yt-dlp not working?**
```bash
pip install -U yt-dlp  # Update to latest
```

**Docker users:**
```bash
docker exec -it stash pip install -U yt-dlp --break-system-packages
```

**Autocomplete not showing results?**
- Rule34/Gelbooru require API credentials - configure in plugin settings
- Danbooru works without authentication

See [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for more solutions.

---

## Feedback & Support

- **Stash Forums**: [Join the discussion](https://discourse.stashapp.cc/t/stash-downloader-download-videos-images-with-metadata-extraction)
- **GitHub Issues**: [Report bugs or request features](https://github.com/Codename-11/Stash-Downloader/issues)

---

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [Usage Guide](docs/USAGE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Development](docs/DEVELOPMENT.md)

---

## License

MIT License - see [LICENSE](LICENSE) file

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/Codename-11">Codename-11</a> and 🤖 Claude Code
</div>
