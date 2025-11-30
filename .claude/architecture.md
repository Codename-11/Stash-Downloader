# Architecture & Design Decisions

## Plugin Architecture

### Integration Strategy
**Decision**: Combined approach using both route registration and component patching

**Rationale**:
- Route registration provides dedicated UI space for complex workflows
- Component patching enables contextual actions throughout Stash
- Flexibility for different user preferences

### Plugin Loading Pattern
```
Stash loads plugin JS →
Plugin registers with PluginApi →
PluginApi.register.route() adds routes →
PluginApi.patch.after() adds nav link →
User navigates to /downloader →
React components render
```

### Critical Plugin Entry Point Pattern
```typescript
// src/index.tsx - MUST follow this pattern

if (!window.PluginApi) {
  throw new Error('PluginApi not found');
}

const { React } = window.PluginApi;

// Register route
window.PluginApi.register.route('/downloader', (props) => {
  return React.createElement(DownloaderMain, props);
});

// Add navbar link via MutationObserver (NOT patch.after - that's unreliable)
// See "Navigation Integration" section for the MutationObserver implementation
addNavLinkViaMutationObserver();
```

## Module System

### Service Layer Pattern
All external interactions go through dedicated services:

**StashGraphQLService**
- Uses direct `fetch` to `/graphql` endpoint (community plugin pattern)
- **IMPORTANT**: Do NOT use `PluginApi.GQL.query()` - it doesn't exist
- Provides typed methods for all Stash operations
- Plugin settings: `getPluginSettings()` - queries `configuration { plugins }` (PluginConfigMap scalar)
- Server-side scraping: `scrapeSceneURL()`, `scrapeGalleryURL()`, `scrapeImageURL()`
- Plugin task execution: `runPluginTask()`, `runPluginOperation()`
- Job management: `stopJob()`
- Environment detection: `isStashEnvironment()`
- Handles authentication via localStorage API key

**GraphQL Request Pattern**:
```typescript
private async gqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return await response.json();
}
```

**Plugin Settings Query**:
```graphql
# PluginConfigMap is a SCALAR type - do NOT select subfields
query GetPluginSettings($include: [ID!]) {
  configuration {
    plugins(include: $include)  # Returns { "plugin-id": { setting: value, ... } }
  }
}
```
- `plugins` field returns `PluginConfigMap` scalar (pluginId → settings map)
- Do NOT try to query `plugin(id:)` or `findPlugin(id:)` - these don't exist
- Do NOT add subfields like `{ id name settings }` - it's a scalar

**DownloadService**
- Manages HTTP requests to external sources
- Implements queue with concurrency limits
- Progress tracking and cancellation support
- Server-side downloads via `downloadServerSide()` (uses Python backend)
- **CSP Bypass**: In Stash environment, all external URLs use server-side download to avoid Content Security Policy restrictions
- yt-dlp availability check via `checkServerYtDlp()`
- Temporary file handling

**MetadataService (ScraperRegistry)**
- Pluggable scraper architecture with priority ordering
- **ContentType support**: Scrapers declare supported content types (Video, Image, Gallery)
- **YtDlpScraper**: PRIMARY - Server-side yt-dlp via Python backend (extracts video URLs)
- **BooruScraper**: Image/gallery scraper for booru sites (Rule34, Gelbooru, Danbooru)
- **StashScraper**: FALLBACK - Uses Stash's built-in scraper API
- **GenericScraper**: LAST RESORT - URL parsing only
- **Re-scrape support**: `getAvailableScrapersForUrl()` and `scrapeWithScraper()` for manual scraper selection
- Common `IScrapedMetadata` interface

**Python Backend (scripts/download.py)**
- Server-side downloads using yt-dlp
- Quality selection (best, 1080p, 720p, 480p)
- Metadata extraction without downloading
- Invoked via Stash's `runPluginTask` and `runPluginOperation` mutations
- File-based result passing: saves results to `{pluginDir}/results/` for async retrieval
- Configurable download directory via `serverDownloadPath` setting (default: `/data/StashDownloader`)
- HTTP/HTTPS/SOCKS proxy support via `httpProxy` setting (for bypassing geo-restrictions, IP blocks, rate limits)
- SSL certificate verification disabled when using proxy (many proxies use self-signed certs or do SSL interception)
- Proxy URL format: `http://user:pass@host:port`, `https://user:pass@host:port`, `socks5://user:pass@host:port`, `socks5h://user:pass@host:port`

