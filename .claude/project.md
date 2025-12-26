# Stash Downloader Plugin

## Overview
A React-based web-UI plugin for Stash that enables downloading images and videos from external sources with automatic metadata extraction, tagging, and organization.

## Purpose
Streamline the process of importing content into Stash by:
- Downloading content from URLs
- Extracting and previewing metadata automatically
- Triggering Stash's metadata system (Identify/Scrape) after import
- Creating properly organized Stash entries via GraphQL API

## Technology Stack
- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite (IIFE bundle format for Stash plugins)
- **Styling**: Bootstrap utility classes (provided by Stash via PluginApi)
- **API**: GraphQL via Apollo Client (provided by Stash)
- **State Management**: React Context + Hooks
- **Plugin API**: Stash PluginApi (window.PluginApi)
- **Backend**: Python scripts with yt-dlp for server-side downloads
- **Scraping**: Server-side via yt-dlp Python backend

## Plugin Type
JavaScript Extension / Web-UI Plugin for Stash

## Key Features
1. **URL-based Content Download**
   - Support for multiple video/image hosting sites
   - Batch download support
   - Progress tracking and queue management
   - Server-side downloads via yt-dlp (bypasses CORS)
   - **Queue persistence**: Download queue survives navigation and page refresh via localStorage

2. **Metadata Extraction & Editing**
   - Automatic metadata extraction from sources via yt-dlp
   - Server-side scraping via Python backend (no CORS issues)
   - Extracts video URLs, thumbnails, performers, tags, studio, etc.
   - Preview scraped metadata before import (title, thumbnail, duration, quality)
   - **Editable metadata**: Title, performers, tags, studio - all editable before import
   - **Auto-creation**: Missing performers/tags/studios are auto-created in Stash
   - **Cover image**: Scraped thumbnail automatically set as scene cover

3. **Content Type Support**
   - **Video**: Via YtDlpScraper (primary), supports most video sites
   - **Image**: Via BooruScraper for booru sites (Rule34, Gelbooru, Danbooru)
   - **Gallery**: Multiple images from a single URL (booru pools, etc.)
   - Content type selector in URL input form

4. **Stash Integration**
   - GraphQL mutations for scene/image/gallery creation
   - Server-side scraping: `scrapeSceneURL`, `scrapeGalleryURL`
   - Plugin task execution: `runPluginTask`, `runPluginOperation`
   - **Post-Import Actions** - Choose how Stash handles metadata after import:
     - **None**: Just import the file, edit metadata in Stash later
     - **Identify**: Match via StashDB fingerprints + installed scrapers
     - **Scrape URL**: Use Stash's scrapers to populate performers/tags/studio
   - File organization according to Stash library structure

5. **User Experience**
   - Dark-themed interface matching Stash's UI
   - Real-time progress indicators
   - Error handling with actionable messages
   - Preview before finalizing (thumbnail, title, duration, quality)
   - **Retry button**: Failed items can be retried without re-adding to queue
   - **Navbar icon**: Download icon in Stash navbar for quick access

6. **Logging System**
   - **Activity Log**: UI component showing real-time operation logs
   - **Log Levels**: Configurable via dropdown (off, error, warning, info, debug)
   - **Console vs UI**: Debug logs go to browser console only; info/success/warning/error appear in both console and Activity Log
   - **Per-item logs**: Each queue item tracks its own operation history (viewable via Logs button)

7. **Proxy Support**
   - HTTP/SOCKS proxy support for bypassing geo-restrictions and IP blocks
   - SSL certificate verification automatically disabled when using proxy (handles self-signed certs)
   - Configured via Stash plugin settings
   - **SOCKS note**: Video downloads (yt-dlp) have built-in SOCKS support. Cover image fetching falls back to direct connection if PySocks isn't installed (image CDNs typically don't need proxies)

8. **Browser Extension**
   - Firefox extension for sending URLs to queue from any page
   - Context menu integration (right-click any link)
   - Real-time queue updates (no page refresh needed)
   - Auto-detects content type based on URL patterns
   - Connection status indicator
   - Located in `browser-extension/` directory

