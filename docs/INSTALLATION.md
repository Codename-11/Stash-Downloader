# Installation Guide

## Prerequisites

- Stash v0.20 or later
- Internet connection for downloading content
- Python 3.7+ with yt-dlp for server-side video downloads (Stash Downloader)

---

## Recommended: Install from Custom Plugin Source

The easiest way to install and keep plugins updated:

### 1. Add Custom Plugin Source

1. Open Stash web interface
2. Go to **Settings** → **Plugins** → **Available Plugins**
3. Click **"Add Source"**
4. Enter: `https://codename-11.github.io/Stash-Downloader/index.yml`
5. Click **"Add"**

### 2. Install Plugins

From the Available Plugins list, you can install:

| Plugin | Description |
|--------|-------------|
| **Stash Downloader** | Download videos/images with metadata extraction |
| **Stash Browser** | Browse booru sites and add to download queue |

Click **"Install"** on the plugin(s) you want, then **"Reload Plugins"** if needed.

### 3. Access the Plugins

- **Stash Downloader**: `/plugin/stash-downloader` or click **Downloader** in navbar
- **Stash Browser**: `/plugin/stash-browser` or click **Browser** in navbar

---

## Plugin-Specific Setup

### Stash Downloader

#### Requirements
- Python 3.7+ with yt-dlp (`pip install yt-dlp`)
- **Optional for Reddit features:**
  - PRAW (`pip install praw`) - for importing saved/upvoted posts
  - piexif + Pillow (`pip install piexif Pillow`) - for image metadata embedding
  - ffmpeg - for video metadata embedding

#### Configuration
Go to **Settings** → **Plugins** → **Stash Downloader**:

| Setting | Description | Default |
|---------|-------------|---------|
| Server Download Path | Where to save downloaded files | `/data/StashDownloader` |
| HTTP Proxy | Proxy URL for geo-restricted content | (none) |
| Concurrent Downloads | Max simultaneous downloads | 3 |
| Download Quality | Preferred video quality | Best |
| **Reddit Client ID** | Reddit API client ID (from reddit.com/prefs/apps) | (optional) |
| **Reddit Client Secret** | Reddit API client secret | (optional) |
| **Reddit Username** | Your Reddit username | (optional) |
| **Reddit Password** | Your Reddit password | (optional) |
| **Embed Reddit Metadata** | Embed metadata into downloaded files | Off |

### Stash Browser

#### Requirements
- Stash Downloader plugin (for queue integration)
- API credentials for Rule34/Gelbooru (free)

#### Getting API Credentials

