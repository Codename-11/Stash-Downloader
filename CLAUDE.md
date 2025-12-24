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
| `npm run build:stash` | Build and create plugin folder |
| `npm test` | Run tests |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint check |

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite (IIFE bundle for Stash plugins)
- **Styling**: Bootstrap utilities (provided by Stash)
- **API**: GraphQL via Apollo Client (provided by Stash)
- **Backend**: Python + yt-dlp for server-side downloads
- **Scraping**: Server-side via yt-dlp Python backend

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

## Scraper Priority

1. **YtDlpScraper** - PRIMARY for Video: Server-side yt-dlp via Python backend (extracts video URLs)
2. **BooruScraper** - PRIMARY for Image/Gallery: Booru site API scraper (Rule34, Gelbooru, Danbooru)
3. **StashScraper** - FALLBACK: Uses Stash's built-in scraper API
4. **GenericScraper** - LAST RESORT: URL parsing only

**Re-scrape**: Users can manually try different scrapers via dropdown menu on queue items.

## PR Review Criteria (for Claude GitHub Action)

When reviewing pull requests, check:

1. **Code Quality**
   - TypeScript strict mode compliance
   - No `any` types without justification
   - Proper error handling

2. **Style Compliance**
   - Conventional commits format
   - Bootstrap utilities for styling (not custom CSS)
   - Stash theme colors for dark mode

3. **Testing**
   - Tests pass (`npm test`)
   - Build succeeds (`npm run build`)
   - No new lint warnings

4. **Security**
   - No hardcoded credentials
   - Input validation for user data
   - Safe URL handling

5. **Documentation**
   - README updated if needed
   - Code comments for complex logic

# Documentation Instructions
Keep the documentation concise and to the point. Use markdown formatting for the documentation.
Update relevant files with the new information and remove any outdated information when necessary.