### PluginOutput Format (Critical for `runPluginOperation`)

**Stash Source References:**
- `pkg/plugin/common/msg.go` - Defines `PluginOutput` struct:
  ```go
  type PluginOutput struct {
      Error *string `json:"error"`
      Output interface{} `json:"output"`
  }
  ```
- `pkg/plugin/raw.go` - `getOutput()` function unmarshals stdout into `PluginOutput`
- GraphQL resolver extracts `PluginOutput.Output` and returns it directly as the result

**Required Format:**
Python scripts must output JSON matching this structure:
```json
{
  "error": "optional error message (string)",
  "output": { ... actual result data ... }
}
```

**Implementation:**
- Success case: `{"output": {"title": "...", "description": "...", ...}}`
- Error case: `{"error": "error message", "output": {...context...}}`
- Use `result_error` in Python code, then map to `error` field in output
- Stash's GraphQL resolver extracts the `output` field and returns it directly
- TypeScript receives the extracted data (not wrapped in `output` field)

### Data Flow
```
User Input →
Component Event Handler →
Service Method Call →
API Request (GraphQL/HTTP) →
Service Response Processing →
State Update →
Component Re-render
```

## State Architecture

### State Layers

1. **UI State** (Component-local)
   - Form inputs, modal visibility, loading indicators
   - Managed with `useState`, `useReducer`

2. **Application State** (Context)
   - Download queue and progress
   - User preferences and settings
   - Active downloads and notifications

3. **Server State** (Apollo Cache)
   - Stash data: performers, tags, studios
   - Scene/gallery metadata
   - Managed by Apollo Client (provided by Stash)

4. **Persistent State** (localStorage)
   - User preferences (download paths, auto-tag rules)
   - UI preferences (layout)
   - **Download queue**: Survives navigation and page refresh
   - Fallback to defaults if unavailable

### Context Structure
```typescript
DownloadContext
├── queue: DownloadItem[]
├── addToQueue: (item) => void
├── removeFromQueue: (id) => void
└── updateProgress: (id, progress) => void

SettingsContext
├── settings: PluginSettings
├── updateSettings: (partial) => void
└── resetToDefaults: () => void
```

## Styling Architecture

### Bootstrap Integration (Stash-Provided)
Stash provides Bootstrap via PluginApi. **DO NOT bundle Bootstrap**.

```typescript
// Access Bootstrap components if needed
const { Modal, Button } = window.PluginApi.libraries.Bootstrap;
```

### Stash Theme Colors
Use inline styles for Stash-specific colors not in Bootstrap:

```typescript
// Stash dark theme palette
const stashColors = {
  cardBg: '#30404d',
  headerBg: '#243340',
  inputBg: '#243340',
  border: '#394b59',
  mutedText: '#8b9fad',
  text: '#fff',
};
```

### Component Styling Pattern
```tsx
// Card with Stash dark theme
<div className="card text-light" style={{ backgroundColor: '#30404d' }}>
  <div className="card-header" style={{ backgroundColor: '#243340' }}>
    Header
  </div>
  <div className="card-body">
    <input
      className="form-control text-light"
      style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
    />
  </div>
</div>
```

### What NOT to Do
- Don't bundle MUI, Emotion, or styled-components
- Don't use custom ThemeProvider that requires React context
- Don't import Bootstrap CSS (Stash provides it)
- Don't use `bg-secondary` (too light for Stash theme)

## Component Architecture

### Component Hierarchy
```
DownloaderPlugin (Route Container)
├── URLInputForm
├── BatchImport
├── QueueStats
├── DownloadQueue
│   └── QueueItem (repeat)
├── LogViewer
├── EditWorkflowPage (when editing)
│   ├── MetadataEditorForm
│   │   ├── PerformerSelector
│   │   ├── TagSelector
│   │   └── StudioSelector
│   └── ActionButtons
└── Modals (InfoModal, ItemLogModal, etc.)
```

