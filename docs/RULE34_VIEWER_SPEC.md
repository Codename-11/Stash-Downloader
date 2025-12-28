# Rule34 Viewer Plugin Specification

A Stash plugin for browsing, searching, and viewing Rule34 content directly within the Stash UI, with seamless integration to Stash-Downloader for importing content.

## Overview

### Purpose
- Browse Rule34.xxx or other booru sites including Rule34video.com, Rule34hentai.net, etc. content without leaving Stash
- Search by tags, rating, artists, characters, and copyrights
- Preview images/videos with metadata
- Send items to Stash-Downloader queue for import with metadata

### Target Users
- Stash users who want to discover and import booru content
- Users who prefer a unified interface over browser-hopping

---

## Monorepo Architecture

Both plugins live in the same repository, sharing infrastructure while remaining independent.

### Repository Structure
```
Stash-Downloader/                      # Renamed to "stash-plugins" eventually?
├── plugins/
│   ├── stash-downloader/              # EXISTING plugin (relocated)
│   │   ├── src/
│   │   ├── scripts/                   # Python backend
│   │   ├── stash-downloader.yml
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── rule34-viewer/                 # NEW plugin
│       ├── src/
│       ├── scripts/                   # Python backend (CORS proxy)
│       ├── rule34-viewer.yml
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── shared/                            # Shared code between plugins
│   ├── types/                         # Common TypeScript types
│   ├── utils/                         # Shared utilities
│   ├── components/                    # Shared React components (optional)
│   └── python/                        # Shared Python utilities
│
├── browser-extension/                 # EXISTING (unchanged)
│
├── docs/                              # Documentation
│   ├── RULE34_VIEWER_SPEC.md
│   └── ...
│
├── .github/workflows/
│   └── publish.yml                    # Builds BOTH plugins, single deploy
│
├── package.json                       # Root workspace config
├── TODO.md
├── CLAUDE.md
└── README.md
```

### Workspace Configuration (Root package.json)
```json
{
  "name": "stash-plugins",
  "private": true,
  "workspaces": [
    "plugins/*",
    "shared"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "build:downloader": "npm run build -w plugins/stash-downloader",
    "build:viewer": "npm run build -w plugins/rule34-viewer",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  }
}
```

### Shared Code Strategy
| Shared Item | Location | Usage |
|-------------|----------|-------|
| TypeScript types | `shared/types/` | Import as `@shared/types` |
| Stash theme colors | `shared/utils/theme.ts` | Both plugins |
| Python HTTP utils | `shared/python/http_utils.py` | Proxy, requests |
| Booru adapters | `shared/utils/booru/` | Both plugins |

### Plugin Index (index.yml)
Single `index.yml` serves both plugins from same source:
```yaml
- id: stash-downloader
  name: Stash Downloader
  version: 0.5.0
  date: 2025-01-15 10:30:00
  path: stash-downloader.zip
  sha256: abc123...
  description: Download and import content with metadata
  url: https://github.com/Codename-11/Stash-Downloader

- id: rule34-viewer
  name: Rule34 Viewer
  version: 0.1.0
  date: 2025-01-20 14:00:00
  path: rule34-viewer.zip
  sha256: def456...
  description: Browse and search Rule34 content
  url: https://github.com/Codename-11/Stash-Downloader
```

### Independent Versioning
Each plugin has its own version in its `package.json`:
- `plugins/stash-downloader/package.json` → `"version": "0.5.0"`
- `plugins/rule34-viewer/package.json` → `"version": "0.1.0"`

Tags can be prefixed: `downloader-v0.5.0`, `viewer-v0.1.0`

---

## Technology Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend | React 18 + TypeScript | Same as Stash-Downloader |
| Build | Vite (IIFE bundle) | Per-plugin config |
| Styling | Bootstrap utilities | Stash-provided, dark theme |
| State | React Context + Hooks | Local state for UI |
| API | Rule34 DAPI (JSON) | Via Python CORS proxy |
| Integration | Custom Events | Same pattern as browser extension |

### External Dependencies (NOT Bundled)
Provided by Stash via PluginApi:
- react, react-dom, react-router-dom
- @apollo/client (for Stash queries if needed)
- Bootstrap, FontAwesome

---

## Core Features

