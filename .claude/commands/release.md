# Claude Command: Release

This command helps you create a new release with proper versioning and tagging.

## Usage

To create a release, just type:
```
/release
```

Or with a specific version:
```
/release 0.2.0
```

Or with bump type:
```
/release patch
/release minor
/release major
```

## What This Command Does

1. Checks current version in `package.json`
2. Reviews recent commits since last tag to determine appropriate version bump
3. If no version specified, suggests bump type based on commit history:
   - `feat:` commits → minor bump
   - `fix:` commits only → patch bump
   - `feat!:` or `BREAKING CHANGE` → major bump
4. Updates `package.json` with new version
5. Commits the version bump: `🔖 chore: release vX.Y.Z`
6. Creates git tag: `vX.Y.Z`
7. Pushes commit and tag to origin

## Version Bump Rules

| Commit Types | Bump | Example |
|--------------|------|---------|
| Breaking changes (`feat!:`, `BREAKING CHANGE`) | MAJOR | 0.1.0 → 1.0.0 |
| New features (`feat:`) | MINOR | 0.1.0 → 0.2.0 |
| Bug fixes, patches (`fix:`, `docs:`, etc.) | PATCH | 0.1.0 → 0.1.1 |

## What Happens After Push

GitHub Actions automatically:
1. Runs CI (type-check, lint, tests)
2. Builds the plugin
3. Updates GitHub Pages (Stash plugin index)
4. Creates GitHub Release with ZIP attached

## Pre-Release Checklist

Before creating a release, ensure:
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No uncommitted changes (`git status`)
- [ ] On main branch

## Examples

```bash
# Auto-determine version based on commits
/release

# Specific version
/release 1.0.0

# Bump types
/release patch  # 0.1.0 → 0.1.1
/release minor  # 0.1.0 → 0.2.0
/release major  # 0.1.0 → 1.0.0
```

## Release Commit Format

The release commit will always use this format:
```
🔖 chore: release vX.Y.Z

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Important Notes

- Tag format MUST be `vX.Y.Z` (e.g., `v0.2.0`)
- Version in `package.json` should match tag (without `v` prefix)
- Always ensure you're on the main branch before releasing
- The release workflow will fail if tests don't pass
- Check GitHub Actions after pushing to verify the release succeeded
