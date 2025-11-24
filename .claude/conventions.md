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
- **Imports**: Group and order: React → Material UI → Third-party → Services → Components → Types → Styles

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
├── theme/             # Material UI theme configuration
│   ├── theme.ts       # Theme definition
│   └── ThemeProvider.tsx  # Theme provider component
└── index.tsx          # Plugin entry point
```

## Component Structure
```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { Button, TextField, Card, CardContent, Stack } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
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

  // 7. JSX
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {/* Component markup using MUI components */}
        </Stack>
      </CardContent>
    </Card>
  );
};
```

## Material UI Conventions

### Import Ordering
```typescript
// 1. React
import React, { useState } from 'react';

// 2. Material UI components (grouped)
import { Button, TextField, Card, CardContent } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

// 3. Third-party libraries
import { useQuery } from '@apollo/client';

// 4. Internal services
import { getDownloadService } from '@/services/download';

// 5. Internal components
import { LoadingSpinner } from '@/components/common';

// 6. Internal hooks
import { useDownloadQueue } from '@/hooks';

// 7. Types
import type { IDownloadItem } from '@/types';

// 8. Utils
import { formatBytes } from '@/utils';
```

### Component Usage

**Layout**:
- Use `Container` with `maxWidth` prop for page containers
- Use `Grid` for responsive layouts (prefer over custom flexbox)
- Use `Stack` for simple vertical/horizontal layouts
- Use `Box` for spacing, borders, and custom styling

**Styling**:
- Prefer `sx` prop for component-level styling
- Use theme values: `sx={{ color: 'primary.main', spacing: 2 }}`
- Use `styled()` for reusable styled components
- Avoid inline styles when theme values are available

**Icons**:
- Import with descriptive names: `import { Add as AddIcon } from '@mui/icons-material'`
- Use `startIcon`/`endIcon` props on buttons
- Use `IconButton` for icon-only interactive elements

**Forms**:
- Use `TextField` with appropriate `variant` (outlined is default)
- Use `Autocomplete` for searchable selects
- Use `Select` for simple dropdowns
- Always provide `label` prop for accessibility

**Feedback**:
- Use `Alert` for inline messages
- Use `Snackbar` for toast notifications
- Use `CircularProgress` for loading states
- Use `LinearProgress` for progress bars

### Theme Customization

**Accessing Theme**:
```typescript
import { useTheme } from '@mui/material/styles';
import { useThemeMode } from '@/theme/ThemeProvider';

const theme = useTheme();
const { mode, toggleMode } = useThemeMode();
```

**Customizing Theme**:
- Edit `src/theme/theme.ts` for global theme changes
- Use component `styleOverrides` in theme for component-level changes
- Use `sx` prop for component-specific styling

### Best Practices
- Always wrap app with `ThemeProvider` from `@/theme/ThemeProvider`
- Use theme spacing units: `sx={{ p: 2, m: 1 }}` (multiplies by 8px)
- Use theme breakpoints: `sx={{ display: { xs: 'none', md: 'block' } }}`
- Prefer semantic color props: `color="primary"` over `color="#1976d2"`
- Use `Typography` component for text instead of raw HTML tags
- Ensure all interactive elements are keyboard accessible

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

## Testing Strategy (Future)
- **Unit Tests**: Vitest for services and utilities
- **Component Tests**: React Testing Library
- **Integration Tests**: Test plugin registration and API interaction
- **E2E Tests**: Playwright (optional, for critical workflows)

## Accessibility
- **Semantic HTML**: Use proper HTML5 elements
- **ARIA Labels**: Add labels for screen readers where needed
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Focus Management**: Proper focus handling for modals and dynamic content

## Performance
- **Lazy Loading**: Code-split large components
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations
- **Debouncing**: Debounce user inputs (search, filters)
- **Pagination**: Implement for large lists

## Security
- **Input Sanitization**: Validate and sanitize all user inputs
- **URL Validation**: Verify URLs before downloading
- **XSS Prevention**: Never use `dangerouslySetInnerHTML` without sanitization
- **CORS**: Handle CORS properly for external requests

## Git Conventions
- **Commit Messages**: Follow Conventional Commits
  - `feat:` new features
  - `fix:` bug fixes
  - `refactor:` code refactoring
  - `docs:` documentation updates
  - `chore:` maintenance tasks
- **Branch Naming**: `feature/description`, `fix/description`
- **Pull Requests**: Include description, testing notes, and breaking changes

## Documentation
- **Code Comments**: Explain "why", not "what"
- **JSDoc**: Document public APIs and complex functions
- **README**: Keep updated with setup instructions and examples
- **CHANGELOG**: Track notable changes between versions
