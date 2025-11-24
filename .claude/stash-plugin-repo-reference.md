# Stash Plugin Repository Reference

This document contains reference information about the Stash plugin repository format and GitHub workflow setup, learned through implementing the automated build and publishing system.

## Plugin Repository Index Format

### Required Structure

The `index.yml` file must be a **flat YAML array** at the root level (not a nested object).

There are two known formats:

#### Format 1: Simple Format (Our Implementation)
```yaml
- id: plugin-id
  name: Plugin Name
  version: 0.1.0
  date: 2025-11-24 14:30:45
  path: plugins/plugin-name
  files:
    - plugin.yml
    - dist/plugin.js
  description: Plugin description
  url: https://github.com/user/repo
```

#### Format 2: CommunityScripts Format (With Metadata Wrapper)
```yaml
- id: plugin-id
  name: Plugin Name
  metadata:
    description: Plugin description
    version: 0.1.0-abc1234
    date: 2025-11-24 14:30:45
    path: plugin-name.zip
    sha256: [64-char hash]
  requires:  # Optional - array of plugin IDs only
    - dependency-plugin-id
```

**Note:** The `requires` field (if present) must be an array of **plugin ID strings only**, not version constraints.

### Critical Format Requirements

#### Date Field Format
**MUST be datetime with time component**, not just date:

```bash
# ✅ CORRECT
date +'%Y-%m-%d %H:%M:%S'
# Output: 2025-11-24 14:30:45

# ❌ WRONG - will fail parsing
date +%Y-%m-%d
# Output: 2025-11-24
```

**Why:** Stash uses Go's `time.Parse` with format `"2006-01-02 15:04:05"` which requires both date AND time.

**Error if wrong:**
```
parsing time "2025-11-24" as "2006-01-02 15:04:05": cannot parse "" as "15"
```

#### Array vs Object Structure
**MUST be an array**, not a nested object structure:

```yaml
# ✅ CORRECT - flat array
- id: plugin-1
  name: Plugin 1
- id: plugin-2
  name: Plugin 2

# ❌ WRONG - nested structure
version: "1"
sources:
  - id: source-1
    plugins:
      - id: plugin-1
```

**Error if wrong:**
```
yaml: unmarshal errors: line 2: cannot unmarshal !!map into []pkg.RemotePackage
```

### Field Specifications

| Field | Type | Required | Format | Notes |
|-------|------|----------|--------|-------|
| `id` | string | Yes | kebab-case | Unique identifier |
| `name` | string | Yes | - | Display name |
| `version` | string | Yes | semver | e.g., "0.1.0" |
| `date` | string | Yes | `YYYY-MM-DD HH:MM:SS` | **Must include time** |
| `files` | array | Yes | - | Relative paths from `path` |
| `requires` | array | No | - | Dependencies |
| `description` | string | Yes | - | Short description |
| `url` | string | Yes | URL | Repository URL |
| `path` | string | Yes | - | Path to plugin directory |

## GitHub Workflow Setup

### Required Files

1. **`.github/workflows/publish.yml`** - GitHub Actions workflow
2. **`build_site.sh`** - Local build script (optional, for testing)
3. **GitHub Pages enabled** - Must be configured in repo settings

### GitHub Pages Configuration

1. Go to repo **Settings → Pages**
2. Under "Build and deployment"
3. Select **Source: GitHub Actions** (not "Deploy from a branch")
4. Workflow will automatically deploy to `https://username.github.io/repo-name/index.yml`

### Workflow Key Steps

```yaml
- name: Build plugin
  run: npm run build

- name: Create plugins directory structure
  run: |
    mkdir -p plugins/plugin-name
    cp -r dist plugins/plugin-name/
    cp plugin.yml plugins/plugin-name/

- name: Generate plugin index
  run: |
    CURRENT_DATETIME=$(date +'%Y-%m-%d %H:%M:%S')
    cat > index.yml << EOF
    - id: plugin-name
      name: Plugin Name
      version: 0.1.0
      date: ${CURRENT_DATETIME}
      # ... rest of fields
    EOF

- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: '.'

- name: Deploy to GitHub Pages
  uses: actions/deploy-pages@v4
```