### 1. Browse & Search

**Tag Search**
```
Input: "cat_ears blue_hair -male"
API: https://rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=cat_ears+blue_hair+-male&limit=40&pid=0
```

- Multi-tag search with AND logic
- Tag exclusion with `-` prefix
- Tag autocomplete (optional, requires tag API)
- Recent searches history (localStorage)
- Saved searches/favorites

**Search Filters**
| Filter | API Parameter | Values |
|--------|---------------|--------|
| Rating | `rating:` | safe, questionable, explicit |
| Score | `score:>=N` | Minimum score threshold |
| Sort | `sort:` | score, id, updated (default: id:desc) |
| Type | `file_type:` | image, video, gif |

### 2. Results Grid

**Grid View**
- Responsive thumbnail grid (3-6 columns based on viewport)
- Lazy loading with intersection observer
- Infinite scroll pagination (or page buttons)
- Thumbnail size toggle (small/medium/large)

**Per-Item Display**
- Thumbnail preview (sample_url for speed)
- Video indicator badge (for webm/mp4)
- Score badge
- Rating indicator (color-coded)
- Quick actions on hover:
  - View full size
  - Send to Downloader
  - Open on Rule34

### 3. Detail View (Modal or Sidebar)

**Content Display**
- Full-resolution image (file_url)
- Video player for webm/mp4 (native HTML5)
- Pan/zoom for large images
- Keyboard navigation (left/right arrows)

**Metadata Panel**
| Field | Source |
|-------|--------|
| Post ID | `id` |
| Score | `score` |
| Rating | `rating` (safe/questionable/explicit) |
| Source | `source` (original artist link) |
| Dimensions | `width` x `height` |
| File size | `file_size` (if available) |
| Tags | Grouped by type (when available) |

**Actions**
- "Add to Queue" - Send to Stash-Downloader
- "Open Original" - External link to Rule34
- "Copy URL" - Copy file_url to clipboard
- "Find Similar" - Search related tags

### 4. Tag Browser

**Tag Categories** (when type data available via Danbooru-style API)
| Category | Color | Example |
|----------|-------|---------|
| Artist | Orange | `john_doe` |
| Character | Green | `hatsune_miku` |
| Copyright | Purple | `vocaloid` |
| General | Blue | `blue_hair` |
| Meta | Red | `animated` |

Note: Rule34's basic API doesn't include tag types. Options:
1. Parse known artist/character tags from a maintained list
2. Use autocomplete endpoint for type hints
3. Accept all tags as "general" (simpler)

**Tag Navigation**
- Click tag to search
- Right-click to add/exclude from current search
- Tag wiki/count display (if API supports)

### 5. Stash-Downloader Integration

**Communication Pattern**
Uses same mechanism as browser extension:

