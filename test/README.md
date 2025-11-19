# Test Environment

This directory contains a complete test environment for developing and testing the Stash Downloader plugin **without requiring a running Stash instance**.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start test server (opens browser automatically)
pnpm test

# Build test version
pnpm test:build
```

The test app will open at `http://localhost:3000` with the plugin fully functional using mock data.

## What's Included

### Mock PluginApi (`mocks/mockPluginApi.ts`)

A complete mock implementation of Stash's `window.PluginApi` that provides:

- Mock React and ReactDOM
- Mock libraries (React Router, Apollo, Bootstrap, FontAwesome)
- Mock GraphQL client with in-memory storage
- Route and component registration
- Event system
- All methods the plugin needs

### Mock Services

**MockDownloadService** (`mocks/mockDownloadService.ts`)
- Simulates file downloads with progress updates
- Configurable delay and file sizes
- No actual network requests

**MockMetadataScraper** (`mocks/mockMetadataScraper.ts`)
- Returns realistic metadata for test URLs
- Simulates network delay
- Supports custom test URLs

### Test Fixtures (`fixtures/mockData.ts`)

Pre-populated test data:
- 3 performers (Jane Doe, John Smith, Sarah Connor)
- 4 tags (Amateur, Professional, Outdoor, Indoor)
- 2 studios (Test Studio A, Test Studio B)
- Sample scenes and images
- Mock scraped metadata for test URLs

### Test Application (`app.tsx`)

A standalone React app that:
- Installs mock PluginApi
- Loads test fixtures
- Registers mock services
- Renders the plugin in a test environment
- Shows debug information

## Testing Features

### 1. URL Import & Scraping

Test URLs that work with mock scraper:
```
https://example.com/video1.mp4
https://example.com/video2.mp4
https://example.com/image1.jpg
https://example.com/image2.png
```

Or any URL with `example.com` or `test.com` will return mock metadata.

### 2. Batch Import

Copy multiple URLs to clipboard:
```
https://example.com/video1.mp4
https://example.com/video2.mp4
https://example.com/image1.jpg
```

Click "Import from Clipboard" to test batch functionality.

### 3. Metadata Editing

- Search performers, tags, studios (uses mock data)
- Create new performers/tags/studios (saved to mock storage)
- Edit all metadata fields
- Test autocomplete and selection

### 4. Download Simulation

- Add items to queue
- Click "Edit & Import"
- Watch simulated download progress
- See items created in mock GraphQL

### 5. Queue Management

- Add/remove items
- Clear completed/failed
- Track statistics
- Edit individual items

## Mock Data

### Viewing Mock Data

The test app shows loaded mock data in the debug panel at the top.

### Adding Mock Data

Edit `test/fixtures/mockData.ts`:

```typescript
export const mockPerformers = [
  {
    id: 'performer-1',
    name: 'Your Performer Name',
    disambiguation: 'Info',
    aliases: ['Alias'],
    image_path: 'https://via.placeholder.com/150',
  },
  // Add more...
];
```

### Inspecting Created Data

Open browser console and run:

```javascript
// View all mock data
window.PluginApi.GQL

// View created scenes
getMockData().scenes

// View created performers
getMockData().performers
```

## Development Workflow

### Typical Development Session

1. **Start test server:**
   ```bash
   pnpm test
   ```

2. **Make changes to source code** in `src/`

3. **Hot reload** - Changes appear automatically in browser

4. **Test features** using mock data and services

5. **Check browser console** for logs and errors

6. **Build plugin** when ready:
   ```bash
   pnpm build
   ```

### Debugging

**Enable verbose logging:**

All mock services log to console with `[Mock]` prefix:
- `[Mock GQL Query]` - GraphQL queries
- `[Mock GQL Mutation]` - GraphQL mutations
- `[Mock Download]` - Download operations
- `[Mock Scraper]` - Metadata scraping

**Access mock API:**

```javascript
// Get mock API
const api = window.PluginApi;

// View registered routes
api._getRoutes();

// View registered components
api._getComponents();

// View patches
api._getPatches();
```