**Rule34:**
1. Create account at [rule34.xxx](https://rule34.xxx/)
2. Go to My Account → Options
3. Copy your API Key and User ID

**Gelbooru:**
1. Create account at [gelbooru.com](https://gelbooru.com/)
2. Go to My Account → Options → API Access
3. Copy your API Key and User ID

**Danbooru:**
- Works without authentication (rate limited)

#### Configuration
Go to **Settings** → **Plugins** → **Stash Browser**:

| Setting | Description | Default |
|---------|-------------|---------|
| Default Source | Which booru to search by default | Rule34 |
| Results Per Page | Number of results to show | 40 |
| Safe Mode | Only show safe-rated content | Off |
| Rule34 API Key | Your Rule34 API key | (required) |
| Rule34 User ID | Your Rule34 user ID | (required) |
| Gelbooru API Key | Your Gelbooru API key | (optional) |
| Gelbooru User ID | Your Gelbooru user ID | (optional) |

---

## Alternative: Manual Installation

### Option A: Download Release

1. Download the latest release from [Releases](https://github.com/Codename-11/Stash-Downloader/releases)
2. Extract to your Stash plugins directory:
   - **Linux/macOS**: `~/.stash/plugins/`
   - **Windows**: `%USERPROFILE%\.stash\plugins\`
   - **Docker**: `/root/.stash/plugins/`

Each plugin goes in its own folder:
```
~/.stash/plugins/
├── stash-downloader/
│   ├── stash-downloader.yml
│   ├── dist/
│   └── scripts/
└── stash-browser/
    ├── stash-browser.yml
    ├── dist/
    └── scripts/
```

### Option B: Build from Source

```bash
# Clone the repository
git clone https://github.com/Codename-11/Stash-Downloader.git
cd Stash-Downloader

# Install dependencies and build all plugins
npm install
npm run build

# Or build specific plugin
npm run build:downloader
npm run build:browser
```

### Enable the Plugins

1. Open Stash web interface
2. Go to **Settings** → **Plugins**
3. Find plugins and ensure they're enabled
4. Click "Reload Plugins" if not visible

---

## Installing yt-dlp

yt-dlp is required for Stash Downloader's server-side video downloads and metadata extraction.

### Standard Installation

```bash
pip install yt-dlp

# Verify installation
yt-dlp --version
```

### Docker Installation (Stash Container)

The official Stash Docker image is Alpine-based:

```bash
# Install/update yt-dlp (replace 'stash' with your container name)
docker exec -it stash pip install -U yt-dlp --break-system-packages

# Verify installation
docker exec -it stash yt-dlp --version
```

**Note:** This install is lost when the container is recreated. For persistence, use a custom Dockerfile:

```dockerfile
FROM stashapp/stash:latest
RUN pip install -U yt-dlp --break-system-packages
```

### Keeping yt-dlp Updated

Site extractors break frequently as websites change. Update regularly:

```bash
# Standard
pip install -U yt-dlp
# or
yt-dlp -U

# Docker
docker exec -it stash pip install -U yt-dlp --break-system-packages
```

---

## Installing Reddit Integration Dependencies (Optional)

Required for importing saved/upvoted posts and embedding metadata into files.

### PRAW (Reddit API)

Required for fetching your saved/upvoted Reddit posts.

**Standard Installation:**
```bash
pip install praw

# Verify installation
python -c "import praw; print(praw.__version__)"
```

**Docker Installation:**
```bash
# Install PRAW
docker exec -it stash pip install praw --break-system-packages

# Verify installation
docker exec -it stash python -c "import praw; print(praw.__version__)"
```

### piexif & Pillow (Image Metadata)

Required for embedding Reddit metadata into images (JPEG/PNG).

**Standard Installation:**
```bash
pip install piexif Pillow

# Verify installation
python -c "import piexif; import PIL; print('OK')"
```

**Docker Installation:**
```bash
# Install piexif and Pillow
docker exec -it stash pip install piexif Pillow --break-system-packages

# Verify installation
docker exec -it stash python -c "import piexif; import PIL; print('OK')"
```

### FFmpeg (Video Metadata)

Required for embedding Reddit metadata into videos (MP4/MOV).

**Standard Installation:**

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install -y ffmpeg
ffmpeg -version
```

**macOS:**
```bash
brew install ffmpeg
ffmpeg -version
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.

**Docker Installation (Alpine-based Stash):**
```bash
# Install ffmpeg
docker exec -it stash apk add --no-cache ffmpeg

# Verify installation
docker exec -it stash ffmpeg -version
```

### Persistent Docker Installation

For all dependencies to persist across container restarts, create a custom Dockerfile:

```dockerfile
FROM stashapp/stash:latest

# Install Python packages
RUN pip install -U yt-dlp praw piexif Pillow --break-system-packages

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Verify installations (optional)
RUN yt-dlp --version && \
    python -c "import praw; import piexif; import PIL" && \
    ffmpeg -version
```

Build and run:
```bash
docker build -t stash-custom .
docker run -d --name stash -p 9999:9999 -v /path/to/config:/root/.stash stash-custom
```

### What Each Dependency Enables

| Dependency | Feature | Required For |
|------------|---------|--------------|
| **yt-dlp** | Video downloads & metadata extraction | All downloads |
| **PRAW** | Reddit API access | Importing saved/upvoted posts |
| **piexif** | EXIF metadata embedding | Embedding metadata in images |
| **Pillow** | Image processing | Embedding metadata in images |
| **ffmpeg** | Video metadata embedding | Embedding metadata in videos |

**Without these dependencies:**
- Plugin still works for direct URL downloads
- Reddit scraper works for public Reddit post URLs (no API needed)
- Metadata embedding will be skipped (downloads work normally)

---

## Verification

After installation:

### Stash Downloader
1. Navigate to `/plugin/stash-downloader`
2. You should see the download queue interface
3. Try adding a test URL to verify it's working
4. Check browser console (F12) for any errors

### Stash Browser
1. Navigate to `/plugin/stash-browser`
2. You should see the search interface with source selector
3. Try searching for a tag to verify API connection
4. If autocomplete doesn't work, check API credentials in settings

---

## Development Builds

Want to test the latest features? Install the dev builds:

Both stable and dev plugins can be installed simultaneously (different plugin IDs):

| Plugin | Stable | Dev |
|--------|--------|-----|
| Downloader | `stash-downloader` | `stash-downloader-dev` |
| Browser | `stash-browser` | `stash-browser-dev` |

Dev builds are automatically deployed when code is pushed to the `dev` branch.