```typescript
// Send URL to Stash-Downloader queue
function sendToDownloader(post: Rule34Post) {
  const url = `https://rule34.xxx/index.php?page=post&s=view&id=${post.id}`;
  const detail = {
    url,
    contentType: post.isVideo ? 'video' : 'image',
    options: {}
  };

  // Dispatch event (both stable and dev)
  window.dispatchEvent(new CustomEvent('stash-downloader-add-url', { detail }));
  window.dispatchEvent(new CustomEvent('stash-downloader-dev-add-url', { detail }));

  // localStorage fallback
  const queueItem = { url, contentType: detail.contentType, timestamp: Date.now() };
  const existing = JSON.parse(localStorage.getItem('stash-downloader-external-queue') || '[]');
  existing.push(queueItem);
  localStorage.setItem('stash-downloader-external-queue', JSON.stringify(existing));
}
```

**Bulk Actions**
- "Select All" checkbox
- "Add Selected to Queue" button
- Selection persists across pagination

---

## UI/UX Design

### Layout

```
+------------------------------------------------------------------+
| [Rule34 Viewer]                                    [Settings] [?] |
+------------------------------------------------------------------+
| Search: [_________________________] [Search]  [Filters v]        |
| Tags: cat_ears(x) blue_hair(x) -male(x)        [Clear All]       |
+------------------------------------------------------------------+
| Sort: [Score v]  Rating: [All v]  Type: [All v]   Page 1 of 50  |
+------------------------------------------------------------------+
|  +-------+  +-------+  +-------+  +-------+  +-------+           |
|  |       |  |       |  |  [>]  |  |       |  |       |           |
|  |  IMG  |  |  IMG  |  | VIDEO |  |  IMG  |  |  IMG  |           |
|  |       |  |       |  |       |  |       |  |       |           |
|  | [ ] 42|  | [x] 89|  | [ ] 156|  | [x] 23|  | [ ] 67|           |
|  +-------+  +-------+  +-------+  +-------+  +-------+           |
|                           ...                                     |
+------------------------------------------------------------------+
| Selected: 2 items                    [Add to Downloader Queue]   |
+------------------------------------------------------------------+
```

### Stash Theme Colors
```typescript
const stashColors = {
  cardBg: '#30404d',
  headerBg: '#243340',
  inputBg: '#243340',
  border: '#394b59',
  mutedText: '#8b9fad',
  text: '#fff',
  // Rating colors
  safe: '#28a745',
  questionable: '#ffc107',
  explicit: '#dc3545',
};
```

### Responsive Breakpoints
| Viewport | Columns | Thumbnail Size |
|----------|---------|----------------|
| < 576px | 2 | 150px |
| 576-768px | 3 | 180px |
| 768-992px | 4 | 200px |
| 992-1200px | 5 | 220px |
| > 1200px | 6 | 240px |

---

## API Reference

### Rule34 DAPI Endpoints

**Search Posts**
```
GET https://rule34.xxx/index.php?page=dapi&s=post&q=index&json=1
  &tags={space-separated tags}
  &limit={1-100, default 40}
  &pid={page number, 0-indexed}
  &id={post ID for single post}
```

**Response Format**
```typescript
interface Rule34Post {
  id: number;
  tags: string;           // Space-separated
  file_url: string;       // Full resolution
  preview_url: string;    // Small thumbnail
  sample_url: string;     // Medium preview
  width: number;
  height: number;
  score: number;
  rating: 's' | 'q' | 'e';
  source: string;         // Original source URL
  owner: string;          // Uploader
  created_at: string;     // Upload date
  change: number;         // Last modified timestamp
}
```

**Tag Autocomplete** (optional feature)
```
GET https://rule34.xxx/index.php?page=dapi&s=tag&q=index&json=1
  &name_pattern={prefix}%
  &limit=10
```

### CORS Handling

Rule34 API has CORS restrictions. Options:

1. **CORS Proxy (User-configured)**
   - Same setting as Stash-Downloader
   - User runs local proxy (e.g., `cors-anywhere`)

2. **Server-side Proxy (Python backend)**
   - Add endpoint to Stash-Downloader's Python backend
   - Route: `runPluginOperation` with mode `fetch_url`

3. **Stash Proxy** (if available)
   - Check if Stash has a built-in proxy capability

Recommended: Option 2 (Python backend) for consistency with Stash-Downloader.

---

## Architecture

### Plugin Component Structure
```
plugins/rule34-viewer/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Thumbnail.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── TagBadge.tsx
│   │   │   └── RatingBadge.tsx
│   │   ├── browser/
│   │   │   ├── BrowserPage.tsx        # Main container
│   │   │   ├── SearchBar.tsx          # Tag search input
│   │   │   ├── FilterBar.tsx          # Rating/sort/type filters
│   │   │   ├── ResultsGrid.tsx        # Thumbnail grid
│   │   │   ├── PostCard.tsx           # Individual result card
│   │   │   └── PostDetailModal.tsx    # Full view modal
│   │   └── settings/
│   │       └── ViewerSettings.tsx
│   ├── services/
│   │   ├── Rule34ApiService.ts        # Search/fetch API
│   │   └── DownloaderBridge.ts        # Communication with Downloader
│   ├── contexts/
│   │   ├── BrowserContext.tsx         # Search state
│   │   └── SettingsContext.tsx        # Viewer settings
│   ├── hooks/
│   │   ├── useSearch.ts
│   │   ├── usePagination.ts
│   │   └── useSelection.ts
│   ├── types/
│   │   └── index.ts
│   └── index.tsx                      # Plugin entry point
├── scripts/
│   └── proxy.py                       # CORS proxy backend
├── rule34-viewer.yml                  # Plugin manifest
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Shared Code (from shared/)
```
shared/
├── types/
│   ├── stash.ts                       # Stash API types
│   └── booru.ts                       # Booru post types
├── utils/
│   ├── theme.ts                       # Stash color palette
│   ├── logger.ts                      # Logging utility
│   └── fetch.ts                       # Fetch with timeout
└── python/
    └── http_utils.py                  # Shared HTTP utilities
```

