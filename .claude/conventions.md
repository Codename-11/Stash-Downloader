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
src/
├── components/          # React components
│   ├── common/         # Reusable UI components
│   ├── downloader/     # Feature-specific components
│   └── settings/       # Settings page components
├── services/           # Business logic and API clients
│   ├── stash/         # Stash GraphQL service
│   ├── download/      # Download manager
│   └── metadata/      # Metadata extraction
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── constants/         # Application constants
└── index.tsx          # Plugin entry point
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

Version is the single source of truth in `package.json`. GitHub Actions reads it for releases.

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

### Releasing (Tag-Based)

This project uses **tag-based releases**:

```bash
# On dev branch, ready to release:
git checkout main
git merge dev

# Bump version in package.json
git add package.json
git commit -m "🔖 chore: release vX.Y.Z"

# Create and push tag
git tag vX.Y.Z
git push origin main --tags

# Sync version back to dev (WAIT for main workflow to complete first!)
# Check: https://github.com/Codename-11/Stash-Downloader/actions
git checkout dev
git merge main
git push origin dev
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
git push origin --delete vX.Y.Z
git push origin vX.Y.Z
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
- Push to `dev` branch → deploys dev build
- Tag push (`v*`) → deploys stable build + creates release
- Pull requests → test only

**Important:**
- Tag format MUST be `vX.Y.Z` (e.g., `v0.2.0`)
- Version in `package.json` should match tag (without `v` prefix)

### Dev Builds (Automatic)

Every push to `dev` branch auto-deploys a dev build:
- Plugin ID: `stash-downloader-dev`
- Version format: `X.Y.Z-dev.{7-char-sha}` (e.g., `0.4.2-dev.2e8a74e`)
- Navbar: "Downloader-Dev"
- Can run alongside stable version (different plugin ID via renamed YAML)

**In Stash**, both stable and dev appear in the same source:
```
https://codename-11.github.io/Stash-Downloader/index.yml
```

The index.yml contains BOTH plugin entries - each deploy preserves the other's entry.

### Extension vs Plugin Versioning

**Independent Versioning Strategy:**
- `package.json` version = Plugin version (Stash plugin releases)
- `browser-extension/manifest.json` version = Extension version (Firefox/Chrome store)
- Versions are **independent** - they don't need to match

**Version Bump Rules:**
- Plugin changes only → Bump `package.json` only
- Extension changes only → Bump `browser-extension/manifest.json` only
- Both changed → Bump both versions

**Release Tags:**
- Git tags (`vX.Y.Z`) follow the **plugin version** in `package.json`
- GitHub Actions packages both plugin and extension on every release

**Browser Store Uploads:**
- **Manual uploads only** - Upload to Firefox Add-ons / Chrome Web Store when `browser-extension/manifest.json` version changes
- Do NOT upload on every plugin release if extension hasn't changed
- Future TODO: Automate with CI change detection (web-ext sign with AMO API keys)

## Documentation
- **Code Comments**: Explain "why", not "what"
- **JSDoc**: Document public APIs and complex functions
- **README**: Keep updated with setup instructions and examples
- **CHANGELOG**: Track notable changes between versions
