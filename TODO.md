# TODO

## Ideas
- [ ] Add a way to add custom scrapers via plugin settings

## In Progress

### Logger Migration
- [ ] Migrate remaining `console.*` calls to use `createLogger()` pattern
  - ~200 calls across 20 files need migration
  - Infrastructure complete: `Logger.ts`, `useLoggerBridge`, log level UI
  - Pattern: `import { createLogger } from '@/utils'; const log = createLogger('Category');`
  - Files with most calls:
    - `src/services/download/DownloadService.ts` (40 calls) - partially done
    - `src/services/stash/StashGraphQLService.ts` (37 calls)
    - `src/services/metadata/YtDlpScraper.ts` (36 calls)
    - `src/components/downloader/QueuePage.tsx` (25 calls)

## Backlog

### Features
- [ ] Resume interrupted downloads
- [ ] Concurrent download limit UI control
- [ ] Download history view
- [ ] Export/import queue

### Scrapers
- [ ] Add more site-specific scrapers
- [ ] Verify scrapers are properly retrieving metadata
- [ ] Scraper enable/disable settings UI

### UI/UX
- [ ] Keyboard shortcuts (using Mousetrap from PluginApi)
- [ ] Drag-and-drop queue reordering
- [ ] Bulk select/delete queue items

### Testing
- [ ] Add unit tests for Logger utility
- [ ] Add integration tests for download flow

## Completed

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