### State Management

```typescript
interface ViewerState {
  // Search
  query: string;
  tags: string[];
  excludedTags: string[];

  // Filters
  rating: 'all' | 'safe' | 'questionable' | 'explicit';
  sortBy: 'score' | 'id' | 'updated';
  fileType: 'all' | 'image' | 'video';

  // Results
  posts: Rule34Post[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;

  // Selection
  selectedIds: Set<number>;

  // UI
  thumbnailSize: 'small' | 'medium' | 'large';
  detailPost: Rule34Post | null;
}
```

### Service Layer

**Rule34ApiService**
```typescript
class Rule34ApiService {
  private baseUrl = 'https://rule34.xxx/index.php';

  // Search posts via Python backend proxy
  async searchPosts(params: SearchParams): Promise<Rule34Post[]> {
    const apiUrl = this.buildSearchUrl(params);
    // Use own plugin's Python backend for CORS proxy
    return await this.fetchViaProxy(apiUrl);
  }

  async getPost(id: number): Promise<Rule34Post>;
  async autocomplete(prefix: string): Promise<TagSuggestion[]>;

  private buildSearchUrl(params: SearchParams): string {
    const { tags, limit = 40, page = 0, rating, sort } = params;
    const queryParams = new URLSearchParams({
      page: 'dapi',
      s: 'post',
      q: 'index',
      json: '1',
      tags: tags.join(' '),
      limit: String(limit),
      pid: String(page),
    });
    return `${this.baseUrl}?${queryParams}`;
  }

  private async fetchViaProxy(url: string): Promise<Rule34Post[]> {
    // Use Stash's runPluginOperation to call our Python proxy
    const result = await gqlRequest(RUN_PLUGIN_OPERATION, {
      plugin_id: 'rule34-viewer',
      args: { mode: 'fetch_url', url }
    });
    return result.runPluginOperation.output;
  }
}
```

**DownloaderBridge** (Communication with Stash-Downloader)
```typescript
class DownloaderBridge {
  // Event names (same as browser extension)
  private readonly EVENTS = {
    stable: 'stash-downloader-add-url',
    dev: 'stash-downloader-dev-add-url',
  };

  private readonly STORAGE_KEYS = {
    stable: 'stash-downloader-external-queue',
    dev: 'stash-downloader-dev-external-queue',
  };

  /**
   * Send post to Stash-Downloader queue
   * Uses same event pattern as browser extension
   */
  sendToQueue(post: Rule34Post): void {
    const url = `https://rule34.xxx/index.php?page=post&s=view&id=${post.id}`;
    const contentType = this.isVideo(post) ? 'video' : 'image';

    const detail = { url, contentType, options: {} };

    // Dispatch to both stable and dev versions
    window.dispatchEvent(new CustomEvent(this.EVENTS.stable, { detail }));
    window.dispatchEvent(new CustomEvent(this.EVENTS.dev, { detail }));

    // localStorage fallback
    this.storeInLocalStorage(url, contentType);
  }

  /**
   * Send multiple posts to queue
   */
  sendBatchToQueue(posts: Rule34Post[]): void {
    posts.forEach(post => this.sendToQueue(post));
  }

  private isVideo(post: Rule34Post): boolean {
    const ext = post.file_url.split('.').pop()?.toLowerCase();
    return ['mp4', 'webm', 'mov'].includes(ext || '');
  }

  private storeInLocalStorage(url: string, contentType: string): void {
    const queueItem = { url, contentType, timestamp: Date.now() };

    for (const key of Object.values(this.STORAGE_KEYS)) {
      try {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(queueItem);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (e) {
        console.error(`Failed to store in ${key}`, e);
      }
    }
  }
}
```

---

## Plugin Manifest

```yaml
name: Rule34 Viewer
description: Browse and search Rule34 content within Stash
version: 0.1.0
url: https://github.com/user/stash-rule34-viewer

