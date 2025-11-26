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
├── theme/             # Theme utilities (ThemeProvider for test-app only)
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
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Pull Requests
Include:
- Clear description of changes
- Testing notes (how to verify)
- Breaking changes (if any)
- Related issues (closes #123)

## Documentation
- **Code Comments**: Explain "why", not "what"
- **JSDoc**: Document public APIs and complex functions
- **README**: Keep updated with setup instructions and examples
- **CHANGELOG**: Track notable changes between versions