### Component Types

**Container Components**
- Connect to context and services
- Handle business logic
- Pass data and callbacks to presentational components

**Presentational Components**
- Receive data via props
- Emit events via callbacks
- No direct service/context access
- Highly reusable

**Hook Components**
- Custom hooks for shared logic
- Example: `useDownloadQueue`, `useStashData`, `useMetadataMapping`

## API Design

### GraphQL Interaction Pattern

**Query Strategy**:
- Use fragments for reusable field sets
- Implement pagination for large datasets
- Cache aggressively, invalidate selectively

**Mutation Strategy**:
- Optimistic updates for better UX
- Error rollback on failure
- Batch mutations where possible

**Example Service Method**:
```typescript
async createScene(data: SceneCreateInput): Promise<Scene> {
  const mutation = gql`
    mutation CreateScene($input: SceneCreateInput!) {
      sceneCreate(input: $input) {
        ...SceneFragment
      }
    }
  `;

  const result = await this.client.mutate({ mutation, variables: { input: data } });
  return result.data.sceneCreate;
}
```

## Extensibility Design

### Scraper Plugin System
```typescript
interface IMetadataScraper {
  name: string;
  supportedDomains: string[];
  contentTypes: ContentType[];  // Video, Image, Gallery
  canHandle(url: string): boolean;
  scrape(url: string): Promise<IScrapedMetadata>;
}

// Scrapers registered in priority order
class ScraperRegistry {
  constructor() {
    this.register(new YtDlpScraper());    // PRIMARY: Video via yt-dlp
    this.register(new BooruScraper());    // Image/Gallery for booru sites
    this.register(new StashScraper());    // FALLBACK: Stash's built-in scraper
    // GenericScraper is always last resort
  }

  // Get available scrapers for manual re-scrape
  getAvailableScrapersForUrl(url: string, contentType?: ContentType): ScraperInfo[];

  // Scrape with specific scraper (for re-scrape feature)
  async scrapeWithScraper(url: string, scraperName: string): Promise<IScrapedMetadata>;
}
```

### Scraper Fallback Chain

1. **YtDlpScraper** - PRIMARY for Video: Server-side yt-dlp via Python backend
   - Uses `runPluginTask` to extract metadata (saves to temp file)
   - Uses `runPluginOperation` to read result from temp file
   - Supports HTTP/SOCKS proxy via `httpProxy` setting (passed to yt-dlp via `--proxy` flag)
   - Extracts best quality video URL from formats array or top-level URL
2. **BooruScraper** - PRIMARY for Image/Gallery: Booru site API scraper
   - Supports Rule34, Gelbooru, Danbooru, and other booru sites
   - Extracts tags, source URLs, and high-resolution images
   - Parses booru tag categories (artist, character, copyright, general)
3. **StashScraper** - FALLBACK: Uses Stash's built-in scraper API
4. **GenericScraper** - LAST RESORT: Extracts filename from URL

If a scraper throws an error, the registry tries the next one.

### Settings-Driven Configuration
- Scrapers can be enabled/disabled via settings
- Metadata mapping rules configurable by user
- No code changes needed for common customizations

## Error Handling Strategy

### Error Categories

1. **Network Errors**: Retryable with exponential backoff
2. **Validation Errors**: Show to user immediately
3. **GraphQL Errors**: Parse and present actionable messages
4. **Unexpected Errors**: Catch with error boundary, log, show generic message