**Inspect mock data:**

```javascript
import { getMockData, setMockData } from '/test/mocks/mockPluginApi';

// Get all data
const data = getMockData();

// Add custom data
setMockData({
  performers: [...existingPerformers, newPerformer],
});
```

## Customizing Test Environment

### Change Mock Data

Edit `test/fixtures/mockData.ts` to add/modify:
- Performers
- Tags
- Studios
- Scenes
- Scraped metadata

### Add Custom Scrapers

Create a new scraper in `test/mocks/`:

```typescript
import type { IMetadataScraper, IScrapedMetadata } from '@/types';

export class MyCustomScraper implements IMetadataScraper {
  name = 'Custom';
  supportedDomains = ['custom.com'];

  canHandle(url: string): boolean {
    return url.includes('custom.com');
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    return {
      url,
      title: 'Custom Title',
      // ...
    };
  }
}
```

Register in `test/app.tsx`:

```typescript
import { MyCustomScraper } from './mocks/MyCustomScraper';
getScraperRegistry().register(new MyCustomScraper());
```

### Simulate Errors

Modify mock services to throw errors:

```typescript
// In mockPluginApi.ts
mutate: async (mutation, variables) => {
  if (mutation.includes('sceneCreate')) {
    throw new Error('Mock error: Scene creation failed');
  }
  // ...
}
```

### Customize Download Behavior

Edit `test/mocks/mockDownloadService.ts`:

```typescript
// Change file size range
const totalBytes = Math.floor(Math.random() * 100000000) + 50000000; // 50-150 MB

// Change download speed
const chunkDelay = 500; // Slower download

// Simulate failures
if (Math.random() < 0.1) {
  throw new Error('Random download failure');
}
```

## Differences from Production

### What Works the Same

- All UI components
- State management
- Form validation
- Navigation
- Error handling
- GraphQL queries/mutations

### What's Different

- No actual file downloads (simulated)
- No real network requests
- In-memory data storage (resets on reload)
- No Stash backend
- Mock Bootstrap styling (may look slightly different)
- No authentication

### Limitations

- LocalStorage persists between reloads
- No file system access
- Can't test actual Stash GraphQL schema
- Can't test real scraper implementations
- No production error scenarios

## Troubleshooting

### Port 3000 already in use

```bash
# Use different port
PORT=3001 pnpm test
```

### Changes not appearing

1. Check browser console for errors
2. Hard refresh (Cmd/Ctrl + Shift + R)
3. Clear cache and reload
4. Restart dev server

### Mock data not loading

Check console for:
```
[Mock] PluginApi installed
Mock data loaded: X performers, Y tags, Z studios
```

If missing, check `test/app.tsx` initialization.

### GraphQL mutations not working

Check mock implementation in `test/mocks/mockPluginApi.ts`. Add console logs:

```typescript
mutate: async (mutation, variables) => {
  console.log('[DEBUG]', { mutation, variables });
  // ...
}
```

## Testing Checklist

Before committing changes, test:

- [ ] Single URL import
- [ ] Batch clipboard import
- [ ] Metadata scraping
- [ ] Performer autocomplete and creation
- [ ] Tag autocomplete and creation
- [ ] Studio selection and creation
- [ ] Metadata form validation
- [ ] Edit & Import workflow
- [ ] Queue management (add/remove/clear)
- [ ] Progress tracking
- [ ] Error handling
- [ ] Previous/Next/Skip navigation
- [ ] Browser console has no errors

## CI/CD Integration

The test environment can be used for automated testing:

```bash
# Build test version
pnpm test:build

# Run in headless browser (example with Playwright)
npx playwright test

# Or with Cypress
npx cypress run
```

## Further Reading

- Stash Plugin API: https://docs.stashapp.cc/in-app-manual/plugins/uipluginapi/
- Project architecture: `../.claude/architecture.md`
- Development conventions: `../.claude/conventions.md`
