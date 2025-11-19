# Stash Downloader - Quick Reference

Quick reference card for common tasks and commands.

## Installation

```bash
# Clone to Stash plugins directory
cd ~/.stash/plugins  # or %USERPROFILE%\.stash\plugins on Windows
git clone https://github.com/Codename-11/Stash-Downloader.git stash-downloader
cd stash-downloader
pnpm install && pnpm build

# Then enable in Stash: Settings → Plugins → Stash Downloader
```

**Access:** `http://localhost:9999/downloader`

---

## Common Tasks

### Import Single URL

```
1. Navigate to /downloader
2. Paste URL in input field
3. Click "Add to Queue"
4. Click "Edit" to review metadata
5. Click "Save & Import to Stash"
```

### Batch Import

```
1. Copy URLs to clipboard (one per line)
2. Click "Import from Clipboard"
3. Review and click "Import X URLs"
4. Click "Edit & Import (X items)"
5. Step through each item, editing as needed
```

### Edit Metadata

**Fields:**
- **Title** (required): Scene/image name
- **Description**: Details about content
- **Date**: YYYY-MM-DD format
- **Rating**: 1-5 stars (20-100)
- **Performers**: Multi-select, autocomplete
- **Tags**: Multi-select, autocomplete
- **Studio**: Single select, autocomplete

**Actions:**
- Type to search existing entities
- Click "Create New" to add new ones
- Click × on badges to remove

---

## Settings

**Location:** Settings → Plugins → Stash Downloader

| Setting | Default | Description |
|---------|---------|-------------|
| Download Path | - | Where files are saved |
| Concurrent Downloads | 3 | Max simultaneous downloads |
| Auto-Create Performers | On | Create performers automatically |
| Auto-Create Tags | On | Create tags automatically |
| Auto-Create Studios | Off | Create studios automatically |
| Download Quality | Best | Preferred video quality |
| Filename Template | {title} | File naming pattern |
| Enable Notifications | On | Browser notifications |

**Template Variables:**
- `{title}` - Content title
- `{date}` - Upload/creation date
- `{performers}` - Performer names
- `{studio}` - Studio name

---

## Queue Status

| Badge | Color | Meaning |
|-------|-------|---------|
| Pending | Gray | Ready to import |
| Downloading | Blue | Downloading now |
| Processing | Cyan | Creating in Stash |
| Complete | Green | Successfully imported |
| Failed | Red | Error occurred |
| Cancelled | Yellow | Skipped by user |

---

## Keyboard Shortcuts

*Currently no keyboard shortcuts - use mouse/touch*

**Planned:**
- `Ctrl/Cmd + V` - Quick paste URL
- `Enter` - Submit URL
- `← →` - Navigate items in edit mode
- `Esc` - Cancel/close

---

## Supported URLs

**Direct Files:**
- Video: `.mp4`, `.mkv`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.m4v`
- Image: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`

**Websites:**
- Extensible scraper system
- Add custom scrapers for specific sites
- Default: Generic metadata extractor

---

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| Plugin not showing | Settings → Plugins → Reload Plugins |
| Can't access page | Hard refresh: Ctrl+Shift+R |
| No metadata | Check browser console (F12) |
| Download fails | Verify URL is direct file link |
| Import fails | Check Stash write permissions |
| Slow performance | Reduce concurrent downloads |

**Console Shortcut:** `F12` or `Ctrl+Shift+I` (Windows/Linux), `Cmd+Option+I` (Mac)

---

## Development

```bash
# Test without Stash
pnpm test               # Opens browser at localhost:3000

# Build for production
pnpm build              # Creates dist/stash-downloader.js

# Watch mode
pnpm dev                # Auto-rebuild on changes

# Type checking
pnpm type-check         # Run TypeScript compiler

# Code quality
pnpm lint               # ESLint
pnpm format             # Prettier
```

---

## File Locations

```
~/.stash/plugins/stash-downloader/
├── dist/
│   └── stash-downloader.js    # Built plugin (required)
├── stash-downloader.yml        # Plugin config (required)
├── src/                        # Source code
└── test/                       # Test environment
```

---

## GraphQL Examples

**Query Performers:**
```graphql
query FindPerformers {
  findPerformers(
    performer_filter: { name: { value: "Jane", modifier: INCLUDES } }
  ) {
    performers { id name }
  }
}
```

**Create Scene:**
```graphql
mutation CreateScene($input: SceneCreateInput!) {
  sceneCreate(input: $input) {
    id
    title
  }
}
```

**Access GraphQL Playground:** `http://localhost:9999/playground`

---

## Support Resources

- **Documentation:** [README.md](README.md)
- **Test Guide:** [test/README.md](test/README.md)
- **Report Issues:** [GitHub Issues](../../issues)
- **Stash Docs:** https://docs.stashapp.cc
- **Discord:** Stash community server

---

## Version Info

**Current Version:** 0.1.0

**Changelog:**
- Initial release
- Metadata editing workflow
- Batch import from clipboard
- Complete test environment

**Check for Updates:**
```bash
cd ~/.stash/plugins/stash-downloader
git pull
pnpm install
pnpm build
```

---

## Quick Tips

✅ **DO:**
- Use direct file URLs
- Review metadata before importing
- Create entities with consistent naming
- Check autocomplete before creating new
- Clear completed items regularly

❌ **DON'T:**
- Import without reviewing metadata
- Create duplicate performers/tags
- Download copyrighted content without permission
- Ignore error messages
- Skip testing with sample URLs first

---

*Last Updated: 2025-01-19*