ui:
  javascript:
    - dist/rule34-viewer.js

# Optional: Python backend for CORS proxy
exec:
  - python
  - "{pluginDir}/scripts/proxy.py"

interface: raw

settings:
  - name: thumbnailSize
    displayName: Default Thumbnail Size
    description: Default size for result thumbnails
    type: string
    default: medium

  - name: postsPerPage
    displayName: Posts Per Page
    description: Number of posts to load per page (10-100)
    type: number
    default: 40

  - name: autoplay
    displayName: Autoplay Videos
    description: Automatically play videos in detail view
    type: boolean
    default: false

  - name: corsProxyUrl
    displayName: CORS Proxy URL
    description: URL of CORS proxy for API requests (leave empty to use Python backend)
    type: string
    default: ""
```

---

## Integration Points

### With Stash-Downloader

| Integration | Method | Notes |
|-------------|--------|-------|
| Add to Queue | Custom Events | Same pattern as browser extension |
| Queue Fallback | localStorage | For when Downloader page not active |
| Metadata | BooruScraper | Downloader already supports Rule34 |

Communication uses the same event/localStorage pattern as the browser extension - no changes needed to Stash-Downloader.

### With Stash

| Integration | Method | Notes |
|-------------|--------|-------|
| Route | `PluginApi.register.route` | `/plugin/rule34-viewer` |
| Navbar | MutationObserver injection | Same pattern as Downloader |
| Theme | Stash color palette | Import from `shared/utils/theme.ts` |
| Libraries | `PluginApi.libraries` | Bootstrap, FontAwesome, etc. |
| Python Backend | `runPluginOperation` | Own `fetch_url` mode for CORS |

### Python Backend (scripts/proxy.py)

```python
#!/usr/bin/env python3
"""
Rule34 Viewer - CORS Proxy Backend
Fetches external URLs server-side to bypass browser CORS restrictions.
"""

import json
import sys
import requests

def fetch_url(url: str, proxy: str = None) -> dict:
    """Fetch URL and return JSON response."""
    proxies = {'http': proxy, 'https': proxy} if proxy else None
    headers = {'User-Agent': 'Rule34Viewer/1.0'}

    try:
        response = requests.get(url, headers=headers, proxies=proxies, timeout=30)
        response.raise_for_status()
        return {'output': response.json()}
    except requests.RequestException as e:
        return {'error': str(e)}

def main():
    input_data = json.loads(sys.stdin.read())
    args = input_data.get('args', {})
    mode = args.get('mode')

    if mode == 'fetch_url':
        url = args.get('url')
        proxy = args.get('proxy')
        result = fetch_url(url, proxy)
    else:
        result = {'error': f'Unknown mode: {mode}'}

    print(json.dumps(result))

if __name__ == '__main__':
    main()