### Common Plugin Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Navbar items disappear | patch.after receives empty/null output | Use MutationObserver pattern instead |
| React Error #31 | patch.after returns `{}` | Avoid patch.after for navbar; use DOM injection |
| `this.gql.query is not a function` | PluginApi.GQL is not Apollo Client | Use direct fetch to `/graphql` (see GraphQL pattern above) |
| Navbar button not showing | Wrong CSS selector | Use `.navbar-buttons` not `.navbar-nav.me-auto` |
| IntlProvider error | Stash internal code | Ignore - not plugin's fault |
| useThemeMode error | Using context outside provider | Don't use custom contexts in plugin |
| Cannot read 'NavLink' | PluginApi not ready | Check `PluginApi.libraries.ReactRouterDOM` |
| CORS errors (scraping) | Browser security restrictions | Use `YtDlpScraper` (server-side) |
| Python exec fails | `interface: js` breaks subprocess | Use `interface: raw` (still works with `ui.javascript`) |
| `runPluginOperation` returns null | Python script output doesn't match PluginOutput format | Output must be `{error?: string, output?: {...data...}}` - Stash extracts `output` field and returns it directly |
| `exit status 1` from Python | Python syntax error or crash | Run `python -m py_compile scripts/download.py` to check syntax |
| Plugin settings query fails | Wrong GraphQL query structure | Use `configuration { plugins }` - PluginConfigMap is a scalar, not an object type |

## Performance Optimizations

### Bundle Size
- External dependencies (React, Apollo) not bundled
- Bootstrap provided by Stash - not bundled
- Tree-shaking enabled in production build
- Target: <150KB bundle size

### Runtime Performance
- Virtual scrolling for large download queues
- Debounced search and filters
- Memoized selectors and computed values
- Lazy loading of metadata previews

### Network Optimization
- Parallel downloads with concurrency limit (default: 3)
- Request deduplication for metadata fetching
- Apollo cache prevents redundant GraphQL queries

## Build & Deployment

### Build Configuration
- **Format**: IIFE (Immediately Invoked Function Expression)
- **External**: react, react-dom, react-router-dom, @apollo/client
- **Output**: Single `dist/stash-downloader.js` file
- **Source Maps**: Disabled in production

### Vite Config Key Settings
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
url: https://github.com/user/repo

# Python backend for server-side downloads
# Pattern from PythonDepManager: interface: raw + {pluginDir}
exec:
  - python
  - "{pluginDir}/scripts/download.py"

tasks:
  - name: Extract Metadata
    description: Extract metadata without downloading
    defaultArgs:
      mode: extract_metadata  # Note: Use 'mode' not 'task' (community plugin pattern)

ui:
  javascript:
    - dist/stash-downloader.js

# IMPORTANT: Use "raw" not "js" for Python subprocess execution
# "raw" still works with ui.javascript for UI plugins
interface: raw
```

**Manifest Gotchas:**
- `default` field NOT supported (causes parse errors)
- `enum` field NOT supported (put options in description)
- Must use `ui.javascript` not root-level `js`
- `interface: raw` required for Python exec (NOT `interface: js`)
- `exec` defines the Python script for server-side tasks
- `tasks` defines available plugin operations (must match Python task handlers)

### Version Management
- Single source of truth in `package.json`
- GitHub Actions reads version and publishes
- Stash detects updates by comparing versions
- Format: `MAJOR.MINOR.PATCH` (semver)

## GitHub Pages Deployment

### Required Files
1. `.github/workflows/publish.yml` - GitHub Actions workflow
2. `build_site.sh` - Local build script (optional, for testing)

### GitHub Pages Configuration
1. Go to repo **Settings → Pages**
2. Under "Build and deployment"
3. Select **Source: GitHub Actions** (not "Deploy from a branch")
4. Workflow deploys to `https://username.github.io/repo-name/index.yml`

### Workflow Key Steps
```yaml
- name: Build plugin
  run: npm run build

- name: Create ZIP package
  run: |
    mkdir -p _site/stash-downloader
    cp -r dist _site/stash-downloader/
    cp stash-downloader.yml _site/stash-downloader/
    cd _site && zip -r stash-downloader.zip stash-downloader/
    SHA256=$(sha256sum stash-downloader.zip | cut -d' ' -f1)

- name: Generate index.yml
  run: |
    CURRENT_DATETIME=$(date +'%Y-%m-%d %H:%M:%S')
    cat > _site/index.yml << EOF
    - id: stash-downloader
      name: Stash Downloader
      version: ${VERSION}
      date: ${CURRENT_DATETIME}
      path: stash-downloader.zip
      sha256: ${SHA256}
      description: Download and import content
      url: https://github.com/user/repo
    EOF

- name: Deploy to GitHub Pages
  uses: actions/deploy-pages@v4
```

