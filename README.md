# Stash Downloader Plugin

A React-based web-UI plugin for Stash that enables downloading images and videos from external sources with automatic metadata extraction, tagging, and organization.

## Features

- **URL-based Downloads**: Download videos and images from direct URLs or supported sites
- **Batch Import**: Import multiple URLs at once from clipboard
- **Metadata Extraction**: Automatically extract and map metadata from sources
- **Metadata Editor**: Edit and review all metadata before importing to Stash
- **Smart Selectors**: Autocomplete for performers, tags, and studios with create-new option
- **Stash Integration**: Create scenes, images, and galleries directly in Stash via GraphQL
- **Smart Matching**: Match performers, tags, and studios against existing Stash data
- **Queue Management**: Track multiple downloads with progress indicators
- **Flexible Workflow**: Edit individual items or batch process entire queue
- **Customizable Settings**: Configure download paths, quality, auto-creation rules, and more

## Installation

### For Stash Users

**Prerequisites:**
- Stash v0.20 or later
- Internet connection for downloading content

**Installation Steps:**

1. **Download the Plugin**
   - Download the latest release from [Releases](../../releases)
   - Or clone: `git clone https://github.com/Codename-11/Stash-Downloader.git`

2. **Build the Plugin** (if building from source)
   ```bash
   cd Stash-Downloader
   pnpm install
   pnpm build
   ```

3. **Install in Stash**

   **Option A: Manual Installation**
   - Copy the entire `Stash-Downloader` folder to your Stash plugins directory:
     - **Linux/macOS**: `~/.stash/plugins/stash-downloader/`
     - **Windows**: `%USERPROFILE%\.stash\plugins\stash-downloader\`
     - **Docker**: Map to `/root/.stash/plugins/stash-downloader/`

   **Option B: Git Clone Directly**
   ```bash
   # Linux/macOS
   cd ~/.stash/plugins
   git clone https://github.com/Codename-11/Stash-Downloader.git stash-downloader
   cd stash-downloader
   pnpm install && pnpm build

   # Windows (PowerShell)
   cd $env:USERPROFILE\.stash\plugins
   git clone https://github.com/Codename-11/Stash-Downloader.git stash-downloader
   cd stash-downloader
   pnpm install; pnpm build
   ```

4. **Enable the Plugin**
   - Open Stash web interface
   - Go to **Settings** → **Plugins**
   - Find "Stash Downloader" in the list
   - Ensure it's enabled (toggle should be ON)
   - If not visible, click "Reload Plugins"

5. **Configure Settings** (optional)
   - In Settings → Plugins → Stash Downloader
   - Set your preferred download path
   - Configure concurrent downloads, quality, etc.
   - Click "Save"

6. **Access the Plugin**
   - Navigate to `http://localhost:9999/downloader` (or your Stash URL + `/downloader`)
   - Or look for "Downloader" in Stash navigation (if patched)

**Verification:**
- You should see the download queue page
- Try adding a test URL to verify it's working
- Check browser console for any errors (F12)

## Development

### Testing Without Stash

You can develop and test the plugin **without a running Stash instance**:

```bash
# Install dependencies
pnpm install

# Start test environment (opens browser at http://localhost:3000)
pnpm test
```

This runs a complete mock environment with:
- Mock PluginApi with in-memory GraphQL
- Pre-loaded test data (3 performers, 4 tags, 2 studios)
- Simulated file downloads with progress tracking
- All plugin features fully functional
- Hot reload for rapid development

**Test URLs that work:**
- `https://example.com/video1.mp4`
- `https://example.com/video2.mp4`
- `https://example.com/image1.jpg`

See [`test/README.md`](test/README.md) for detailed testing documentation.

### Project Structure

```
src/
├── components/          # React components
│   ├── common/         # Reusable UI components
│   ├── downloader/     # Download queue components
│   └── settings/       # Settings page
├── services/           # Business logic
│   ├── stash/         # Stash GraphQL service
│   ├── download/      # Download manager
│   └── metadata/      # Metadata scrapers
├── hooks/             # Custom React hooks
├── types/             # TypeScript definitions
├── utils/             # Utilities
├── constants/         # Constants
└── index.tsx          # Plugin entry point

test/
├── mocks/             # Mock implementations
│   ├── mockPluginApi.ts      # Mock Stash PluginApi
│   ├── mockDownloadService.ts # Mock downloads
│   └── mockMetadataScraper.ts # Mock scraper
├── fixtures/          # Test data
│   └── mockData.ts    # Performers, tags, studios
├── utils/             # Test utilities
└── app.tsx            # Standalone test app
```

### Available Scripts

- `pnpm dev` - Build in watch mode for development
- `pnpm build` - Production build
- `pnpm type-check` - Check TypeScript types
- `pnpm lint` - Lint code
- `pnpm format` - Format code with Prettier

### Adding New Scrapers

To add support for a new website:

1. Create a scraper class implementing `IMetadataScraper`:

