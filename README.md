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

### Prerequisites

- Stash instance running (v0.20+)
- Node.js and pnpm (for development)

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Codename-11/Stash-Downloader.git
   cd Stash-Downloader
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Build the plugin**:
   ```bash
   pnpm build
   ```

4. **Copy to Stash plugins directory**:
   ```bash
   # Linux/macOS
   cp -r . ~/.stash/plugins/stash-downloader/

   # Windows
   # Copy the entire directory to %USERPROFILE%\.stash\plugins\stash-downloader\
   ```

5. **Restart Stash** or reload plugins from Settings > Plugins

6. **Access the plugin** at `http://localhost:9999/downloader` (or your Stash URL)

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

### Single URL Import

1. Navigate to the Downloader page (`/downloader`)
2. Enter a URL in the input field and click "Add to Queue"
3. The plugin will scrape metadata from the URL automatically
4. Click the "Edit" button on any item to review and edit metadata
5. Click "Edit & Import" to process all pending items

### Batch Import from Clipboard

1. Copy multiple URLs to your clipboard (one per line)
2. Click "Import from Clipboard" button
3. Review the detected URLs and click "Import"
4. All items will be added to the queue with scraped metadata

### Editing & Importing Workflow

1. After adding items to the queue, click "Edit & Import (X items)"
2. For each item, you can:
   - Edit title, description, date, and rating
   - Add/select performers with autocomplete
   - Add/select tags with autocomplete
   - Add/select studio
   - Create new performers/tags/studios on the fly
3. Click "Save & Import to Stash" to download and create the item in Stash
4. Click "Skip This Item" to move to the next without importing
5. Use Previous/Next navigation to move between items

### Progress Tracking

- View queue statistics (total, downloading, complete, failed)
- Monitor individual item status with badges
- Track download progress with progress bars
- Clear completed or failed items as needed

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
