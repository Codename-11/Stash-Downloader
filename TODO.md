# TODO

## Ideas
- [ ] Add a way to add custom scrapers via plugin settings

## In Progress

- [ ] Fix stable release to contain version in index.yml

## Backlog

### CI/CD
- [ ] **Automated browser store uploads**: Upload extension to Firefox Add-ons / Chrome Web Store when `browser-extension/manifest.json` version changes
  - Detect version changes with `git diff HEAD^ HEAD -- browser-extension/manifest.json | grep '"version"'`
  - Use `web-ext sign` for AMO with API credentials
  - Use Chrome Web Store API for Chrome uploads
  - Status: Manual uploads currently (automated in future)
  - See: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign

### Features
- [ ] Resume interrupted downloads
- [ ] Concurrent download limit UI control
- [ ] Download history view
- [ ] Export/import queue

### UI/UX
- [ ] Keyboard shortcuts (using Mousetrap from PluginApi)
- [ ] Drag-and-drop queue reordering
- [ ] Bulk select/delete queue items

### Testing
- [ ] Add unit tests for Logger utility
- [ ] Add integration tests for download flow

## Completed

- [x] Retry button for failed queue items
- [x] Navbar icon for quick access to downloader
- [x] Queue position indicator in edit modal (1 of X)
- [x] Skip button for multi-item workflow
- [x] "Exists in Stash" badge on duplicate queue items
- [x] Activity log improvements (reduced verbose noise)
- [x] Logger migration: All `console.*` calls migrated to `createLogger()` pattern (20 files)
- [x] Remove test-app infrastructure (standalone testing environment)
- [x] Add `npm run build:stash` script for easy plugin packaging
- [x] BooruScraper for image booru sites (Rule34, Gelbooru, Danbooru)
- [x] Content type support (Video, Image, Gallery)
- [x] Image/gallery downloads
- [x] Re-scrape feature with scraper selection dropdown
- [x] Central Logger utility with log level filtering
- [x] Log level UI setting (off/error/warning/info/debug)
- [x] Thumbnail preview toggle
- [x] ESLint v9 flat config migration
- [x] Automatic Stash library integration and scan triggering
- [x] Metadata matching service
- [x] Entity creation (performers, tags, studios)
- [x] Duplicate URL detection in queue
- [x] Persist download queue to localStorage
- [x] Remove download button from queue items (users must open edit modal)
- [x] Auto-trigger metadata matching when opening edit modal
- [x] Add clear button to each metadata section (Performers, Tags, Studio)
- [x] Add clear all button for matched metadata
