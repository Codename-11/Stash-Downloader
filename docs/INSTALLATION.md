# Installation Guide

## Prerequisites

- Stash v0.20 or later
- Internet connection for downloading content
- Python 3.7+ with yt-dlp for server-side video downloads

## Recommended: Install from Custom Plugin Source

The easiest way to install and keep the plugin updated:

### 1. Add Custom Plugin Source

1. Open Stash web interface
2. Go to **Settings** → **Plugins** → **Available Plugins**
3. Click **"Add Source"**
4. Enter: `https://codename-11.github.io/Stash-Downloader/index.yml`
5. Click **"Add"**

### 2. Install the Plugin

1. Find "Stash Downloader" in the Available Plugins list
2. Click **"Install"**
3. Wait for installation to complete
4. Click **"Reload Plugins"** if needed

### 3. Configure Settings (Optional)

1. Go to Settings → Plugins → Stash Downloader
2. Set your preferred download path, quality, proxy, etc.
3. Click "Save"

### 4. Access the Plugin

Navigate to `http://localhost:9999/plugin/stash-downloader` or click the **Downloader** button in the Stash navbar.

---

## Alternative: Manual Installation

### Option A: Download Release

1. Download the latest release from [Releases](https://github.com/Codename-11/Stash-Downloader/releases)
2. Extract to your Stash plugins directory:
   - **Linux/macOS**: `~/.stash/plugins/stash-downloader/`
   - **Windows**: `%USERPROFILE%\.stash\plugins\stash-downloader\`
   - **Docker**: `/root/.stash/plugins/stash-downloader/`

### Option B: Build from Source

```bash
# Clone the repository
git clone https://github.com/Codename-11/Stash-Downloader.git
cd Stash-Downloader

# Install dependencies and build
npm install
npm run build

# Copy to Stash plugins directory (Linux/macOS)
cp -r . ~/.stash/plugins/stash-downloader/
```

### Enable the Plugin

1. Open Stash web interface
2. Go to **Settings** → **Plugins**
3. Find "Stash Downloader" and ensure it's enabled
4. Click "Reload Plugins" if not visible

---

## Installing yt-dlp

yt-dlp is required for server-side video downloads and metadata extraction.

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

## Verification

After installation:

1. Navigate to the Downloader page
2. You should see the download queue interface
3. Try adding a test URL to verify it's working
4. Check browser console (F12) for any errors
