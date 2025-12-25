---
name: release
description: Create a new version release with git tag and GitHub Release. Use when user asks to release, publish, create a new version, or ship a release.
---

# Release Skill

Create a new version release using a PR-based workflow for Claude review.

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

## Release Process (PR-Based)

### Step 1: Determine Version Bump

1. **Check current version**: Read `package.json` version field
2. **Review commits since last tag**: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
3. **Determine bump type**:

| Commit Types | Bump | Example |
|--------------|------|---------|
| Breaking changes (`feat!:`, `BREAKING CHANGE`) | MAJOR | 0.1.0 → 1.0.0 |
| New features (`feat:`) | MINOR | 0.1.0 → 0.2.0 |
| Bug fixes, patches (`fix:`, `docs:`, `chore:`) | PATCH | 0.1.0 → 0.1.1 |

### Step 2: Create Release Branch & PR

```bash
# Create release branch
git checkout -b release/vX.Y.Z

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

# Push branch
git push -u origin release/vX.Y.Z

# Create PR for review
gh pr create --title "🔖 Release vX.Y.Z" --body "$(cat <<'EOF'
## Release vX.Y.Z

### Changes
<!-- Summary of changes in this release -->

### Checklist
- [ ] Version bumped in package.json
- [ ] Tests pass
- [ ] Build succeeds

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 3: After PR Merge - Create Tag

Once the PR is reviewed and merged:

```bash
# Switch to main and pull
git checkout main
git pull origin main

# Create and push tag
git tag vX.Y.Z
git push origin vX.Y.Z
```

## What Happens After Tag Push

GitHub Actions automatically:
1. Runs CI (type-check, lint, tests)
2. Builds the plugin
3. Updates GitHub Pages (Stash plugin index) - **only on tags**
4. Creates GitHub Release with:
   - Auto-generated changelog from PR titles/commits
   - Installation instructions
   - ZIP file attached

**Note:** Regular pushes to main only run tests. The plugin index is NOT updated on every push - this prevents false "update available" notifications in Stash.

## Quick Release (Skip PR)

For urgent patches where PR review isn't needed:

```bash
# On main branch, update package.json version, then:
git add package.json
git commit -m "🔖 chore: release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

## Important Notes

- Tag format MUST be `vX.Y.Z` (e.g., `v0.2.0`)
- Version in `package.json` must match tag (without `v` prefix)
- PR workflow allows Claude to review changes before release
- Release will fail if CI checks don't pass
- Verify release succeeded in GitHub Actions after pushing tag
