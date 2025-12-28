# Development Guide

## Project Structure

This is a monorepo containing multiple Stash plugins:

```
Stash-Downloader/
├── plugins/
│   ├── stash-downloader/       # Stash Downloader plugin
│   │   ├── src/                # TypeScript source
│   │   │   ├── components/     # React components
│   │   │   ├── services/       # Business logic
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── contexts/       # React contexts
│   │   │   ├── types/          # TypeScript definitions
│   │   │   └── index.tsx       # Plugin entry point
│   │   ├── scripts/            # Python backend (download.py)
│   │   ├── tests/              # Vitest tests
│   │   ├── dist/               # Built output
│   │   ├── package.json        # Plugin version
│   │   ├── vite.config.ts      # Build config
│   │   └── stash-downloader.yml # Plugin manifest
│   │
│   └── stash-browser/          # Stash Browser plugin
│       ├── src/                # TypeScript source
│       ├── scripts/            # Python backend (proxy.py)
│       ├── dist/               # Built output
│       ├── package.json        # Plugin version
│       ├── vite.config.ts      # Build config
│       └── stash-browser.yml   # Plugin manifest
│
├── browser-extension/          # Firefox browser extension
├── shared/                     # Shared utilities (planned)
├── docs/                       # Documentation
├── package.json                # Root workspace config
├── eslint.config.js            # Shared ESLint config
└── .github/workflows/          # CI/CD
```

---

## Development Setup

```bash
# Clone repository
git clone https://github.com/Codename-11/Stash-Downloader.git
cd Stash-Downloader

# Install dependencies (all workspaces)
npm install

# Build all plugins
npm run build

# Build specific plugin
npm run build:downloader
npm run build:browser

# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm test
```

### Working on a Specific Plugin

```bash
# Development mode with watch
cd plugins/stash-downloader
npm run dev

# Or for Stash Browser
cd plugins/stash-browser
npm run dev
```

---

## Architecture

### Plugin Integration

Both plugins use Stash's `PluginApi` for integration:

- **Routes**: Registered via `PluginApi.register.route()`
- **Navigation**: Navbar button injected via MutationObserver
- **Dependencies**: React, ReactDOM, Bootstrap provided by Stash (NOT bundled)
- **GraphQL**: Direct fetch to `/graphql` endpoint
- **Styling**: Bootstrap utilities + Stash theme colors

### Libraries from PluginApi

Stash provides these (do NOT bundle):
- `PluginApi.React` - React
- `PluginApi.ReactDOM` - ReactDOM
- `PluginApi.libraries.ReactRouterDOM` - React Router
- `PluginApi.libraries.Bootstrap` - React-Bootstrap
- `PluginApi.libraries.Apollo` - Apollo Client

### Stash Theme Colors

```
Card backgrounds: #30404d
Headers/inputs:   #243340
Borders:          #394b59
Muted text:       #8b9fad
```

---

## Plugin Details

### Stash Downloader

**Purpose**: Download videos/images with automatic metadata extraction

**Data Flow**:
```
User Input → Metadata Scraper → Download Service → Stash GraphQL → Scene Created
```

**Python Backend** (`scripts/download.py`):
- Server-side downloads via yt-dlp
- Metadata extraction
- Cover image fetching
- Invoked via `runPluginTask` / `runPluginOperation`

### Stash Browser

**Purpose**: Browse booru sites and send content to download queue

**Data Flow**:
```
User Search → Python Proxy → Booru API → Results Display → Add to Queue Event
```

**Python Backend** (`scripts/proxy.py`):
- CORS proxy for booru APIs
- Autocomplete endpoint access
- Search and post fetching

**Event Communication**:
- Browser dispatches `CustomEvent` with post data
- Downloader listens for `DOWNLOADER_EVENTS.ADD_TO_QUEUE`
- Queue is shared via event system

---

## Adding New Features

### Adding a Scraper (Stash Downloader)

```typescript
// plugins/stash-downloader/src/services/metadata/MyScraper.ts
import { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';

export class MyScraper implements IMetadataScraper {
  name = 'MySite';
  supportedDomains = ['mysite.com'];
  contentTypes = [ContentType.Video];

  canHandle(url: string): boolean {
    return this.supportedDomains.some(d => url.includes(d));
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    // Implement scraping logic
    return { url, title: '...', contentType: ContentType.Video };
  }
}

// Register in ScraperRegistry.ts
this.register(new MyScraper());
```