```

---

## Development Phases

### Phase 1: Core Browsing (MVP)
- [ ] Basic search with tag input
- [ ] Results grid with thumbnails
- [ ] Click to view full image
- [ ] "Add to Downloader" button
- [ ] Pagination

### Phase 2: Enhanced Search
- [ ] Tag exclusion (-)
- [ ] Score/rating filters
- [ ] Sort options
- [ ] Search history
- [ ] Tag autocomplete

### Phase 3: Detail View
- [ ] Modal/sidebar detail view
- [ ] Video playback
- [ ] Image pan/zoom
- [ ] Keyboard navigation
- [ ] Tag click-to-search

### Phase 4: Bulk Actions
- [ ] Multi-select checkboxes
- [ ] "Add selected to queue"
- [ ] Select all on page
- [ ] Selection count indicator

### Phase 5: Polish
- [ ] Saved searches
- [ ] Favorites/bookmarks (localStorage)
- [ ] Lazy loading optimization
- [ ] Error handling improvements
- [ ] Settings page

---

## Open Questions

1. ~~**Standalone plugin or integrated into Stash-Downloader?**~~
   - **DECIDED: Monorepo** - Separate plugin in same repo, shared `index.yml`

2. **CORS solution preference?**
   - User CORS proxy (requires user setup)
   - Python backend proxy (self-contained) ← **Recommended**
   - Both as options (most flexible)

3. **Tag type detection?**
   - Accept limitations of Rule34 API (no tag types) ← **Simplest for MVP**
   - Maintain local tag database (complex)
   - Use Danbooru API as secondary source for type info

4. **Video handling?**
   - Inline preview in grid (hover to play)
   - Only play in detail view ← **Recommended for MVP**
   - Download-only (no streaming preview)

5. **Additional booru support?**
   - Rule34 only (focused MVP) ← **Start here**
   - Gelbooru, Danbooru, SafeBooru (adapter pattern already exists in shared/)

---

## Monorepo Migration Plan

### Phase 0: Restructure Repository

Before building the new plugin, migrate to monorepo structure.

#### Migration Checklist

**Directory Structure**
- [ ] Create `plugins/stash-downloader/` directory
- [ ] Create `plugins/rule34-viewer/` directory (empty initially)
- [ ] Create `shared/{types,utils,python}/` directories

**Move Stash-Downloader Files**
- [ ] Move `src/` → `plugins/stash-downloader/src/`
- [ ] Move `scripts/` → `plugins/stash-downloader/scripts/`
- [ ] Move `stash-downloader.yml` → `plugins/stash-downloader/`
- [ ] Move `vite.config.ts` → `plugins/stash-downloader/`
- [ ] Move `tsconfig.json` → `plugins/stash-downloader/` (keep root tsconfig too)
- [ ] Move `.eslintrc.*` → `plugins/stash-downloader/` (or keep root + extends)
- [ ] Move `vitest.config.ts` → `plugins/stash-downloader/` (if exists)

**Keep at Root Level**
- [ ] `CLAUDE.md` - project instructions (update paths inside)
- [ ] `.claude/` - project documentation (update paths inside)
- [ ] `TODO.md` - task tracking
- [ ] `README.md` - update for monorepo
- [ ] `LICENSE`
- [ ] `.github/` - workflows (update paths)
- [ ] `browser-extension/` - unchanged
- [ ] `docs/` - documentation
- [ ] `.gitignore` - update patterns

**Create Root Configuration Files**
- [ ] `package.json` - workspace configuration
- [ ] `tsconfig.json` - base config that plugins extend
- [ ] `.eslintrc.js` - base config (optional)

**Update package.json**
- [ ] Create root `package.json` with workspaces config
- [ ] Update `plugins/stash-downloader/package.json`:
  - Change `name` to `@stash-plugins/stash-downloader`
  - Add reference to shared workspace
  - Update script paths

**Update Import Paths**
- [ ] Update all `@/` imports in stash-downloader to work with new structure
- [ ] Update `vite.config.ts` alias paths
- [ ] Update `tsconfig.json` paths

**Update CI/CD**
- [ ] Update `.github/workflows/publish.yml` (see CI/CD section)
- [ ] Update `.github/workflows/claude.yml` prompt for monorepo context
- [ ] Update issue templates with plugin selector

**Update Documentation**
- [ ] Update `CLAUDE.md` paths (`.claude/` refs, Quick Reference commands)
- [ ] Update `.claude/project.md` paths
- [ ] Update `.claude/architecture.md` paths
- [ ] Update `.claude/conventions.md` if needed
- [ ] Update `README.md` for monorepo structure

**Extract Shared Code** (can do incrementally)
- [ ] `shared/types/stash.ts` - Stash API types
- [ ] `shared/types/booru.ts` - Booru post types (from BooruScraper)
- [ ] `shared/utils/theme.ts` - Stash color palette
- [ ] `shared/utils/logger.ts` - Logger utility
- [ ] `shared/utils/fetch.ts` - fetchWithTimeout
- [ ] `shared/python/http_utils.py` - Shared HTTP utilities

#### Migration Commands

```bash
# 1. Create directory structure
mkdir -p plugins/stash-downloader
mkdir -p plugins/rule34-viewer
mkdir -p shared/{types,utils,python}

# 2. Move plugin files (use git mv to preserve history)
git mv src plugins/stash-downloader/
git mv scripts plugins/stash-downloader/
git mv stash-downloader.yml plugins/stash-downloader/
git mv vite.config.ts plugins/stash-downloader/
git mv vitest.config.ts plugins/stash-downloader/ 2>/dev/null || true

