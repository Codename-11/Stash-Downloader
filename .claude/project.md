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
- **Build Tool**: Vite (fast, modern, optimized for libraries)
- **Styling**: Material UI v7 (bundled in plugin)
- **API**: GraphQL via Apollo Client (provided by Stash)
- **State Management**: React Context + Hooks
- **Plugin API**: Stash PluginApi (window.PluginApi)

## Plugin Type
JavaScript Extension / Web-UI Plugin for Stash

## Key Features
1. **URL-based Content Download**
   - Support for multiple video/image hosting sites
   - Batch download support
   - Progress tracking and queue management

2. **Metadata Intelligence**
   - Automatic metadata extraction from sources
   - Smart matching against existing Stash data
   - Manual override and editing capabilities

3. **Stash Integration**
   - GraphQL mutations for scene/image/gallery creation
   - Performer, tag, and studio association
   - File organization according to Stash library structure

4. **User Experience**
   - Clean, intuitive interface
   - Real-time progress indicators
   - Error handling with actionable messages
   - Preview before finalizing

## External Dependencies (NOT Bundled)
These are provided by Stash and marked as external in build config:
- react
- react-dom
- react-router-dom
- @apollo/client

## Bundled Dependencies
These are bundled with the plugin:
- @mui/material (Material UI v7)
- @mui/icons-material (Material UI icons)
- @emotion/react (CSS-in-JS runtime for MUI)
- @emotion/styled (Styled components for MUI)

## Material UI Installation & Usage

### Installation
Material UI dependencies are already included in `package.json`:
```bash
pnpm install
```

### Theme Customization
The plugin uses a custom Material UI theme with dark/light mode support:
- Theme configuration: `src/theme/theme.ts`
- Theme provider: `src/theme/ThemeProvider.tsx`
- Theme mode is persisted in localStorage

### Using Material UI Components
Import components from `@mui/material`:
```typescript
import { Button, TextField, Card, CardContent } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
```

### Theme Mode
The theme supports both light and dark modes. The mode preference is stored in localStorage and can be toggled programmatically using the `useThemeMode` hook from `@/theme/ThemeProvider`.

## Development Workflow
1. Develop components in `src/`
2. Build with `pnpm build` (outputs to `dist/`)
3. Plugin YAML points to `dist/stash-downloader.js`
4. Place plugin folder in Stash's plugins directory
5. Test in Stash instance at http://localhost:9999

## Future Enhancement Considerations
- Plugin architecture supports adding new source scrapers
- Extensible metadata mapping system
- Settings-driven configuration (no code changes needed)
- Hook system for custom workflows
- Export/import of download templates
