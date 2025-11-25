# Stash Downloader Plugin

A React-based Stash plugin for downloading images and videos with automatic metadata extraction and tagging.

## Documentation

@.claude/project.md
@.claude/architecture.md
@.claude/conventions.md

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Build with watch mode |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run test-app` | Run standalone test app |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint check |

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite (IIFE bundle for Stash plugins)
- **Styling**: Bootstrap utilities (provided by Stash)
- **API**: GraphQL via Apollo Client (provided by Stash)

## Key Constraints

- External deps (React, Apollo) provided by Stash - NOT bundled
- No CSS-in-JS libraries (no MUI, Emotion, styled-components)
- No custom ThemeProvider contexts in plugin code
- Bundle target: <150KB

## Stash Theme Colors

```
Card background: #30404d
Header/input bg: #243340
Borders: #394b59
Muted text: #8b9fad
```

## Plugin Entry Pattern

The plugin registers via `PluginApi.register.route()` and patches navbar via `PluginApi.patch.after()`. Must handle edge cases like empty output from MainNavBar patch.