### Adding a Booru Source (Stash Browser)

1. Add API config in `scripts/proxy.py`:
```python
BOORU_APIS = {
    'newbooru': {
        'base_url': 'https://newbooru.com',
        'search_path': '/index.php',
        'search_params': {...},
    },
}
```

2. Add autocomplete handler in `autocomplete_tags()`

3. Add source option in `constants/index.ts`

4. Update `SearchBar.tsx` dropdown

---

## Contributing

### Versioning

Each plugin has independent versioning:

| Plugin | Version File | Release Tag |
|--------|--------------|-------------|
| Stash Downloader | `plugins/stash-downloader/package.json` | `downloader-vX.Y.Z` |
| Stash Browser | `plugins/stash-browser/package.json` | `browser-vX.Y.Z` |

### Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/) with emoji:

| Type | Emoji | Description |
|------|-------|-------------|
| `feat:` | ✨ | New feature |
| `fix:` | 🐛 | Bug fix |
| `docs:` | 📝 | Documentation |
| `refactor:` | ♻️ | Code refactoring |
| `chore:` | 🔧 | Build/tooling |

Include plugin scope when relevant:
```
✨ feat(browser): add tag autocomplete
🐛 fix(downloader): resolve queue persistence issue
```

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases only |
| `dev` | Active development |

**Always develop on `dev` branch.** Merge to `main` only for releases.

---

## Releasing

### Release Process

```bash
# 1. Merge dev to main
git checkout main && git merge dev

# 2. Bump version in the plugin's package.json
cd plugins/stash-downloader
npm version patch  # or minor/major

# 3. Commit and tag
git add .
git commit -m "🔖 chore: release downloader-v0.2.0"
git tag downloader-v0.2.0
git push origin main --tags

# 4. WAIT for workflow to complete before syncing dev
# Check: https://github.com/Codename-11/Stash-Downloader/actions
git checkout dev && git merge main && git push
```

### What Happens on Release

1. **CI**: Type-check, lint, tests
2. **Build**: Plugin compiled and packaged
3. **GitHub Pages**: `index.yml` updated with both plugins
4. **GitHub Release**: Created with ZIP attached

### Dev Builds

Push to `dev` automatically deploys dev builds:
- `stash-downloader-dev`
- `stash-browser-dev`

Both stable and dev can be installed simultaneously.

---

## Build Configuration

### Vite Config (per plugin)

```typescript
build: {
  lib: {
    entry: 'src/index.tsx',
    name: 'StashDownloader',  // or 'StashBrowser'
    formats: ['iife'],
    fileName: () => 'stash-downloader.js',
  },
  rollupOptions: {
    external: ['react', 'react-dom', 'react-router-dom', '@apollo/client'],
    output: {
      globals: {
        react: 'PluginApi.React',
        'react-dom': 'PluginApi.ReactDOM',
        'react-router-dom': 'PluginApi.libraries.ReactRouterDOM',
        '@apollo/client': 'PluginApi.libraries.Apollo',
      },
    },
  },
}
```

### Plugin Manifest

```yaml
name: Plugin Name
description: Plugin description
version: 0.1.0

exec:
  - python
  - "{pluginDir}/scripts/script.py"

ui:
  javascript:
    - dist/plugin-name.js

interface: raw  # Required for Python subprocess
```

---

## Debugging

### Browser Console

Press F12 for DevTools:
- Console: JavaScript errors, log messages
- Network: GraphQL requests, API calls

### Stash Logs

```bash
# Docker
docker logs stash

# Direct installation
cat ~/.stash/stash.log
```

### Python Script Testing

```bash
# Test script directly
cd plugins/stash-browser/scripts
echo '{"args": {"mode": "search", "source": "rule34", "tags": "test"}}' | python proxy.py
```

---

## Testing

```bash
# Run all tests
npm test

# Run plugin-specific tests
npm test -w @stash-plugins/stash-downloader

# Watch mode
npm test -- --watch
```

Tests use Vitest with React Testing Library for component tests.
