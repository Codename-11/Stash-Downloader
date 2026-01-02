# Development Conventions

## Code Style

### TypeScript
- **Strict mode enabled**: All TypeScript strict checks
- **Explicit types**: Avoid `any`, prefer `unknown` for truly unknown types
- **Interface over type**: Use `interface` for object shapes, `type` for unions/intersections
- **Naming**:
  - PascalCase for components, types, interfaces, enums
  - camelCase for functions, variables, methods
  - UPPER_SNAKE_CASE for constants
  - Prefix interfaces with `I` only when needed for clarity

### React
- **Functional Components**: Always use function components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks (prefix with `use`)
- **Props**: Define explicit prop interfaces for all components
- **File Structure**: One component per file (except small related sub-components)
- **Imports**: Group and order: React → Bootstrap/Stash → Third-party → Services → Components → Types → Styles

### File Organization
```
stash-downloader/                    # Monorepo root
├── plugins/
│   ├── stash-downloader/           # Stash Downloader plugin
│   │   ├── src/
│   │   │   ├── components/         # React components
│   │   │   ├── services/           # Business logic and API clients
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   ├── types/              # TypeScript type definitions
│   │   │   ├── utils/              # Utility functions
│   │   │   ├── constants/          # Application constants
│   │   │   └── index.tsx           # Plugin entry point
│   │   ├── scripts/                # Python backend (download.py)
│   │   ├── tests/                  # Vitest tests
│   │   └── package.json            # Plugin version & deps
│   └── stash-browser/              # Stash Browser plugin
│       ├── src/                    # Same structure as downloader
│       ├── scripts/                # Python backend
│       └── package.json            # Plugin version & deps
├── browser-extension/              # Firefox extension
├── shared/                         # Shared code between plugins
├── .github/workflows/              # CI/CD for all plugins
├── package.json                    # Root workspace config
└── CLAUDE.md                       # Project documentation
```

## Component Structure
```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { useStashData } from '@/hooks/useStashData';
import type { IDownloadItem } from '@/types';

// 2. Type Definitions
interface DownloadQueueProps {
  items: IDownloadItem[];
  onRemove: (id: string) => void;
}

// 3. Component
export const DownloadQueue: React.FC<DownloadQueueProps> = ({ items, onRemove }) => {
  // 4. Hooks (state, effects, custom hooks)
  const [filter, setFilter] = useState('');
  const { performers } = useStashData();

  useEffect(() => {
    // Effect logic
  }, []);

  // 5. Event handlers
  const handleRemove = (id: string) => {
    onRemove(id);
  };

  // 6. Render helpers
  const filteredItems = items.filter(item => item.title.includes(filter));

  // 7. JSX with Bootstrap classes and Stash theme colors
  return (
    <div className="card text-light" style={{ backgroundColor: '#30404d' }}>
      <div className="card-body">
        <div className="d-flex flex-column gap-2">
          {/* Component markup using Bootstrap utilities */}
        </div>
      </div>
    </div>
  );
};
```

## Bootstrap & Styling Conventions

### Import Ordering
```typescript
// 1. React
import React, { useState } from 'react';

// 2. Third-party libraries
import { useQuery } from '@apollo/client';

// 3. Internal services
import { getDownloadService } from '@/services/download';

// 4. Internal components
import { LoadingSpinner } from '@/components/common';

// 5. Internal hooks
import { useDownloadQueue } from '@/hooks';

// 6. Types
import type { IDownloadItem } from '@/types';

// 7. Utils
import { formatBytes } from '@/utils';
```

### Component Usage

**Layout**:
- Use `div.container-lg` for page containers
- Use `d-flex` with `gap-*` for layouts
- Use Bootstrap grid (`row`, `col-*`) for responsive layouts
- Use `className` for Bootstrap utility classes

**Styling**:
- Use Bootstrap utility classes for spacing/layout: `p-2`, `mb-3`, `d-flex`, `gap-2`
- Use inline `style` for Stash theme colors (not available in Bootstrap)
- Stash color palette:
  - Background: `#30404d` (cards), `#243340` (inputs/headers)
  - Borders: `#394b59`
  - Muted text: `#8b9fad`
  - Primary text: `#fff` or `text-light`

