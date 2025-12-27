---
name: release
description: Create a new version release with git tag and GitHub Release. Use when user asks to release, publish, create a new version, or ship a release.
---

# Release Skill

Create a new version release using tag-based workflow.

## When to Use

- User explicitly asks to "release" or "create a release"
- User asks to "publish" or "ship" a new version
- User asks to "tag" a version
- User says "let's release v0.2.0" or similar

## Pre-Release Checklist

Before creating a release, verify:
1. On dev branch: `git branch --show-current`
2. No uncommitted changes: `git status`
3. Type-check passes: `npm run type-check`
4. Lint passes: `npm run lint`
5. Tests pass: `npm test -- --run`
6. Build succeeds: `npm run build`

## Release Process (Tag-Based)

### Step 1: Determine Version Bump

1. **Check current version**: Read `package.json` version field
2. **Review commits since last tag**: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
3. **Determine bump type**:

| Commit Types | Bump | Example |
|--------------|------|---------|
| Breaking changes (`feat!:`, `BREAKING CHANGE`) | MAJOR | 0.1.0 → 1.0.0 |
| New features (`feat:`) | MINOR | 0.1.0 → 0.2.0 |
| Bug fixes, patches (`fix:`, `docs:`, `chore:`) | PATCH | 0.1.0 → 0.1.1 |

### Step 2: Merge dev to main and Release

```bash
# From dev branch, checkout main and merge
git checkout main
git merge dev

# Update version in package.json
# (edit the file)

# Commit the version bump
git add package.json
git commit -m "$(cat <<'COMMIT'
🔖 chore: release vX.Y.Z

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
COMMIT
)"

# Create and push tag
git tag vX.Y.Z
git push origin main --tags
```

### Step 3: Wait and Sync Dev

**⚠️ CRITICAL: Do NOT push to dev immediately!**

GitHub Pages uses a concurrency group. If you push to dev before the stable workflow finishes, the stable deploy gets CANCELLED.

```bash
# 1. Wait for workflow to complete
#    Check: https://github.com/Codename-11/Stash-Downloader/actions

# 2. AFTER workflow completes, sync dev with main
git checkout dev
git merge main
git push origin dev
```

## What Happens After Tag Push

GitHub Actions automatically:
1. Runs CI (type-check, lint, tests)
2. Builds the plugin
3. Updates GitHub Pages (Stash plugin index)
4. Generates AI release notes (if GOOGLE_API_KEY configured)
5. Creates GitHub Release with:
   - Auto-generated changelog
   - Installation instructions
   - ZIP file attached

## If Release Was Cancelled

If you accidentally pushed to dev too early and cancelled the stable deploy:

```bash
# Re-push the tag to trigger the workflow again
git push origin --delete vX.Y.Z
git push origin vX.Y.Z
```

## PR-Based Release (Optional)

For significant releases where you want Claude review before merging:

```bash
# Create release branch from dev
git checkout -b release/vX.Y.Z dev

# Update version in package.json, commit
git add package.json
git commit -m "🔖 chore: release vX.Y.Z"

# Push and create PR to main
git push -u origin release/vX.Y.Z
gh pr create --base main --title "🔖 Release vX.Y.Z" --body "Release notes..."

# After PR merge, checkout main and tag
git checkout main
git pull origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

## Important Notes

- Tag format MUST be `vX.Y.Z` (e.g., `v0.2.0`)
- Version in `package.json` must match tag (without `v` prefix)
- **Always start from dev branch** - never commit directly to main
- **Wait for workflow to complete** before syncing dev
- Push to `main` without a tag triggers NOTHING
- Verify release succeeded in GitHub Actions after pushing tag
