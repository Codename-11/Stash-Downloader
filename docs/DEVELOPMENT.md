# Development Guide

## Project Structure

```
Stash-Downloader/
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   ├── common/        # Reusable UI components
│   │   └── downloader/    # Download queue components
│   ├── services/          # Business logic
│   │   ├── stash/        # Stash GraphQL service
│   │   ├── download/     # Download manager
│   │   └── metadata/     # Metadata scrapers
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React contexts
│   ├── types/            # TypeScript definitions
│   ├── utils/            # Utilities
│   ├── constants/        # Constants
│   └── index.tsx         # Plugin entry point
├── scripts/               # Python backend
│   └── download.py       # yt-dlp wrapper
├── browser-extension/     # Firefox extension
├── dist/                  # Built output
├── docs/                  # Documentation
└── stash-downloader.yml  # Plugin manifest
```

## Development Setup

```bash
# Clone repository
git clone https://github.com/Codename-11/Stash-Downloader.git
cd Stash-Downloader

# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Build for Stash (creates stash-plugin/ folder)
npm run build:stash

# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm run test
```

## Architecture

### Plugin Integration

The plugin uses Stash's `PluginApi` for integration:

- **Routes**: Registered at `/plugin/stash-downloader` via `PluginApi.register.route()`
- **Navigation**: Navbar button injected via MutationObserver (`.navbar-buttons` selector)
- **Dependencies**: React, ReactDOM, Bootstrap provided by Stash (NOT bundled)
- **GraphQL**: Direct fetch to `/graphql` endpoint
- **Styling**: Bootstrap utilities + Stash theme colors via inline styles

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

### Data Flow

```
User Input → Metadata Scraper → Download Service → Stash GraphQL → Scene Created
```

### State Management

- **Local State**: React hooks (`useState`, `useReducer`)
- **Context**: Download queue, settings, logs
- **Apollo Cache**: Stash data (performers, tags, studios)
- **localStorage**: User preferences, queue persistence, logs

---

## Adding New Scrapers

To add support for a new website:

### 1. Create Scraper Class

```typescript
// src/services/metadata/MyScraper.ts
import { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';

export class MyScraper implements IMetadataScraper {
  name = 'MySite';
  supportedDomains = ['mysite.com', 'www.mysite.com'];
  contentTypes = [ContentType.Video]; // Supported content types

  canHandle(url: string): boolean {
    return this.supportedDomains.some(d => url.includes(d));
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    // Implement scraping logic
    return {
      url,
      title: 'Scraped Title',
      contentType: ContentType.Video,
      performers: ['Performer 1'],
      tags: ['Tag 1', 'Tag 2'],
      // ... other fields
    };
  }
}
```

### 2. Register the Scraper

```typescript
// In src/services/metadata/ScraperRegistry.ts
import { MyScraper } from './MyScraper';

// Add to constructor
this.register(new MyScraper());
```

### Scraper Priority

1. **YtDlpScraper** - Primary for video sites (server-side yt-dlp)
2. **BooruScraper** - Primary for booru image sites
3. **StashScraper** - Fallback using Stash's built-in scraper
4. **GenericScraper** - Last resort, URL parsing only

---

## Contributing

### Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features, backwards compatible
- **PATCH** (0.0.X): Bug fixes, backwards compatible

Version is managed in `package.json`.

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) with emoji:

| Type | Emoji | Description |
|------|-------|-------------|
| `feat:` | ✨ | New feature |
| `fix:` | 🐛 | Bug fix |
| `docs:` | 📝 | Documentation |
| `refactor:` | ♻️ | Code refactoring |
| `chore:` | 🔧 | Build/tooling |
| `perf:` | ⚡️ | Performance |
| `test:` | ✅ | Tests |

**Examples:**
```
✨ feat: add batch import from clipboard
🐛 fix: resolve memory leak in download queue
📝 docs: update installation instructions
♻️ refactor: simplify metadata scraper logic
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`feature/description` or `fix/description`)
3. Make changes following conventions in `.claude/conventions.md`
4. Test thoroughly
5. Submit a pull request

---

## Releasing

### Release Process

This project uses **tag-based releases**. When you push a tag, GitHub Actions automatically:
1. Runs tests, lint, and type-check
2. Builds the plugin
3. Deploys to GitHub Pages (updates Stash plugin index)
4. Creates a GitHub Release with the ZIP attached

### How to Create a Release

```bash
# 1. Update version in package.json
#    Edit package.json: "version": "0.1.0" → "0.2.0"

# 2. Commit the version bump
git add package.json
git commit -m "🔖 chore: release v0.2.0"

# 3. Create and push the tag
git tag v0.2.0
git push origin main --tags
```

### Version Bump Guidelines

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking changes | MAJOR | 0.1.0 → 1.0.0 |
| New features | MINOR | 0.1.0 → 0.2.0 |
| Bug fixes | PATCH | 0.1.0 → 0.1.1 |

### What Happens on Release

1. **CI runs**: Type-check, lint, tests must pass
2. **Build**: Plugin is compiled and packaged
3. **GitHub Pages**: `index.yml` updated with new version
4. **GitHub Release**: Created with:
   - Release notes (auto-generated)
   - `stash-downloader.zip` attached
   - Installation instructions

### Verifying a Release

After pushing a tag:
1. Check [Actions](https://github.com/Codename-11/Stash-Downloader/actions) for build status
2. Verify [Releases](https://github.com/Codename-11/Stash-Downloader/releases) page
3. Test installation via Stash plugin manager

---

## Build Configuration

### Vite Config

```typescript
build: {
  lib: {
    entry: 'src/index.tsx',
    name: 'StashDownloader',
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

### Plugin Manifest (stash-downloader.yml)

```yaml
name: Stash Downloader
description: Download and import content with metadata
version: 0.1.0

exec:
  - python
  - "{pluginDir}/scripts/download.py"

ui:
  javascript:
    - dist/stash-downloader.js

interface: raw  # Required for Python subprocess
```

---

## Debugging

### Enable Verbose Python Logging

```bash
STASH_DOWNLOADER_DEBUG=1
```

### Browser Console

Press F12 to open DevTools. Check Console tab for:
- JavaScript errors
- Network requests to `/graphql`
- Plugin log messages

### Stash Logs

Check Stash logs for plugin errors:
- Docker: `docker logs stash`
- Direct: Check `~/.stash/stash.log`
