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

// Patch navbar - MUST handle edge cases
window.PluginApi.patch.after('MainNavBar.MenuItems', (_props, output) => {
  const { NavLink } = window.PluginApi.libraries.ReactRouterDOM || {};
  if (!NavLink) return output;

  const link = React.createElement(NavLink, {
    to: '/downloader',
    className: 'nav-link',
    key: 'downloader-nav'
  }, 'Downloader');

  // CRITICAL: Handle empty object case (causes React Error #31)
  if (Array.isArray(output)) {
    return [...output, link];
  }
  if (output == null || (typeof output === 'object' && Object.keys(output).length === 0)) {
    return [link];  // Return array, not empty object
  }
  return [output, link];
});
```

## Module System

### Service Layer Pattern
All external interactions go through dedicated services:

**StashGraphQLService**
- Wraps PluginApi.GQL and PluginApi.StashService
- Provides typed methods for all Stash operations
- Handles authentication and error mapping
- Centralizes retry logic and error handling

**DownloadService**
- Manages HTTP requests to external sources
- Implements queue with concurrency limits
- Progress tracking and cancellation support
- Temporary file handling

**MetadataService**
- Pluggable scraper architecture
- Each source has dedicated scraper module
- Common metadata mapping interface
- Extensible via configuration

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
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapedMetadata>;
}

// New scrapers register themselves
ScraperRegistry.register(new TwitterScraper());
ScraperRegistry.register(new RedditScraper());
```

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
| React Error #31 | Returning `{}` from patch | Check for empty object, return `[link]` |
| IntlProvider error | Stash internal code | Ignore - not plugin's fault |
| useThemeMode error | Using context outside provider | Don't use custom contexts in plugin |
| Cannot read 'NavLink' | PluginApi not ready | Check `PluginApi.libraries.ReactRouterDOM` |

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

# Settings - only STRING, NUMBER, BOOLEAN supported
# NO default values, NO enum fields
settings:
  downloadPath:
    displayName: Download Path
    description: Where to save downloaded files
    type: STRING

ui:
  javascript:
    - dist/stash-downloader.js

interface: js  # Must be "js" for JavaScript plugins
```

**Manifest Gotchas:**
- `default` field NOT supported (causes parse errors)
- `enum` field NOT supported (put options in description)
- Must use `ui.javascript` not root-level `js`
- `interface: js` required for JS plugins

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

### Adding Nav Link
```typescript
window.PluginApi.patch.after('MainNavBar.MenuItems', (_props, output) => {
  const { NavLink } = window.PluginApi.libraries.ReactRouterDOM || {};
  if (!NavLink) return output;

  const link = React.createElement(NavLink, {
    to: '/downloader',
    className: 'nav-link',
    key: 'downloader-nav'
  }, 'Downloader');

  // CRITICAL: Handle empty object (causes React Error #31)
  if (Array.isArray(output)) return [...output, link];
  if (!output || Object.keys(output).length === 0) return [link];
  return [output, link];
});
```

### Route Registration
```typescript
window.PluginApi.register.route('/downloader', (props) => {
  return React.createElement(DownloaderMain, props);
});
```
