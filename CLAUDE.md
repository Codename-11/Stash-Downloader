# Stash Downloader Plugin

A React-based Stash plugin for downloading images and videos with automatic metadata extraction and tagging.

## Documentation

@.claude/project.md
@.claude/architecture.md
@.claude/conventions.md

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Build with watch mode |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run test-app` | Run standalone test app |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint check |

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite (IIFE bundle for Stash plugins)
- **Styling**: Bootstrap utilities (provided by Stash)
- **API**: GraphQL via Apollo Client (provided by Stash)
- **Backend**: Python + yt-dlp for server-side downloads
- **Scraping**: Dual-mode (server-side via Stash, client-side with CORS proxy)

## Key Constraints

- External deps (React, Apollo) provided by Stash - NOT bundled
- No CSS-in-JS libraries (no MUI, Emotion, styled-components)
- No custom ThemeProvider contexts in plugin code
- Bundle target: <150KB

## Stash Theme Colors

```
Card background: #30404d
Header/input bg: #243340
Borders: #394b59
Muted text: #8b9fad
```

## Plugin Entry Pattern

The plugin registers via `PluginApi.register.route()` and adds navbar link via MutationObserver (community plugin pattern). This avoids issues with `patch.after` receiving empty/null output.

## Scraper Priority (Stash Environment)

1. **YtDlpScraper** - PRIMARY for Video: Server-side yt-dlp via Python backend (extracts video URLs)
2. **BooruScraper** - PRIMARY for Image/Gallery: Booru site API scraper (Rule34, Gelbooru, Danbooru)
3. **StashScraper** - DISABLED: Kept in code but `canHandle()` returns false
4. **GenericScraper** - FALLBACK: URL parsing only (last resort)

In test-app mode, additional client-side scrapers are enabled (PornhubScraper, YouPornScraper, HTMLScraper).

**Re-scrape**: Users can manually try different scrapers via dropdown menu on queue items.

# Documentation Instructions
Keep the documentation concise and to the point. Use markdown formatting for the documentation.
Update relevant files with the new information and remove any outdated information when necessary.