# 3. Copy (not move) config files that need both root + plugin versions
cp tsconfig.json plugins/stash-downloader/tsconfig.json
cp package.json plugins/stash-downloader/package.json

# 4. Create root workspace package.json
cat > package.json << 'EOF'
{
  "name": "stash-plugins",
  "private": true,
  "workspaces": ["plugins/*", "shared"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "type-check": "npm run type-check --workspaces --if-present"
  }
}
EOF

# 5. Update plugin package.json name
cd plugins/stash-downloader
npm pkg set name="@stash-plugins/stash-downloader"
cd ../..

# 6. Install dependencies (creates proper workspace links)
npm install

# 7. Verify build still works
npm run build -w plugins/stash-downloader
```

### CI/CD Changes Required

The existing `publish.yml` workflow needs significant updates for monorepo support.

#### Current Workflow Structure
```
test → deploy-stable (tags) → release
     → deploy-dev (dev branch)
```

#### Updated Workflow Structure
```
test → deploy-stable (tags) → release (both plugins)
     → deploy-dev (dev branch, both plugins)
```

#### Key Path Changes

| Current Path | New Path |
|--------------|----------|
| `src/` | `plugins/stash-downloader/src/` |
| `scripts/` | `plugins/stash-downloader/scripts/` |
| `stash-downloader.yml` | `plugins/stash-downloader/stash-downloader.yml` |
| `package.json` | `plugins/stash-downloader/package.json` (+ root) |
| `vite.config.ts` | `plugins/stash-downloader/vite.config.ts` |
| `tsconfig.json` | `plugins/stash-downloader/tsconfig.json` (+ root) |

#### Updated publish.yml

```yaml
name: CI/CD

on:
  push:
    branches: [dev]
    tags:
      - 'v*'           # Both plugins release
      - 'downloader-*' # Downloader only
      - 'viewer-*'     # Viewer only
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      deploy_dev:
        description: 'Deploy as dev build'
        type: boolean
        default: false

jobs:
  # ============================================================================
  # TEST JOB - Updated for monorepo
  # ============================================================================
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci  # Root install handles workspaces

      - name: Type check all workspaces
        run: npm run type-check --workspaces --if-present

      - name: Lint all workspaces
        run: npm run lint --workspaces --if-present

      - name: Test all workspaces
        run: npm run test --workspaces --if-present -- --run

      - name: Build all plugins
        run: npm run build --workspaces

  # ============================================================================
  # DEPLOY STABLE - Builds and deploys both plugins
  # ============================================================================
  deploy-stable:
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build --workspaces

      - name: Get versions
        id: versions
        run: |
          DOWNLOADER_VERSION=$(node -p "require('./plugins/stash-downloader/package.json').version")
          VIEWER_VERSION=$(node -p "require('./plugins/rule34-viewer/package.json').version")
          echo "downloader_version=${DOWNLOADER_VERSION}" >> $GITHUB_OUTPUT
          echo "viewer_version=${VIEWER_VERSION}" >> $GITHUB_OUTPUT

      - name: Package stash-downloader
        run: |
          mkdir -p _site _package/downloader
          cd plugins/stash-downloader
          cp -r dist ../../_package/downloader/
          cp -r scripts ../../_package/downloader/
          cp stash-downloader.yml ../../_package/downloader/
          cp README.md LICENSE ../../_package/downloader/ 2>/dev/null || true
          cd ../../_package/downloader
          zip -r ../../_site/stash-downloader.zip .

      - name: Package rule34-viewer
        run: |
          mkdir -p _package/viewer
          cd plugins/rule34-viewer
          cp -r dist ../../_package/viewer/
          cp -r scripts ../../_package/viewer/
          cp rule34-viewer.yml ../../_package/viewer/
          cp README.md LICENSE ../../_package/viewer/ 2>/dev/null || true
          cd ../../_package/viewer
          zip -r ../../_site/rule34-viewer.zip .

      - name: Fetch existing dev builds
        continue-on-error: true
        run: |
          PAGES_URL="https://codename-11.github.io/Stash-Downloader"
          curl -fsSL "${PAGES_URL}/stash-downloader-dev.zip" -o _site/stash-downloader-dev.zip || true
          curl -fsSL "${PAGES_URL}/rule34-viewer-dev.zip" -o _site/rule34-viewer-dev.zip || true
          curl -fsSL "${PAGES_URL}/index.yml" -o /tmp/existing-index.yml || true

      - name: Generate combined index.yml
        run: |
          DATETIME=$(TZ='America/New_York' date +'%Y-%m-%d %H:%M:%S')
          DL_SHA=$(sha256sum _site/stash-downloader.zip | awk '{print $1}')
          VW_SHA=$(sha256sum _site/rule34-viewer.zip | awk '{print $1}')

          cat > _site/index.yml << EOF
          - id: stash-downloader
            name: Stash Downloader
            version: ${{ steps.versions.outputs.downloader_version }}
            date: ${DATETIME}
            path: stash-downloader.zip
            sha256: ${DL_SHA}
            description: Download images and videos from URLs with automatic metadata extraction
            url: ${{ github.server_url }}/${{ github.repository }}

          - id: rule34-viewer
            name: Rule34 Viewer
            version: ${{ steps.versions.outputs.viewer_version }}
            date: ${DATETIME}
            path: rule34-viewer.zip
            sha256: ${VW_SHA}
            description: Browse and search Rule34 content within Stash
            url: ${{ github.server_url }}/${{ github.repository }}
          EOF

          # Append dev entries if they exist
          # ... (similar logic to current workflow)

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
        # ... (same as current)

  # ============================================================================
  # DEPLOY DEV - Builds dev versions of both plugins
  # ============================================================================
  deploy-dev:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/dev'
    steps:
      # Similar structure but:
      # - Modifies source for dev builds (both plugins)
      # - Creates -dev.zip for each plugin
      # - Renames YAMLs to *-dev.yml
      # - Preserves stable entries in index.yml

  # ============================================================================
  # RELEASE - Creates GitHub release with both ZIPs
  # ============================================================================
  release:
    needs: deploy-stable
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Download plugin ZIPs
        uses: actions/download-artifact@v4
        with:
          name: stable-plugin-zips

      # ... (similar to current, but attach both ZIPs)

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            stash-downloader.zip
            rule34-viewer.zip
