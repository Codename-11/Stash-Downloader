# Contributing to Stash Downloader

Thanks for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Python 3.7+ with yt-dlp
- A running Stash instance for testing

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Codename-11/Stash-Downloader.git
cd Stash-Downloader

# Install dependencies
npm install

# Start development build (watches for changes)
npm run dev

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Testing Your Changes

1. Build the plugin: `npm run build`
2. Copy `dist/` and `scripts/` to your Stash plugins folder
3. Reload plugins in Stash
4. Test your changes in the browser

## How to Contribute

### Reporting Bugs

Use the [Bug Report template](https://github.com/Codename-11/Stash-Downloader/issues/new?template=bug_report.yml) and include:
- Steps to reproduce
- Expected vs actual behavior
- Stash and plugin versions
- Relevant logs or screenshots

### Suggesting Features

Use the [Feature Request template](https://github.com/Codename-11/Stash-Downloader/issues/new?template=feature_request.yml) and describe:
- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered

### Submitting Pull Requests

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/your-feature` or `fix/your-fix`
3. **Make your changes** following the code style guidelines
4. **Test thoroughly** - ensure tests pass and the build succeeds
5. **Commit** using [Conventional Commits](#commit-messages)
6. **Push** and create a Pull Request

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use `interface` for object shapes, `type` for unions
- Follow naming conventions:
  - `PascalCase`: Components, types, interfaces, enums
  - `camelCase`: Functions, variables, methods
  - `UPPER_SNAKE_CASE`: Constants

### React

- Use functional components with hooks
- Extract reusable logic into custom hooks (prefix with `use`)
- Define prop interfaces for all components

### Styling

- Use Bootstrap utility classes (provided by Stash)
- Use inline styles for Stash theme colors:
  - Card background: `#30404d`
  - Input background: `#243340`
  - Borders: `#394b59`
  - Muted text: `#8b9fad`

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) with emoji:

| Type | Emoji | Description |
|------|-------|-------------|
| `feat:` | ✨ | New feature |
| `fix:` | 🐛 | Bug fix |
| `docs:` | 📝 | Documentation |
| `refactor:` | ♻️ | Code refactoring |
| `chore:` | 🔧 | Build/tooling |
| `test:` | ✅ | Tests |
| `ci:` | 🚀 | CI/CD changes |

**Examples:**
```
✨ feat: add batch import from clipboard
🐛 fix: resolve download progress not updating
📝 docs: update installation instructions
```

## Project Structure

```
Stash-Downloader/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── services/           # Business logic
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utilities
├── scripts/                # Python backend (yt-dlp wrapper)
├── browser-extension/      # Firefox extension
├── tests/                  # Test files
└── docs/                   # Documentation
```

## Adding New Scrapers

To add support for a new website:

1. Create a scraper class implementing `IMetadataScraper`
2. Register it in `ScraperRegistry`
3. Add tests for the scraper

See [DEVELOPMENT.md](docs/DEVELOPMENT.md#adding-new-scrapers) for details.

## Questions?

- Check existing [issues](https://github.com/Codename-11/Stash-Downloader/issues)
- Ask in the [Stash Discord](https://discord.gg/stash)
- Open a [Question issue](https://github.com/Codename-11/Stash-Downloader/issues/new?template=question.yml)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