## External Dependencies (NOT Bundled)
These are provided by Stash via PluginApi and marked as external in build config:
- react
- react-dom
- react-router-dom
- @apollo/client

## Libraries Available via PluginApi
Stash provides these libraries through `window.PluginApi.libraries`:
- **ReactRouterDOM**: NavLink, useNavigate, etc.
- **Bootstrap**: React-Bootstrap components
- **Apollo**: Apollo Client for GraphQL
- **Intl**: React-Intl for internationalization
- **FontAwesomeSolid/Regular/Brands**: FontAwesome icons
- **Mousetrap**: Keyboard shortcuts
- **ReactSelect**: Advanced select components

## Styling Approach
- **Bootstrap Utility Classes**: Layout, spacing, colors
- **Stash Theme Colors**: Use inline styles with Stash's color palette
  - Card backgrounds: `#30404d`
  - Header/input backgrounds: `#243340`
  - Borders: `#394b59`
  - Muted text: `#8b9fad`
- **NO CSS-in-JS libraries**: MUI/Emotion removed to reduce bundle size and avoid context conflicts

## Development Workflow
1. Develop components in `src/`
2. Build with `npm run build` (outputs to `dist/`)
3. Plugin YAML points to `dist/stash-downloader.js`
4. Deploy via GitHub Pages for custom source installation
5. Test in Stash instance at http://localhost:9999

## Plugin Entry Point (src/index.tsx)
The plugin must:
1. Register routes via `PluginApi.register.route()`
2. Add navbar link via MutationObserver (NOT patch.after - it's unreliable)
3. NOT use contexts that require providers (ThemeProvider, etc.)

## Common Integration Issues
- **Navbar issues with patch.after**: Use MutationObserver pattern instead - injects button via DOM
- **React Error #31**: MainNavBar patch receives empty object `{}` - avoid using patch.after for navbar
- **Navbar button not showing**: Use `.navbar-buttons` selector (NOT `.navbar-nav.me-auto`)
- **GQL.query is not a function**: Use direct `fetch` to `/graphql` (NOT PluginApi.GQL)
- **IntlProvider errors**: Stash's own code may log these - not plugin's fault
- **Context errors**: Don't use hooks like `useThemeMode()` that require custom providers
- **CSS conflicts**: Stash provides Bootstrap; don't bundle another copy
- **CORS errors**: Use YtDlpScraper (server-side) instead of client-side fetch

## Finding CSS Selectors in Stash
When adding UI elements via DOM injection:
1. Use browser DevTools (F12) to inspect Stash's navbar
2. Look for stable class names used by community plugins (e.g., `.navbar-buttons`)
3. Reference community plugin examples: [Serechops Stash Plugins](https://github.com/Serechops/Serechops-Stash)
4. Test selectors in console: `document.querySelector('.navbar-buttons')`
5. Watch for class names that might change between Stash versions

## Troubleshooting

### yt-dlp Extraction Failures
If scraping fails with errors like "No video formats found" or "Failed to extract metadata", yt-dlp likely needs updating. Site extractors break frequently as sites change their structure.

**Update yt-dlp (standard install):**
```bash
pip install -U yt-dlp
# or
yt-dlp -U
```

**Update yt-dlp (Docker - Alpine-based Stash image):**

```bash
# Install/update yt-dlp (replace 'stash' with your container name)
docker exec -it stash pip install -U yt-dlp --break-system-packages

# Verify installation
docker exec -it stash yt-dlp --version
```

Note: Lost on container recreation. For persistence, use custom Dockerfile with `RUN pip install -U yt-dlp --break-system-packages`.

### Common Site-Specific Issues
- **XHamster**: Extractor updates frequently needed (check [yt-dlp issues](https://github.com/yt-dlp/yt-dlp/issues))
- **Sites behind geo-blocks**: Configure HTTP/SOCKS proxy in plugin settings
- **Rate limiting**: Some sites block rapid requests; add delays between downloads

## Future Enhancement Considerations
- Plugin architecture supports adding new source scrapers
- Extensible metadata mapping system
- Settings-driven configuration (no code changes needed)
- Hook system for custom workflows
- Export/import of download templates
