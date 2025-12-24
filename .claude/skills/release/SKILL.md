---
name: release
description: Create a new version release with git tag and GitHub Release. Use when user asks to release, publish, create a new version, or ship a release.
---

# Release Skill

Create a new version release with proper versioning, git tagging, and GitHub Release automation.

## When to Use

- User explicitly asks to "release" or "create a release"
- User asks to "publish" or "ship" a new version
- User asks to "tag" a version
- User says "let's release v0.2.0" or similar

## Pre-Release Checklist

Before creating a release, verify:
1. All tests pass: `npm test -- --run`
2. Build succeeds: `npm run build`
3. No uncommitted changes: `git status`
4. On main branch: `git branch --show-current`

## Process

1. **Check current version**: Read `package.json` version field
2. **Review commits since last tag**: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
3. **Determine version bump**:
   - `feat!:` or `BREAKING CHANGE` → MAJOR (0.1.0 → 1.0.0)
   - `feat:` commits → MINOR (0.1.0 → 0.2.0)
   - `fix:`, `docs:`, etc. → PATCH (0.1.0 → 0.1.1)
4. **Update package.json** with new version
5. **Commit version bump**: `🔖 chore: release vX.Y.Z`
6. **Create tag**: `git tag vX.Y.Z`
7. **Push with tags**: `git push origin main --tags`

## Version Bump Rules

| Commit Types | Bump | Example |
|--------------|------|---------|
| Breaking changes (`feat!:`, `BREAKING CHANGE`) | MAJOR | 0.1.0 → 1.0.0 |
| New features (`feat:`) | MINOR | 0.1.0 → 0.2.0 |
| Bug fixes, patches (`fix:`, `docs:`, `chore:`) | PATCH | 0.1.0 → 0.1.1 |

## Release Commit Format

```
🔖 chore: release vX.Y.Z

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## What Happens After Push

GitHub Actions automatically:
1. Runs CI (type-check, lint, tests)
2. Builds the plugin
3. Updates GitHub Pages (Stash plugin index)
4. Creates GitHub Release with ZIP attached

## Example Commands

```bash
# Update version in package.json (e.g., 0.1.0 → 0.2.0)
# Then:

git add package.json
git commit -m "$(cat <<'COMMIT'
🔖 chore: release v0.2.0

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
COMMIT
)"

git tag v0.2.0
git push origin main --tags
```

## Important Notes

- Tag format MUST be `vX.Y.Z` (e.g., `v0.2.0`)
- Version in `package.json` must match tag (without `v` prefix)
- Always ensure you're on main branch
- Release will fail if CI checks don't pass
- Verify release succeeded in GitHub Actions after pushing
