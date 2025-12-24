# Usage Guide

## Quick Start

1. **Access the plugin**: Navigate to your Stash URL + `/plugin/stash-downloader` or click the Downloader navbar button
2. **Add a URL**: Paste a video/image URL and click "Add to Queue"
3. **Edit metadata**: Click "Edit" to review and customize metadata
4. **Import**: Click "Save & Import to Stash" to download and add to your library

---

## Single URL Import

### Step-by-step:

1. **Navigate** to the Downloader page

2. **Enter URL** in the input field
   - Direct file URLs work best: `https://example.com/video.mp4`
   - Many websites supported with automatic metadata extraction via yt-dlp

3. **Select content type** (optional)
   - Auto-detect (default)
   - Video
   - Image
   - Gallery

4. **Auto-scraping** happens automatically
   - Plugin extracts title, performers, tags, studio
   - Uses yt-dlp for video sites, Booru scraper for image sites
   - Metadata appears in the queue item

5. **Review metadata** by clicking "Edit" button

6. **Import** by clicking "Save & Import to Stash"
   - Downloads the file to your server
   - Creates scene/image/gallery in Stash
   - Associates all metadata

### Supported URL Types:
- Video sites (via yt-dlp): Most major video platforms
- Direct file links: `.mp4`, `.mkv`, `.avi`, `.mov`, `.jpg`, `.png`, `.gif`, `.webp`
- Booru sites: Rule34, Gelbooru, Danbooru (images/galleries)

---

## Batch Import from Clipboard

Perfect for importing multiple files at once:

1. **Prepare URLs** (one per line):
   ```
   https://example.com/video1.mp4
   https://example.com/video2.mp4
   https://example.com/image1.jpg
   ```

2. **Copy to clipboard** (Ctrl+C / Cmd+C)

3. **Click "Import from Clipboard"** button

4. **Review detected URLs**
   - Plugin filters invalid URLs automatically
   - Shows count of valid URLs found

5. **Click "Import X URLs"** to add all to queue

6. **Batch edit** by clicking "Edit & Import"
   - Review each item one by one
   - Skip items you don't want

**Tips:**
- One URL per line
- Blank lines are ignored
- Invalid URLs automatically filtered

---

## Metadata Editing

After adding items to queue, click "Edit & Import (X items)":

### Available Fields:

| Field | Description |
|-------|-------------|
| **Title** | Required. Auto-filled from scraper |
| **Description** | Optional description text |
| **Date** | Release/upload date (YYYY-MM-DD) |
| **Rating** | 1-5 stars (converted to 20-100 in Stash) |
| **Performers** | Multi-select with autocomplete. Create new on the fly |
| **Tags** | Multi-select with autocomplete. Create new on the fly |
| **Studio** | Single selection with autocomplete |
| **URL** | Source URL (auto-filled) |

### Entity Colors:
- **Green badge**: New entity (will be created)
- **Blue badge**: Existing entity in Stash

### Actions:
- **Save & Import to Stash**: Download and create entry
- **Skip This Item**: Move to next without importing
- **Previous**: Go back to edit previous item
- **Back to Queue**: Return to queue view

---

## Queue Management

### Queue Statistics:
- **Total**: All items in queue
- **Downloading**: Currently downloading
- **Complete**: Successfully imported
- **Failed**: Errors occurred

### Item Status:
| Badge | Status |
|-------|--------|
| Pending (gray) | Ready to edit/import |
| Downloading (blue) | File downloading |
| Processing (cyan) | Creating in Stash |
| Complete (green) | Successfully imported |
| Failed (red) | Error occurred |

### Item Actions:
- **Edit**: Review/edit metadata
- **Logs**: View operation logs for this item
- **Re-scrape**: Try a different scraper
- **Retry**: Retry failed items
- **Remove**: Delete from queue

### Bulk Actions:
- **Clear Completed**: Remove successful imports
- **Clear All**: Empty entire queue

### Queue Persistence:
The queue persists in localStorage - it survives page navigation and refresh.

---

## Activity Log

The Activity Log shows real-time operation logs:

- Filter by level (All, Error, Warning, Info, Success)
- Filter by category (All, Scrape, Download, Import, etc.)
- Expand entries for full details
- Clear logs when needed
- Logs persist between page refreshes

### Log Levels:
- **Debug**: Verbose info (console only)
- **Info**: Standard operations
- **Success**: Completed operations
- **Warning**: Potential issues
- **Error**: Failures

---

## Tips & Best Practices

1. **Use direct file URLs** when possible for better reliability

2. **Review metadata before importing** - auto-scraping isn't perfect

3. **Organize as you import** - add tags and ratings during import

4. **Use batch import** for efficiency - collect URLs, import in one session

5. **Check existing entities** - use autocomplete to avoid duplicates

6. **Monitor the Activity Log** for errors and warnings

7. **Keep yt-dlp updated** - site extractors break frequently
