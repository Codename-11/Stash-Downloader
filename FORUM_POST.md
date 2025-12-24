||||
|-|-|-|
:placard: | **Summary** | Download videos and images directly to your Stash library from external URLs with automatic metadata extraction powered by yt-dlp. Includes a browser extension for sending URLs directly to your download queue.
:link: | **Repository** | [Stash-Downloader](https://github.com/Codename-11/Stash-Downloader)
:information_source: | **Source URL** | `https://codename-11.github.io/Stash-Downloader/index.yml`
:open_book: | **Install** | [How to install a plugin?](https://discourse.stashapp.cc/t/-/1015)

## Features

- **URL-based Downloads** - Paste URLs to download videos and images
- **Automatic Metadata** - Extracts titles, performers, tags via yt-dlp
- **Browser Extension** - Right-click any link to send directly to your queue
- **Batch Import** - Import multiple URLs from clipboard
- **Smart Matching** - Autocomplete for performers, tags, studios
- **Queue Management** - Track downloads with progress indicators
- **Persistent Queue** - Queue survives page refresh and navigation
- **Booru Support** - Scrape images from Rule34, Gelbooru, Danbooru
- **Proxy Support** - HTTP/SOCKS proxy for geo-restricted content
- **Quality Selection** - Choose preferred video quality

## Installation

**Requirements:**
- Stash v0.20+
- Python 3.7+ with yt-dlp (`pip install yt-dlp`)

**Quick Install:**
1. In Stash: **Settings** → **Plugins** → **Available Plugins**
2. Click **"Add Source"**
3. Enter: `https://codename-11.github.io/Stash-Downloader/index.yml`
4. Find "Stash Downloader" and click **"Install"**

**Docker users** - Update yt-dlp:
```bash
docker exec -it stash pip install -U yt-dlp --break-system-packages
```

## Screenshots

**Main Interface**
![Stash Downloader Main Interface](https://raw.githubusercontent.com/Codename-11/Stash-Downloader/main/screenshots/stash_downloader_main_layout.png)

**Browser Extension**
![Browser Extension](https://raw.githubusercontent.com/Codename-11/Stash-Downloader/main/screenshots/stash_downloader_extension_layout.png)