**Forms**:
- Use `form-control` with dark styles: `bg-dark text-light border-secondary`
- Use `form-select` for dropdowns
- Use `form-check` for checkboxes/radios
- Always provide `label` with `form-label` class

**Buttons**:
- Primary action: `btn btn-success` or `btn btn-primary`
- Secondary: `btn btn-outline-light` or `btn btn-secondary`
- Danger: `btn btn-outline-danger` or `btn btn-danger`

**Feedback**:
- Alerts: `alert alert-info`, `alert alert-danger`, etc.
- Spinners: `spinner-border spinner-border-sm`
- Progress: `progress` with `progress-bar`

**Modals**:
- Use Bootstrap modal structure with dark theme
- `modal-content bg-dark text-light`
- `modal-header border-secondary`
- `btn-close btn-close-white`

### Best Practices
- Never bundle Bootstrap CSS (Stash provides it)
- Use `text-light` instead of hardcoded white colors where possible
- Use inline `style` for Stash-specific colors not in Bootstrap
- Avoid using MUI, Emotion, or other CSS-in-JS libraries
- Don't use custom ThemeProvider contexts in plugin code

## Error Handling
- **Service Layer**: Return `Result<T, Error>` pattern or throw specific error types
- **Components**: Use error boundaries for unexpected errors
- **User Feedback**: Show actionable error messages with retry options
- **Logging**: Use console.error for errors, console.warn for warnings (removed in production)

## State Management
- **Local State**: `useState` for component-specific state
- **Shared State**: Context API for cross-component state (download queue, settings)
- **Server State**: Apollo Client cache for GraphQL data
- **Persistent State**: localStorage for user preferences (with fallbacks)

## GraphQL Patterns
- **Queries**: Use fragments for reusable field selections
- **Mutations**: Include optimistic updates where appropriate
- **Error Handling**: Check both network errors and GraphQL errors
- **Type Safety**: Generate types from GraphQL schema

## Testing Strategy
- **Unit Tests**: Vitest for services and utilities
- **Component Tests**: React Testing Library
- **Integration Tests**: Test plugin registration and API interaction
- **Test App**: Standalone test app with mock PluginApi for development without Stash

## Accessibility
- **Semantic HTML**: Use proper HTML5 elements
- **ARIA Labels**: Add labels for screen readers where needed
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Focus Management**: Proper focus handling for modals and dynamic content

## Performance
- **Bundle Size**: Keep external dependencies minimal; use Stash-provided libraries
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations
- **Debouncing**: Debounce user inputs (search, filters)
- **Pagination**: Implement for large lists

## Security
- **Input Sanitization**: Validate and sanitize all user inputs
- **URL Validation**: Verify URLs before downloading
- **XSS Prevention**: Never use `dangerouslySetInnerHTML` without sanitization
- **CORS**: Handle CORS properly for external requests

## Git Conventions

