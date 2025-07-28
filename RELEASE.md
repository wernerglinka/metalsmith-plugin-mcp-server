# Release Process Documentation

## Overview

This document explains the automated release process for Metalsmith plugins and the MCP server, including the issues we encountered and how they were resolved.

## The Problem We Solved

### Initial Issues

When attempting to create releases, we encountered these problems:

1. **GitHub releases weren't being created** - Only git tags were pushed
2. **release-it showed warnings** - "Environment variable GITHUB_TOKEN is required"
3. **Only generated web URLs** - Instead of creating actual GitHub releases
4. **Token export didn't work** - Setting `export GITHUB_TOKEN=$(gh auth token)` in hooks failed

### Root Cause

The fundamental issue was that **environment variables set in release-it hooks don't persist to the main release-it process**. Each hook runs in its own subprocess, so when we tried:

```json
{
  "hooks": {
    "before:github:release": "export GITHUB_TOKEN=$(gh auth token)"
  }
}
```

The `GITHUB_TOKEN` was only available within that specific hook's subprocess, not to release-it itself.

## The Solution

### Key Insight

Environment variables must be set at the **process level** when release-it starts, not in hooks.

### Implementation

#### 1. Package.json Scripts

Set the token at the script level:

```json
{
  "scripts": {
    "release:patch": "GH_TOKEN=$(gh auth token) release-it patch",
    "release:minor": "GH_TOKEN=$(gh auth token) release-it minor",
    "release:major": "GH_TOKEN=$(gh auth token) release-it major"
  }
}
```

#### 2. Release-it Configuration (.release-it.json)

```json
{
  "git": {
    "commitMessage": "chore: release v${version}",
    "requireCleanWorkingDir": true,
    "requireBranch": "main",
    "tag": true,
    "tagName": "v${version}",
    "push": true,
    "changelog": "npx auto-changelog -u --commit-limit false --ignore-commit-pattern '^((dev|chore|ci):|Release)' --stdout"
  },
  "github": {
    "release": true,
    "releaseName": "v${version}",
    "draft": false,
    "autoGenerate": false,
    "tokenRef": "GH_TOKEN"
  },
  "npm": {
    "publish": false,
    "publishPath": "."
  },
  "hooks": {
    "before:init": ["npm test", "npm run lint"],
    "before:git": [
      "gh --version || (echo 'GitHub CLI not found. Install with: brew install gh' && exit 1)",
      "gh auth status || (echo 'GitHub CLI not authenticated. Run: gh auth login' && exit 1)"
    ],
    "after:bump": "npx auto-changelog -p --commit-limit false --ignore-commit-pattern '^((dev|chore|ci):|Release)' && git add CHANGELOG.md",
    "after:release": "echo Successfully released ${name} v${version} to ${repo.repository}."
  }
}
```

## How It Works

### Step-by-Step Process

1. **User runs release command**

   ```bash
   npm run release:patch
   ```

2. **Script execution begins**
   - `GH_TOKEN=$(gh auth token)` executes first
   - `gh auth token` retrieves the token from GitHub CLI's secure storage
   - The token is set as `GH_TOKEN` environment variable for the entire process

3. **release-it starts with token available**
   - release-it reads `GH_TOKEN` via `"tokenRef": "GH_TOKEN"`
   - The token is available throughout the entire release-it execution

4. **Automated release process**
   - Runs tests and linting
   - Updates version in package.json
   - Generates changelog
   - Creates git commit and tag
   - Pushes to GitHub
   - **Creates GitHub release automatically** (this is what was failing before)

### Why GH_TOKEN Instead of GITHUB_TOKEN?

- GitHub CLI prefers `GH_TOKEN` over `GITHUB_TOKEN`
- Using `GH_TOKEN` avoids conflicts with other tools that might set `GITHUB_TOKEN`
- It's the recommended approach for GitHub CLI integration

## Prerequisites

### 1. Install GitHub CLI

**macOS:**

```bash
brew install gh
```

**Ubuntu/Debian:**

```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

**Windows:**

```bash
choco install gh
```

### 2. Authenticate GitHub CLI

```bash
# Interactive authentication
gh auth login

# Follow prompts:
# - Choose GitHub.com
# - Choose HTTPS
# - Authenticate via web browser
# - Approve access

# Verify authentication
gh auth status
```

## Common Issues and Solutions

### Issue: "GITHUB_TOKEN not found" warning

**Solution**: Make sure you're using the updated scripts with `GH_TOKEN=$(gh auth token)`.

### Issue: GitHub release still not created

**Check these:**

1. Is GitHub CLI authenticated? Run `gh auth status`
2. Is the token being set? Run `GH_TOKEN=$(gh auth token) && echo $GH_TOKEN`
3. Check .release-it.json has `"github": { "release": true, "tokenRef": "GH_TOKEN" }`

### Issue: Permission denied when creating release

**Solution**: Ensure your GitHub CLI has the necessary scopes:

```bash
gh auth refresh -s repo,write:packages
```

### Issue: Works on macOS but not on Windows

**Solution**: Windows command prompt doesn't support the `$(command)` syntax. Use Git Bash or WSL, or set the token manually:

```cmd
# First get the token
gh auth token

# Then set it and run release-it
set GH_TOKEN=your-token-here && release-it patch
```

## Testing the Release Process

### Dry Run

Test without actually creating a release:

```bash
GH_TOKEN=$(gh auth token) release-it patch --dry-run
```

### Verify Token is Available

```bash
# This should output your GitHub token
GH_TOKEN=$(gh auth token) node -e "console.log(process.env.GH_TOKEN ? 'Token is set' : 'Token is NOT set')"
```

## What Happens During a Release

1. **Pre-checks** (`before:init`)
   - Runs tests
   - Runs linting
   - Ensures GitHub CLI is installed and authenticated

2. **Version bump**
   - Updates version in package.json
   - Generates changelog entry for this version

3. **Git operations**
   - Creates commit: "chore: release vX.Y.Z"
   - Creates tag: "vX.Y.Z"
   - Pushes commit and tag to GitHub

4. **GitHub release creation**
   - Uses the GH_TOKEN to authenticate
   - Creates a GitHub release with:
     - Title: "vX.Y.Z"
     - Body: Changelog for this version
     - Attached to the git tag

5. **Success message**
   - Confirms the release was created

## Troubleshooting

### Enable Debug Mode

See what's happening under the hood:

```bash
DEBUG=release-it:* GH_TOKEN=$(gh auth token) release-it patch
```

### Check Token Manually

```bash
# Get token
gh auth token

# Test GitHub API access
curl -H "Authorization: token $(gh auth token)" https://api.github.com/user
```

### Reset GitHub CLI Authentication

If things aren't working:

```bash
# Logout
gh auth logout

# Login again
gh auth login
```

## Summary

The key to making automated GitHub releases work is:

1. **Set `GH_TOKEN` at the script level** in package.json
2. **Use `"tokenRef": "GH_TOKEN"`** in .release-it.json
3. **Enable `"release": true`** in the github section
4. **Ensure GitHub CLI is authenticated** before releasing

This approach ensures the token is available to the entire release-it process, allowing it to create GitHub releases automatically without manual intervention.