```typescript
// src/services/metadata/MyScraper.ts
import { IMetadataScraper, IScrapedMetadata } from '@/types';

export class MyScraper implements IMetadataScraper {
  name = 'MySite';
  supportedDomains = ['mysite.com', 'www.mysite.com'];

  canHandle(url: string): boolean {
    return this.supportedDomains.some(d => url.includes(d));
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    // Implement scraping logic
    return {
      url,
      title: 'Scraped Title',
      performers: ['Performer 1'],
      tags: ['Tag 1', 'Tag 2'],
      // ...
    };
  }
}
```

2. Register the scraper in `src/index.tsx`:

```typescript
import { getScraperRegistry } from '@/services/metadata';
import { MyScraper } from '@/services/metadata/MyScraper';

getScraperRegistry().register(new MyScraper());
```

## Configuration

Settings are configurable in Stash at Settings > Plugins > Stash Downloader:

- **Default Download Path**: Where to save downloaded files
- **Concurrent Downloads**: Maximum simultaneous downloads (default: 3)
- **Auto-Create Performers/Tags/Studios**: Automatically create missing entities
- **Download Quality**: Preferred video quality
- **Filename Template**: Template for downloaded filenames
- **Enable Notifications**: Browser notifications for downloads

## Usage

### Quick Start

1. **Access the plugin**: Navigate to `http://your-stash-url/downloader`
2. **Add a URL**: Paste a direct URL to a video or image file
3. **Edit metadata**: Click "Edit" to review and customize metadata
4. **Import**: Click "Save & Import to Stash" to download and add to your library

That's it! The content is now in your Stash library with all metadata.

---

### Detailed Workflows

#### Single URL Import

**Step-by-step:**

1. **Navigate** to the Downloader page (`/downloader`)

2. **Enter URL** in the input field
   - Direct file URLs work best: `https://example.com/video.mp4`
   - Some websites supported with automatic metadata extraction

3. **Auto-scraping** happens automatically
   - Plugin attempts to extract title, performers, tags, studio
   - Metadata appears in the queue item

4. **Review metadata** by clicking "Edit" button
   - Verify auto-detected information
   - Make corrections if needed

5. **Import** by clicking "Edit & Import (X items)"
   - Downloads the file
   - Creates scene/image in Stash
   - Associates all metadata

**Supported URL Types:**
- Direct file links: `.mp4`, `.mkv`, `.avi`, `.mov`, `.jpg`, `.png`, `.gif`, `.webp`
- Websites with scrapers (extensible - add your own)

---

#### Batch Import from Clipboard

**Perfect for importing multiple files at once:**

1. **Prepare URLs**
   ```
   https://example.com/video1.mp4
   https://example.com/video2.mp4
   https://example.com/image1.jpg
   https://example.com/image2.png
   ```

2. **Copy to clipboard** (Ctrl+C / Cmd+C)

3. **Click "Import from Clipboard"** button in the plugin

4. **Review detected URLs**
   - Plugin filters invalid URLs automatically
   - Shows count of valid URLs found

5. **Click "Import X URLs"** to add all to queue

6. **Batch edit** by clicking "Edit & Import"
   - Review each item one by one
   - Or skip items you don't want

**Tips:**
- One URL per line
- Blank lines are ignored
- Invalid URLs automatically filtered
- Works great with bookmark exports or URL lists

---

#### Metadata Editing Workflow

**After adding items to queue:**

1. **Start editing**: Click "Edit & Import (X items)" button

2. **Edit each item** with full control:

   **Title & Description:**
   - Auto-filled from URL or scraper
   - Edit to your preference
   - Required field: Title

   **Date:**
   - Pick from calendar
   - Format: YYYY-MM-DD
   - Optional but recommended

   **Rating:**
   - Click stars to rate (1-5 stars = 20-100)
   - Click "Clear" to remove rating
   - Shows as X/100 in Stash

   **Performers:**
   - Start typing to search existing performers
   - Dropdown shows matches from your Stash library
   - Click to select (can select multiple)
   - Type new name + "Create New" to add performer
   - Remove by clicking × on badge

   **Tags:**
   - Same autocomplete as performers
   - Multi-select support
   - Create new tags on the fly
   - All tags appear in your Stash tag list

   **Studio:**
   - Single selection (one studio per item)
   - Search existing studios
   - Create new studio if needed
   - Optional field

3. **Save or Skip**:
   - **Save & Import to Stash**: Downloads file and creates entry
   - **Skip This Item**: Move to next without importing
   - **Previous**: Go back to edit previous item
   - **Back to Queue**: Return to queue view

4. **Track progress**:
   - Progress bar shows X of Y items
   - Download progress shows during file download
   - Status updates in queue

**Pro Tips:**
- Create performers/tags/studios as you go
- Use consistent naming for easier searching
- Rate content during import for better organization
- Skip duplicates or items needing more research

---

#### Queue Management

**Understanding the queue:**

**Queue Statistics:**
- **Total**: All items in queue
- **Downloading**: Currently downloading
- **Complete**: Successfully imported
- **Failed**: Errors occurred