### Semantic Versioning
This project follows [Semantic Versioning](https://semver.org/) (SemVer):

```
MAJOR.MINOR.PATCH (e.g., 1.2.3)
```

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

Version is the single source of truth in `plugins/stash-downloader/package.json`. GitHub Actions reads it for releases.

### Conventional Commits
All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types with Emoji Prefixes:**
| Type | Emoji | When to Use |
|------|-------|-------------|
| `feat:` | ✨ | New feature or capability |
| `fix:` | 🐛 | Bug fix |
| `docs:` | 📝 | Documentation only |
| `refactor:` | ♻️ | Code change without fixing bug or adding feature |
| `chore:` | 🔧 | Build, tooling, dependencies |
| `perf:` | ⚡️ | Performance improvement |
| `test:` | ✅ | Adding or fixing tests |
| `style:` | 🎨 | Code formatting (no logic change) |
| `ci:` | 🚀 | CI/CD changes |

**Examples:**
```bash
feat: add batch import from clipboard
fix: resolve navbar button not appearing
docs: update README with installation steps
refactor: simplify GraphQL service
chore: update dependencies
```

**Breaking Changes:**
Add `!` after type or include `BREAKING CHANGE:` in footer:
```
feat!: change API response format

BREAKING CHANGE: Response now returns array instead of object
```

### Branch Naming
- `feature/description` - New features (branch from dev)
- `fix/description` - Bug fixes (branch from dev)
- `docs/description` - Documentation
- `dev` - Active development (auto-deploys dev builds)
- `main` - Stable releases only (merged from dev)

### Branch Strategy

**ALWAYS develop on `dev` branch.** Never commit directly to `main`.

```
dev (active development) → main (stable) → tag (release)
```

### Development Workflow

```
1. Work on dev      → git checkout dev
2. Make changes     → edit files, commit, push
3. Test dev build   → Auto-deploys as "Downloader-Dev"
4. Ready to release → Merge dev to main, then tag
```

For larger features, use feature branches merged to dev:
```
1. Create branch    → git checkout -b feature/my-feature dev
2. Make changes     → edit files, commit
3. Merge to dev     → git checkout dev && git merge feature/my-feature
4. Push dev         → git push origin dev
```

### Pull Requests (Optional)
For significant changes, PRs enable Claude review:
- Clear description of changes
- Testing notes (how to verify)
- Breaking changes (if any)
- Related issues (closes #123)

### Issue & Feature Workflow

**Full flow from issue to release:**

```
1. Create Issue    → GitHub Issues (bug report, feature request)
2. Branch          → Work on dev (or feature/issue-123 for larger work)
3. Implement       → Make changes, commit with issue reference
4. Test            → Push to dev, test dev build in Stash
5. Release         → Merge to main, bump version, tag
```

**Creating Issues:**
- Use GitHub Issues to track bugs, features, and tasks
- Add labels: `bug`, `enhancement`, `documentation`
- Include reproduction steps for bugs
- Reference related code/files if known

**Referencing Issues in Commits:**
```bash
# Closes issue when merged to default branch
fix: resolve navbar crash (closes #123)
feat: add batch import (closes #45)

# Just references without closing
fix: partial fix for download issue (#123)
chore: refactor related to #45
```

**Branch Strategy for Issues:**
| Issue Size | Approach |
|------------|----------|
| Small fix (< 1 hour) | Commit directly to `dev` |
| Medium feature (1-4 hours) | Feature branch → merge to `dev` |
| Large feature (> 4 hours) | Feature branch with multiple commits → PR to `dev` |

**Testing Before Release:**
1. Push to `dev` branch
2. Wait for dev build to deploy (check GitHub Actions)
3. Install "Stash Downloader (Dev)" in Stash
4. Verify the fix/feature works
5. If good, proceed to release; if not, iterate on dev

### Releasing (Tag-Based)

This project uses **prefixed tag-based releases** for each component:

| Component | Tag Format | Example | Auto-Deploy |
|-----------|-----------|---------|-------------|
| Stash Downloader | `downloader-vX.Y.Z` | `downloader-v0.5.2` | GitHub Pages + Release |
| Stash Browser | `browser-vX.Y.Z` | `browser-v0.1.0` | GitHub Pages + Release |
| Firefox Extension | `extension-vX.Y.Z` | `extension-v0.2.0` | GitHub Release only |

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

# Release Firefox Extension:
git checkout main && git merge dev
cd browser-extension && npm version patch  # syncs manifest.json automatically
git add . && git commit -m "🔖 chore: release extension-vX.Y.Z"
git tag extension-vX.Y.Z && git push origin main --tags
# THEN: Download ZIP from GitHub Release and upload to AMO

# Sync version back to dev (WAIT for workflow to complete first!)
# Check: https://github.com/Codename-11/Stash-Downloader/actions
git checkout dev && git merge main && git push origin dev
```

Or use `/release` skill for guided release.

**⚠️ CRITICAL: GitHub Pages Concurrency**

Do NOT push `main` (with tag) and `dev` simultaneously or in quick succession. GitHub Pages deployment uses a concurrency group - if a second deployment starts while the first is running, **the first will be cancelled**.

```yaml
concurrency:
  group: "pages"
  cancel-in-progress: false  # Misleading - new deploys still cancel queued ones
```

**What actually happens:**
- Stable deploy starts (tag push)
- Dev deploy starts before stable finishes (push to dev)
- Stable deploy gets **CANCELLED** mid-way
- Only dev build ends up deployed
- Stable plugin disappears from index.yml!

**Correct sequence:**
1. Push `main` with tag
2. **Wait for workflow to complete** (check Actions tab: https://github.com/Codename-11/Stash-Downloader/actions)
3. Then sync `dev` with version bump

**If release was cancelled:** Re-push the tag to trigger the workflow again:
```bash
git push origin --delete downloader-vX.Y.Z  # or browser-vX.Y.Z
git push origin downloader-vX.Y.Z
```

**Version Bump Rules:**
| Changes | Bump | Example |
|---------|------|---------|
| Breaking changes, API changes | MAJOR | 0.1.0 → 1.0.0 |
| New features, enhancements | MINOR | 0.1.0 → 0.2.0 |
| Bug fixes, patches | PATCH | 0.1.0 → 0.1.1 |

**What Happens Automatically (on tag push):**
1. GitHub Actions runs CI (tests, lint, type-check)
2. Plugin is built and packaged
3. GitHub Pages index.yml is updated with BOTH stable (new) and dev (preserved) entries
4. AI generates "What's New" summary (if `GOOGLE_API_KEY` configured)
5. GitHub Release is created with release notes + ZIP attached

**AI Release Notes (Optional):**
Release notes are auto-generated using Google Gemini (free tier: 15 req/min, 1M tokens/day).

To enable:
1. Get API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Add `GOOGLE_API_KEY` as repository secret (Settings → Secrets → Actions)

Without the key, releases still work but skip the "What's New" AI summary.

**Note:** Push to `main` without a tag triggers NOTHING (no test, no deploy). The workflow only triggers on:
- Push to `dev` branch → deploys dev builds for ALL plugins
- Tag push (`downloader-v*`) → deploys Stash Downloader stable + creates release
- Tag push (`browser-v*`) → deploys Stash Browser stable + creates release
- Pull requests → test only

**Important:**
- Tag format MUST include plugin prefix: `downloader-vX.Y.Z` or `browser-vX.Y.Z`
- Version in respective `package.json` should match tag version (without prefix)

### Dev Builds (Automatic)

Every push to `dev` branch auto-deploys dev builds for ALL plugins:

| Plugin | Dev ID | Version Format | Navbar |
|--------|--------|----------------|--------|
| Downloader | `stash-downloader-dev` | `X.Y.Z-dev.{sha}` | "Downloader-Dev" |
| Browser | `stash-browser-dev` | `X.Y.Z-dev.{sha}` | "Browser-Dev" |

Dev builds can run alongside stable versions (different plugin IDs via renamed YAML).

**In Stash**, all plugins (stable + dev) appear in the same source:
```
https://codename-11.github.io/Stash-Downloader/index.yml
```

The index.yml contains ALL plugin entries - each deploy preserves other plugins' entries.

### Monorepo Versioning

**Independent Versioning Strategy:**
Each component has its own version - they don't need to match:

| Component | Version File | Release Method |
|-----------|--------------|----------------|
| Stash Downloader | `plugins/stash-downloader/package.json` | `downloader-vX.Y.Z` tag |
| Stash Browser | `plugins/stash-browser/package.json` | `browser-vX.Y.Z` tag |
| Firefox Extension | `browser-extension/package.json` | `extension-vX.Y.Z` tag + AMO upload |

**Version Bump Rules:**
- Downloader changes only → Bump Downloader `package.json`, tag with `downloader-v*`
- Browser changes only → Bump Browser `package.json`, tag with `browser-v*`
- Extension changes only → Bump Extension `package.json`, tag with `extension-v*`, then upload to AMO
- Multiple components changed → Release each separately with its own tag

**Firefox Extension Release Process:**
1. `cd browser-extension && npm version patch` (auto-syncs manifest.json)
2. Commit and tag: `git tag extension-vX.Y.Z`
3. Push: `git push origin main --tags`
4. GitHub Action creates Release with ZIP attached
5. Download ZIP from Release, upload to [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/stash-downloader-extension/)

## Documentation
- **Code Comments**: Explain "why", not "what"
- **JSDoc**: Document public APIs and complex functions
- **README**: Keep updated with setup instructions and examples
- **CHANGELOG**: Track notable changes between versions
