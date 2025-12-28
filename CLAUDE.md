# Stash Plugins Monorepo

A monorepo for Stash plugins including:
- **Stash Downloader** - Download images and videos with automatic metadata extraction
- **Stash Browser** - Browse and preview content from external sources

## Documentation

@.claude/project.md
@.claude/architecture.md
@.claude/conventions.md

## Task Tracking

- **See [`TODO.md`](TODO.md)** — All tasks, backlog items, feature ideas, and completed features are tracked here.
- When making changes or planning features, always refer to the TODO.md file for current project priorities and progress.
- Claude: Use information from TODO.md to inform, update, or cross-reference project documentation, code changes, and pull request review summaries where relevant.

## Quick Reference

### Workspace Commands (from root)
| Command                    | Description                       |
|----------------------------|-----------------------------------|
| `npm run build`            | Build all plugins                 |
| `npm run build:downloader` | Build Stash Downloader only       |
| `npm run build:browser`    | Build Stash Browser only          |
| `npm run test`             | Run tests for all plugins         |
| `npm run type-check`       | TypeScript check all plugins      |
| `npm run lint`             | ESLint all plugins                |

### Plugin-Specific Commands (from plugins/stash-downloader/)
| Command                | Description                  |
|------------------------|------------------------------|
| `npm run dev`          | Build with watch mode        |
| `npm run build`        | Production build             |
| `npm run build:stash`  | Build and create plugin folder|
| `npm test`             | Run tests                    |
| `npm run type-check`   | TypeScript check             |
| `npm run lint`         | ESLint check                 |

## Branch & Release Workflow

### Branch Strategy
| Branch  | Purpose                                   |
|---------|-------------------------------------------|
| **dev** | Active development - all work happens here |
| **main**| Stable releases only - merged from dev     |

**ALWAYS develop on `dev` branch.** Never commit directly to `main`.

### Development Flow
```
1. Work on dev branch
2. Push to dev → triggers dev build (Downloader-Dev)
3. When ready for release: merge dev → main, bump version, tag
4. Tag on main → triggers stable release (push to main alone does NOTHING)
5. WAIT for workflow to complete before syncing dev
```

### Plugin Versions (Independent)
| Plugin              | Version Location                        | Release Trigger              |
|---------------------|-----------------------------------------|------------------------------|
| **Stash Downloader**| `plugins/stash-downloader/package.json` | `downloader-vX.Y.Z` tag      |
| **Stash Browser**   | `plugins/stash-browser/package.json`    | `browser-vX.Y.Z` tag         |
| **Firefox Extension**| `browser-extension/manifest.json`      | Manual upload to AMO         |

### Stable vs Dev Builds
| Plugin           | Stable Tag          | Dev Trigger    | Plugin IDs                          |
|------------------|---------------------|----------------|-------------------------------------|
| **Downloader**   | `downloader-vX.Y.Z` | Push to `dev`  | `stash-downloader` / `stash-downloader-dev` |
| **Browser**      | `browser-vX.Y.Z`    | Push to `dev`  | `stash-browser` / `stash-browser-dev` |

Both can be installed simultaneously in Stash (different plugin IDs via YAML filename).  
Both are served from the same `index.yml` - each deploy preserves the other's entry.

### Release Process
```bash
# Release Stash Downloader:
git checkout main && git merge dev
cd plugins/stash-downloader && npm version patch  # or minor/major
git add . && git commit -m "🔖 chore: release downloader-vX.Y.Z"
git tag downloader-vX.Y.Z && git push origin main --tags

# Release Stash Browser:
git checkout main && git merge dev
cd plugins/stash-browser && npm version patch
git add . && git commit -m "🔖 chore: release browser-vX.Y.Z"
git tag browser-vX.Y.Z && git push origin main --tags
```

Or use `/release` skill for guided release.

### After Releasing
- **Stable**: GitHub Actions builds + deploys to GitHub Pages + creates GitHub Release
- **Dev**: Sync dev with main AFTER workflow completes (to avoid cancelling stable deploy)
- **Extension**: Manually run `python package_extension.py` and upload ZIP to AMO

**⚠️ WAIT for stable workflow to complete before pushing to dev** - concurrent deploys cancel each other!

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

## Key Features

- **Auto-import toggle**: Batch import all pending items at once without edit modal (uses scraped metadata as-is)
- **Edit & Import**: Review/edit each item individually before import (default mode)
- **Post-import actions**: None, Identify (StashDB), or Scrape URL after import

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

   - **Also review/triage with TODO.md:** Check that new/changed tasks and backlog items are up-to-date in `TODO.md`. When features are completed, ensure they are checked off in `TODO.md`.

# Documentation Instructions

- Keep the documentation concise and to the point.
- Use markdown formatting for the documentation.
- Update relevant files with the new information and remove any outdated information when necessary.
- Always reference and update `TODO.md` for tasks, backlog, and progress tracking.
