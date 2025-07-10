# 🚀 Release Automation Guide

## Overview

ContextMesh CLI uses **fully automated releases** based on conventional commits. No manual version bumping or tag creation needed!

## How It Works

### 1. **Automated Releases** (Recommended)
When you merge to `main` with conventional commits, releases happen automatically:

```bash
git commit -m "feat: add new connector validation"     # → Minor release (0.1.0 → 0.2.0)
git commit -m "fix: resolve manifest parsing error"   # → Patch release (0.1.0 → 0.1.1)
git commit -m "feat!: breaking API change"            # → Major release (0.1.0 → 1.0.0)
```

**Process:**
1. Push/merge to `main` with conventional commits
2. `auto-release.yml` workflow triggers
3. Semantic-release analyzes commits and determines version bump
4. Creates GitHub release + tag automatically
5. Publishes to NPM
6. Builds and attaches cross-platform binaries

### 2. **Manual Release** (Fallback)
Use GitHub UI or workflow dispatch for manual releases:

```bash
# Via GitHub Actions UI
Actions → Manual Release → Run workflow → Enter version (e.g., "1.0.0")
```

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Release Types

| Commit Type | Example | Release Type | Version Bump |
|-------------|---------|--------------|--------------|
| `feat:` | `feat: add install command` | Minor | 0.1.0 → 0.2.0 |
| `fix:` | `fix: resolve validation bug` | Patch | 0.1.0 → 0.1.1 |
| `feat!:` or `BREAKING CHANGE:` | `feat!: change CLI API` | Major | 0.1.0 → 1.0.0 |
| `docs:` | `docs: update README` | No release | - |
| `chore:` | `chore: update dependencies` | No release | - |

## Workflow Files

### Automated Release (`auto-release.yml`)
- **Trigger:** Push to `main`
- **Features:** Semantic versioning, NPM publish, binary building
- **Outputs:** GitHub release with downloadable binaries

### PR Validation (`validate-pr.yml`)
- **Trigger:** Pull requests to `main`
- **Features:** Commit message validation, release preview
- **Benefits:** Ensures proper conventional commits

### CI Pipeline (`ci.yml`)
- **Trigger:** All pushes and PRs
- **Features:** Cross-platform testing (Node 18/20/22, Ubuntu/Windows/macOS)

## Binary Distribution

Automated releases create downloadable binaries:
- **Linux:** `contextmesh-linux.tar.gz`
- **Windows:** `contextmesh-win.zip`
- **macOS x64:** `contextmesh-macos.tar.gz`
- **macOS ARM64:** `contextmesh-macos-arm64.tar.gz`

## Security & Secrets

Required GitHub secrets:
- `NPM_TOKEN` - NPM publishing token with 2FA
- `GITHUB_TOKEN` - Automatically provided by GitHub

## Example Workflow

```bash
# 1. Create feature branch
git checkout -b feat/install-command

# 2. Make changes and commit with conventional format
git commit -m "feat: implement connector install command

Add support for installing connectors from registry with:
- Version resolution
- Dependency management  
- Progress indicators

Closes #5"

# 3. Create PR
gh pr create --title "feat: implement connector install command"

# 4. PR validation runs automatically
# 5. Merge to main
gh pr merge --squash

# 6. Automated release triggers
# 7. New version published to NPM + GitHub releases!
```

## Release Notes

Automated releases generate release notes from conventional commits:

```markdown
## [1.1.0] - 2025-01-10

### Features
- implement connector install command (#5)
- add progress indicators for downloads (#7)

### Bug Fixes  
- resolve manifest validation errors (#6)
- fix cross-platform path handling (#8)
```

## Troubleshooting

### No Release Created
- Check commit messages follow conventional format
- Ensure commits contain features/fixes (not just docs/chore)
- Verify GitHub Actions has proper permissions

### Release Failed
- Check NPM_TOKEN is valid and has publish permissions
- Verify tests pass before release
- Review GitHub Actions logs for specific errors

### Manual Override
If automation fails, use manual release workflow:
1. Go to Actions → Manual Release
2. Enter desired version (e.g., "1.0.1")
3. Click "Run workflow"

## Configuration Files

- `.releaserc.json` - Semantic-release configuration
- `.commitlintrc.json` - Commit message validation rules
- `package.json` - Scripts and metadata
- `.github/workflows/` - GitHub Actions workflows

This automated approach ensures:
✅ Consistent versioning  
✅ No human errors in releases  
✅ Complete release history  
✅ Immediate distribution via NPM + binaries