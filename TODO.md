# TODO

## Ideas
- [ ] Add a way to add a custom scraper for a specific site

## In Progress

### Logger Migration
- [ ] Migrate remaining `console.*` calls to use `createLogger()` pattern
  - ~370 calls across 27 files need migration
  - Infrastructure complete: `Logger.ts`, `useLoggerBridge`, log level UI
  - Pattern: `import { createLogger } from '@/utils'; const log = createLogger('Category');`
  - Files with most calls:
    - `src/services/metadata/YouPornScraper.ts` (71 calls)
    - `src/services/metadata/PornhubScraper.ts` (43 calls)
    - `src/services/download/DownloadService.ts` (40 calls) - partially done
    - `src/services/stash/StashGraphQLService.ts` (37 calls)
    - `src/services/metadata/YtDlpScraper.ts` (36 calls)
    - `src/components/downloader/QueuePage.tsx` (25 calls)

## Backlog

### Features
- [ ] Persist download queue to localStorage
- [ ] Resume interrupted downloads
- [ ] Concurrent download limit UI control
- [ ] Download history view
- [ ] Export/import queue

### Scrapers
- [ ] Add more site-specific scrapers
- [ ] Verify scrapers are properly retrieving metadata
- [ ] Scraper enable/disable settings UI

### Content Type & Image Support
- [ ] Add `contentTypes` property to `IMetadataScraper` interface (video/image/both)
- [ ] Add tags, performers, studios, etc. to `IScrapedMetadata` interface if available (optional) to indicate if the scraper supports it
- [ ] Update `ScraperRegistry` to filter scrapers by content type
- [ ] Add `BooruScraper` for image booru sites (Rule34, Gelbooru, Danbooru, etc.)
  - [ ] Parse booru API/HTML for image posts
  - [ ] Extract full-size image URL (not thumbnail)
  - [ ] Map booru tags → Stash tags
  - [ ] Extract artist/source metadata → performers/studios
  - [ ] Handle post ID for deduplication
- [ ] Add `Rule34VideoScraper` for rule34video.com (if yt-dlp doesn't cover it)
- [ ] Support image galleries (multiple images per URL)
- [ ] Add content type indicator in queue UI (video/image/gallery icons)
- [ ] Update download service to handle image downloads (simpler than video)

### UI/UX
- [ ] Keyboard shortcuts (using Mousetrap from PluginApi)
- [ ] Drag-and-drop queue reordering
- [ ] Bulk select/delete queue items
- [ ] Dark/light theme toggle (if Stash supports it)

### Testing
- [ ] Add unit tests for Logger utility
- [ ] Add unit tests for scrapers
- [ ] Add integration tests for download flow

## Completed

- [x] Central Logger utility with log level filtering
- [x] Log level UI setting (off/error/warning/info/debug)
- [x] Thumbnail preview toggle
- [x] ESLint v9 flat config migration
- [x] Automatic Stash library integration and scan triggering
- [x] Metadata matching service
- [x] Entity creation (performers, tags, studios)
- [x] Duplicate URL detection in queue
