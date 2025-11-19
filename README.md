# Stash Downloader Plugin

A React-based web-UI plugin for Stash that enables downloading images and videos from external sources with automatic metadata extraction, tagging, and organization.

## Features

- **URL-based Downloads**: Download videos and images from direct URLs or supported sites
- **Metadata Extraction**: Automatically extract and map metadata from sources
- **Stash Integration**: Create scenes, images, and galleries directly in Stash via GraphQL
- **Smart Matching**: Match performers, tags, and studios against existing Stash data
- **Queue Management**: Track multiple downloads with progress indicators
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

1. Navigate to the Downloader page (`/downloader`)
2. Enter a URL in the input field
3. The plugin will:
   - Scrape metadata from the URL
   - Add the item to the download queue
   - Download the file
   - Create a Scene/Image/Gallery in Stash with metadata
4. Monitor progress in the queue

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