```

#### claude.yml Changes

The Claude review workflow needs path updates for monorepo:

```yaml
# Line 86 - review prompt may reference paths
prompt: |
  Review PR #${{ github.event.pull_request.number }} against CLAUDE.md standards.
  Note: This is a monorepo with plugins in plugins/*/
  Post your review as a PR comment using gh pr comment.
```

#### Root package.json for Workspaces

```json
{
  "name": "stash-plugins",
  "private": true,
  "workspaces": [
    "plugins/*",
    "shared"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "type-check": "npm run type-check --workspaces --if-present",
    "build:downloader": "npm run build -w plugins/stash-downloader",
    "build:viewer": "npm run build -w plugins/rule34-viewer",
    "dev:downloader": "npm run dev -w plugins/stash-downloader",
    "dev:viewer": "npm run dev -w plugins/rule34-viewer"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

#### Issue Templates Updates

`.github/ISSUE_TEMPLATE/bug_report.yml` may need a plugin selector:

```yaml
- type: dropdown
  id: plugin
  attributes:
    label: Which plugin?
    options:
      - Stash Downloader
      - Rule34 Viewer
      - Both / Unsure
  validations:
    required: true
```

### Tag Strategy for Releases

| Tag Pattern | What Gets Released | Example |
|-------------|-------------------|---------|
| `v*` | Both plugins (combined release) | `v1.0.0` |
| `downloader-v*` | Stash Downloader only | `downloader-v0.6.0` |
| `viewer-v*` | Rule34 Viewer only | `viewer-v0.2.0` |

**Recommended approach**: Use `v*` tags for combined releases (simpler). Only use plugin-specific tags if releasing a hotfix for one plugin without changes to the other.

---

## Related Documentation

- [Stash-Downloader Architecture](../.claude/architecture.md)
- [Stash Plugin Conventions](../.claude/conventions.md)
- [BooruScraper Implementation](../src/services/metadata/BooruScraper.ts)
- [Rule34 API (Gelbooru Wiki)](https://gelbooru.com/index.php?page=wiki&s=view&id=18780)
- [Browser Extension (communication pattern)](../browser-extension/content.js)