### Required Permissions
```yaml
permissions:
  contents: write
  pages: write
  id-token: write
```

## Plugin Repository Index Format

### Required Structure (index.yml)
**MUST be a flat YAML array** at root level:

```yaml
- id: stash-downloader
  name: Stash Downloader
  version: 0.1.0
  date: 2025-11-24 14:30:45  # MUST include time component
  path: stash-downloader.zip
  sha256: abc123...def456    # 64-char hash of ZIP
  description: Plugin description
  url: https://github.com/user/repo
```

### Critical Format Requirements

| Field | Format | Notes |
|-------|--------|-------|
| `date` | `YYYY-MM-DD HH:MM:SS` | **Must include time** - Go's time.Parse requires it |
| `path` | `filename.zip` | Must be ZIP file, not directory |
| `sha256` | 64-char hex | Hash of the ZIP file |
| Root | Array `- id:` | NOT nested under `sources:` or `plugins:` |

### Common Index Issues

**"parsing time ... cannot parse '' as '15'"**
- Cause: Date missing time component
- Fix: Use `date +'%Y-%m-%d %H:%M:%S'`

**"cannot unmarshal !!map into []pkg.RemotePackage"**
- Cause: Nested structure instead of flat array
- Fix: Remove `version:` and `sources:` wrappers

**"failed to get package file: 404 Not Found"**
- Cause: Path points to directory, not ZIP
- Fix: Package as ZIP with correct path and sha256

**"$(date +%Y-%m-%d)" literal in output**
- Cause: Heredoc uses `'EOF'` (quoted) preventing expansion
- Fix: Use unquoted `EOF` and store date in variable first

## Adding Plugin to Stash

### As Custom Source (Recommended)
1. Stash → **Settings → Plugins → Available Plugins**
2. Click **"Add Source"**
3. Enter: `https://username.github.io/repo-name/index.yml`
4. Click **"Add"**
5. Find plugin in list → Click **"Install"**

### Manual Installation
1. Copy plugin folder to `~/.stash/plugins/plugin-name/`
2. Stash → **Settings → Plugins**
3. Toggle plugin **ON**
4. Click **"Reload Plugins"** if needed

## Navigation Integration

### Adding Nav Button (MutationObserver Pattern)
The `patch.after('MainNavBar.MenuItems')` approach is unreliable - it often receives empty/null output causing React Error #31. Use MutationObserver to inject the button via DOM instead.

**IMPORTANT**: Use `.navbar-buttons` selector (not `.navbar-nav.me-auto`). This is the container for utility buttons on the right side of the navbar, used by community plugins.

```typescript
function addNavButtonViaMutationObserver() {
  const NAV_BUTTON_ID = 'stash-downloader-nav-button';

  function injectNavButton() {
    if (document.getElementById(NAV_BUTTON_ID)) return true;

    // Use .navbar-buttons selector (community plugin pattern)
    const navbarButtons = document.querySelector('.navbar-buttons');
    if (!navbarButtons) return false;

    const navButton = document.createElement('button');
    navButton.id = NAV_BUTTON_ID;
    navButton.className = 'btn nav-link';
    navButton.type = 'button';
    navButton.textContent = 'Downloader';
    navButton.title = 'Open Stash Downloader';

    // Use history API for React Router navigation
    navButton.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({}, '', '/plugin/stash-downloader');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    navbarButtons.insertBefore(navButton, navbarButtons.firstChild);
    return true;
  }

  if (injectNavButton()) return;

  // Wait for navbar to appear
  const observer = new MutationObserver((_mutations, obs) => {
    if (injectNavButton()) obs.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 30000);
}
```

### Route Registration
```typescript
window.PluginApi.register.route('/downloader', (props) => {
  return React.createElement(DownloaderMain, props);
});
```
