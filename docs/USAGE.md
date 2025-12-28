# Usage Guide

This guide covers both Stash Downloader and Stash Browser plugins.

---

## Stash Downloader

### Quick Start

1. **Access the plugin**: Navigate to `/plugin/stash-downloader` or click **Downloader** in navbar
2. **Add a URL**: Paste a video/image URL and click "Add to Queue"
3. **Edit metadata**: Click "Edit" to review and customize metadata
4. **Import**: Click "Save & Import to Stash" to download and add to your library

### Single URL Import

1. **Enter URL** in the input field
   - Direct file URLs work best: `https://example.com/video.mp4`
   - Many websites supported via yt-dlp metadata extraction

2. **Select content type** (optional)
   - Auto-detect (default)
   - Video / Image / Gallery

3. **Auto-scraping** happens automatically
   - Extracts title, performers, tags, studio
   - Uses yt-dlp for video sites, Booru scraper for image sites

4. **Review metadata** by clicking "Edit"

5. **Import** by clicking "Save & Import to Stash"

### Batch Import from Clipboard

1. **Prepare URLs** (one per line):
   ```
   https://example.com/video1.mp4
   https://example.com/video2.mp4
   ```

2. **Copy to clipboard** (Ctrl+C)

3. **Click "Import from Clipboard"**

4. **Review and import** detected URLs

### Metadata Editing

| Field | Description |
|-------|-------------|
| **Title** | Required. Auto-filled from scraper |
| **Performers** | Multi-select with autocomplete |
| **Tags** | Multi-select with autocomplete |
| **Studio** | Single selection with autocomplete |
| **Date** | Release/upload date (YYYY-MM-DD) |

**Entity Colors:**
- **Green badge**: New entity (will be created)
- **Blue badge**: Existing entity in Stash

### Queue Management

| Status | Description |
|--------|-------------|
| Pending (gray) | Ready to edit/import |
| Downloading (blue) | File downloading |
| Processing (cyan) | Creating in Stash |
| Complete (green) | Successfully imported |
| Failed (red) | Error occurred |

**Item Actions:**
- **Edit**: Review/edit metadata
- **Logs**: View operation logs
- **Re-scrape**: Try a different scraper
- **Retry**: Retry failed items
- **Remove**: Delete from queue

**Queue Persistence:** Queue survives page navigation and refresh.

---

## Stash Browser

### Quick Start

1. **Access the plugin**: Navigate to `/plugin/stash-browser` or click **Browser** in navbar
2. **Select source**: Choose Rule34, Gelbooru, or Danbooru
3. **Search tags**: Type tags and press Enter to add them
4. **Browse results**: View thumbnails in the grid
5. **Add to queue**: Click "+" to send to Stash Downloader

### Searching

#### Tag Input

- **Type to search**: Autocomplete suggestions appear
- **Press Enter or Space**: Add tag to search
- **Press Backspace**: Remove last tag
- **Use `-tag`**: Exclude specific tags

#### Autocomplete

Suggestions show:
- **Category badge**: Gen (General), Art (Artist), Char (Character), Cpy (Copyright), Meta
- **Post count**: Number of posts with this tag
- **Color coding**: Category-specific colors

#### Sort Options

| Sort | Description |
|------|-------------|
| 🔥 Popular | Sort by score (most liked) |
| 🆕 Newest | Sort by post ID (most recent) |
| 🔄 Updated | Sort by update date |

#### Rating Filter

| Filter | Description |
|--------|-------------|
| **All** | Show all content |
| **S** (Safe) | Safe-rated only |
| **Q** (Questionable) | Questionable-rated only |
| **E** (Explicit) | Explicit-rated only |

### Browsing Results

#### Grid View

- **Thumbnail**: Post preview image
- **Checkbox**: Select for batch operations
- **Rating badge**: S/Q/E indicator
- **Video badge**: Shows for video posts
- **ID**: Post number

#### Interactions

- **Click**: Select/deselect post
- **Double-click**: Open detail modal
- **"+" button**: Add to Stash Downloader queue
- **View button**: Open detail modal

#### Selection Actions

When posts are selected:
- **Add to Queue**: Send all selected to Stash Downloader
- **Clear**: Deselect all

### Post Details Modal

- **Full image/video**: View full-resolution content
- **Tags**: Click to search for that tag
- **Metadata**: ID, score, rating, dimensions
- **Add to Queue**: Send to Stash Downloader

### Settings

| Setting | Description |
|---------|-------------|
| **Default Source** | Which booru to search by default |
| **Results Per Page** | 20-100 results per page |
| **Safe Mode** | Force safe-only content (overrides rating filter) |
| **Show Thumbnails** | Toggle thumbnail visibility |

### Workflow: Browser → Downloader

1. **Search** in Stash Browser for content
2. **Select** posts you want (click or checkbox)
3. **Add to Queue** - posts are sent to Stash Downloader
4. **Switch** to Stash Downloader
5. **Edit & Import** - review metadata and import

The queue is shared - items added from Browser appear in Downloader automatically.

---

## Browser Extension

Send URLs directly from any webpage to your Stash Downloader queue.

### Usage

- **Right-click a link** → "Send to Stash Downloader" → "As Video/Image/Gallery"
- **Highlight a URL** → Right-click → "Send to Stash Downloader"
- **Click extension icon** → Send current page URL

### Features

- Real-time updates (no page refresh needed)
- Content type selection
- Connection status indicator

---

## Tips & Best Practices

1. **Use Stash Browser** for discovering content on booru sites

2. **Configure API credentials** for Rule34/Gelbooru autocomplete

3. **Use batch operations** - select multiple posts, add all at once

4. **Review metadata before importing** - auto-scraping isn't perfect

5. **Keep yt-dlp updated** - site extractors break frequently

6. **Monitor the Activity Log** for errors and warnings

7. **Use the rating filter** to find appropriate content

8. **Try different sources** - each booru has different content