### Important Notes

- Use **unquoted EOF** (not `'EOF'`) in heredoc to allow variable expansion
- Generate datetime **before** heredoc, store in variable
- Upload entire directory (`.`) as artifact for GitHub Pages
- Permissions required: `contents: write`, `pages: write`, `id-token: write`

## Plugin Manifest (plugin.yml)

Located at repository root, defines plugin metadata:

```yaml
name: Plugin Name
description: Plugin description
version: 0.1.0
url: https://github.com/user/repo

settings:
  settingName:
    displayName: Setting Display Name
    description: Setting description
    type: STRING
    default: "default value"

js:
  - dist/plugin.js

interface: plugin-interface-name
```

### Interface Types

- `stash-interface` - Standard Stash plugin
- `js` - JavaScript only
- `raw` - No interface (script-based)

## Adding Plugin to Stash

### As Custom Source

1. Open Stash → **Settings → Plugins → Available Plugins**
2. Click **"Add Source"**
3. Enter: `https://username.github.io/repo-name/index.yml`
4. Click **"Add"**
5. Plugin appears in Available Plugins list
6. Click **"Install"**

### Manual Installation

1. Copy plugin directory to `~/.stash/plugins/plugin-name/`
2. Stash → **Settings → Plugins**
3. Find plugin in list
4. Toggle **ON** to enable
5. Click **"Reload Plugins"** if needed

## References

- **Stash Documentation:** https://docs.stashapp.cc/in-app-manual/plugins/
- **Plugin Template:** https://github.com/stashapp/plugins-repo-template
- **Go time.Parse format:** `"2006-01-02 15:04:05"` (must include time)
- **Date format reference:** https://gosamples.dev/date-format-yyyy-mm-dd/

## Common Issues

### Issue: "cannot unmarshal !!map into []pkg.RemotePackage"
**Cause:** index.yml is nested object instead of flat array
**Fix:** Remove `version:` and `sources:` wrapper, use flat array

### Issue: "line X: cannot unmarshal !!map into string"
**Cause:** `requires` field contains a map like `stash: ">=0.20.0"` instead of string
**Fix:** `requires` must be array of plugin ID strings only:
```yaml
# ❌ WRONG
requires:
  - stash: ">=0.20.0"

# ✅ CORRECT
requires:
  - plugin-dependency-id
  - another-plugin-id

# ✅ ALSO CORRECT - omit entirely if no dependencies
# (no requires field)
```

### Issue: "parsing time ... cannot parse '' as '15'"
**Cause:** Date field is date-only, missing time component
**Fix:** Use `date +'%Y-%m-%d %H:%M:%S'` instead of `date +%Y-%m-%d`

### Issue: "$(date +%Y-%m-%d)" literal in output
**Cause:** Heredoc uses single quotes `'EOF'` preventing expansion
**Fix:**
1. Calculate date in variable first: `DATETIME=$(date +'%Y-%m-%d %H:%M:%S')`
2. Use unquoted `EOF` (not `'EOF'`)
3. Reference variable: `${DATETIME}`

### Issue: GitHub Pages shows 404
**Cause:** Pages not configured for GitHub Actions
**Fix:** Settings → Pages → Source → Select "GitHub Actions"

## Testing Locally

1. Run `npm run build` to build plugin
2. Run `./build_site.sh` to generate index.yml
3. Check generated `index.yml` for correct format
4. Verify datetime format includes time: `YYYY-MM-DD HH:MM:SS`
5. Commit and push to trigger GitHub Actions
6. Check workflow at: `https://github.com/user/repo/actions`
7. Once deployed, test URL: `https://user.github.io/repo/index.yml`