**Item Status Badges:**
- **Pending** (gray): Ready to edit/import
- **Downloading** (blue): File downloading now
- **Processing** (cyan): Creating in Stash
- **Complete** (green): Successfully imported
- **Failed** (red): Error occurred
- **Cancelled** (yellow): Skipped by user

**Actions:**
- **Edit**: Review/edit metadata (pending items only)
- **Remove**: Delete from queue
- **Clear Completed**: Remove all successful imports
- **Clear All**: Empty entire queue

**Progress Tracking:**
- Real-time download progress bars
- Speed shown in MB/s
- Time remaining estimate
- File size information

---

### Tips & Best Practices

**For Best Results:**

1. **Use direct file URLs** when possible
   - More reliable than webpage URLs
   - Faster metadata extraction
   - Better file quality control

2. **Review metadata before importing**
   - Auto-scraping isn't perfect
   - Verify performer names
   - Check tags for accuracy

3. **Organize as you import**
   - Add tags during import
   - Set ratings immediately
   - Fill in dates for better sorting

4. **Use batch import for efficiency**
   - Collect URLs throughout the day
   - Import in one session
   - Edit all at once

5. **Create performers/tags strategically**
   - Check if they exist first (autocomplete)
   - Use consistent naming
   - Avoid duplicates

6. **Monitor queue statistics**
   - Clear completed items regularly
   - Retry failed downloads
   - Check errors for patterns

## Troubleshooting

### Common Issues

**Plugin doesn't appear in Stash:**
1. Check plugins directory path is correct
2. Ensure `stash-downloader.yml` exists in plugin folder
3. Click "Reload Plugins" in Settings → Plugins
4. Check Stash logs for errors
5. Verify Stash version is v0.20+

**Can't access `/downloader` page:**
1. Ensure plugin is enabled in Settings → Plugins
2. Check browser console (F12) for JavaScript errors
3. Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. Verify `dist/stash-downloader.js` exists

**Metadata not auto-filling:**
1. Plugin uses generic scraper by default
2. Add site-specific scrapers for better results
3. Check browser console for scraping errors
4. Verify URL is accessible (not behind paywall)

**Downloads fail:**
1. Check URL is direct link to file
2. Verify internet connection
3. Some sites block automated downloads
4. Check CORS restrictions in browser console
5. Try different URL or download manually first

**Performers/Tags not found:**
1. Autocomplete searches existing Stash data
2. Check spelling and try different search
3. Create new if doesn't exist
4. Verify Stash database has data

**Import to Stash fails:**
1. Check Stash permissions for write access
2. Verify download path is valid
3. Check available disk space
4. Look for GraphQL errors in browser console
5. Ensure Stash isn't in read-only mode

**Performance issues:**
1. Reduce concurrent downloads in settings
2. Close other browser tabs
3. Check system resources (CPU/RAM)
4. Clear browser cache
5. Restart Stash if needed

### Getting Help

**Before asking for help:**
1. Check browser console (F12) for errors
2. Check Stash logs for plugin errors
3. Verify you're on latest version
4. Try with a simple test URL first

**Where to get help:**
- GitHub Issues: [Report bugs](../../issues)
- Stash Discord: Community support
- Documentation: Check this README and `test/README.md`

**When reporting issues, include:**
- Stash version
- Plugin version
- Browser and version
- Console errors (screenshot)
- Steps to reproduce
- Example URL (if applicable)

---

## Architecture

### Plugin Integration

The plugin uses Stash's `PluginApi` for integration:

- **Routes**: Registered at `/downloader` using `PluginApi.register.route()`
- **Dependencies**: Uses React, ReactDOM, Bootstrap provided by Stash (not bundled)
- **GraphQL**: Communicates with Stash via `PluginApi.GQL`

### Data Flow

```
User Input → Metadata Scraper → Download Service → Stash GraphQL → Scene Created
```

### State Management

- **Local State**: React hooks (`useState`, `useReducer`)
- **Context**: Download queue, settings
- **Apollo Cache**: Stash data (performers, tags, studios)
- **localStorage**: User preferences

## Troubleshooting

### Plugin doesn't load

- Check browser console for errors
- Ensure `dist/stash-downloader.js` exists
- Verify plugin YAML configuration is correct
- Restart Stash

### GraphQL errors

- Check Stash GraphQL playground at `/playground`
- Verify your Stash version supports the required mutations
- Check authentication/session cookies

### Downloads fail

- Verify the URL is accessible
- Check CORS settings
- Ensure sufficient disk space
- Check browser console for network errors

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes following the conventions in `.claude/conventions.md`
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Links

- [Stash Documentation](https://docs.stashapp.cc/)
- [Stash Plugin API](https://docs.stashapp.cc/in-app-manual/plugins/uipluginapi/)
- [Stash GitHub](https://github.com/stashapp/stash)

## Support

- GitHub Issues: https://github.com/Codename-11/Stash-Downloader/issues
- Stash Discord: https://discord.gg/stash
