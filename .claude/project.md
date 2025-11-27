# Stash Downloader Plugin

## Overview
A React-based web-UI plugin for Stash that enables downloading images and videos from external sources with automatic metadata extraction, tagging, and organization.

## Purpose
Streamline the process of importing content into Stash by:
- Downloading content from URLs
- Extracting and mapping metadata automatically
- Managing performers, tags, and studios
- Creating properly organized Stash entries via GraphQL API

## Technology Stack
- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite (IIFE bundle format for Stash plugins)
- **Styling**: Bootstrap utility classes (provided by Stash via PluginApi)
- **API**: GraphQL via Apollo Client (provided by Stash)
- **State Management**: React Context + Hooks
- **Plugin API**: Stash PluginApi (window.PluginApi)
- **Backend**: Python scripts with yt-dlp for server-side downloads
- **Scraping**: Server-side via yt-dlp Python backend (Stash), client-side with CORS proxy (test-app)

## Plugin Type
JavaScript Extension / Web-UI Plugin for Stash

## Key Features
1. **URL-based Content Download**
   - Support for multiple video/image hosting sites
   - Batch download support
   - Progress tracking and queue management
   - Server-side downloads via yt-dlp (bypasses CORS)

2. **Metadata Intelligence**
   - Automatic metadata extraction from sources
   - Server-side scraping via yt-dlp Python backend (no CORS issues)
   - Extracts video URLs, thumbnails, descriptions, etc.
   - Smart matching against existing Stash data
   - Manual override and editing capabilities

3. **Stash Integration**
   - GraphQL mutations for scene/image/gallery creation
   - Server-side scraping: `scrapeSceneURL`, `scrapeGalleryURL`
   - Plugin task execution: `runPluginTask`, `runPluginOperation`
   - Performer, tag, and studio association
   - File organization according to Stash library structure

4. **User Experience**
   - Dark-themed interface matching Stash's UI
   - Real-time progress indicators
   - Error handling with actionable messages
   - Preview before finalizing

5. **Dual-Mode Architecture**
   - **Production (Stash)**: Server-side scraping/downloading, no CORS issues
   - **Development (test-app)**: Client-side with CORS proxy fallback
   - **Proxy Support**: HTTP/SOCKS proxy support in both modes (for bypassing geo-restrictions, IP blocks)
   - **SSL Handling**: Certificate verification automatically disabled when using proxy (handles self-signed certs)

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
- **CORS errors**: Use YtDlpScraper (server-side) instead of client-side fetch, or enable CORS proxy

## Finding CSS Selectors in Stash
When adding UI elements via DOM injection:
1. Use browser DevTools (F12) to inspect Stash's navbar
2. Look for stable class names used by community plugins (e.g., `.navbar-buttons`)
3. Reference community plugin examples: [Serechops Stash Plugins](https://github.com/Serechops/Serechops-Stash)
4. Test selectors in console: `document.querySelector('.navbar-buttons')`
5. Watch for class names that might change between Stash versions

## Future Enhancement Considerations
- Plugin architecture supports adding new source scrapers
- Extensible metadata mapping system
- Settings-driven configuration (no code changes needed)
- Hook system for custom workflows
- Export/import of download templates
