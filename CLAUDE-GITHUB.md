# Claude GitHub Action Setup Documentation

This document comprehensively details the process of setting up Claude Code Action for GitHub integration, including troubleshooting steps and solutions encountered during the setup.

## Overview

Claude Code Action is a GitHub Action that allows Claude AI to interact with your pull requests and issues. It can review code, suggest improvements, fix issues, and respond to comments when mentioned with `@claude`.

## Prerequisites

1. GitHub repository with admin access
2. Anthropic API key from https://console.anthropic.com/
3. GitHub CLI (`gh`) installed and authenticated

## Setup Process

### Step 1: Initial GitHub CLI Authentication Issue

**Problem**: VS Code's built-in Git and GitHub integrations, as well as extensions like Copilot, often inject a `GITHUB_TOKEN` into the terminal environment for their own authentication. When this token is invalid or expired, it interferes with GitHub CLI's authentication process, preventing `gh auth login` from working correctly.

**Error**:
```
GitHub CLI not authenticated
GitHub CLI does not appear to be authenticated.
```

When checking `gh auth status`:
```
X Failed to log in to github.com using token (GITHUB_TOKEN)
- Active account: true
- The token in GITHUB_TOKEN is invalid.
```

**Solution Applied**: Updated `~/.zshrc` to always clear the invalid token:

```bash
# Ensure GITHUB_TOKEN doesn't interfere with gh CLI
# VS Code/Copilot may inject an invalid token - always unset it
unset GITHUB_TOKEN
```

After updating `.zshrc`, reload the shell:
```bash
source ~/.zshrc
```

**Alternative Solutions**:

1. **Disable VS Code's automatic Git authentication**:
   - Open VS Code Settings (Cmd+,)
   - Search for "git.terminalAuthentication" and uncheck
   - Search for "github.gitAuthentication" and uncheck
   - Restart VS Code

2. **Clear cached authentication tokens**:
   - Open VS Code Command Palette (Cmd+Shift+P)
   - Run "GitHub: Sign out"
   - Run "GitHub: Clear all sessions"
   - Delete `~/.github-copilot` folder if it exists
   - Restart VS Code

3. **Temporary fix for current session**:
   ```bash
   unset GITHUB_TOKEN && gh auth login
   ```

**Verification**:
```bash
unset GITHUB_TOKEN && gh auth status
```

Should show:
```
✓ Logged in to github.com account <username> (keyring)
- Active account: true
```

**Note**: This is a known issue where VS Code's GitHub integration conflicts with GitHub CLI. The `unset GITHUB_TOKEN` in shell configuration ensures GitHub CLI always works correctly without affecting VS Code's functionality.

### Step 2: Distinguishing Between GitHub Apps

**Issue**: Initially confused between two different GitHub Apps:
- "Claude" - A generic app (not the correct one)
- "Claude Code Action" - The correct app for GitHub Actions integration

**Solution**: Identified that the correct app shows this description:
> Run Claude Code from your GitHub Pull Requests and Issues to respond to reviewer feedback, fix CI errors, or modify code, turning it into a virtual teammate that works alongside your development pipelines.

### Step 3: Creating the GitHub Actions Workflow

Created `.github/workflows/claude-code.yml`:

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]
  issue_comment:
    types: [created]

jobs:
  claude-code:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@beta
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Step 4: Adding the Anthropic API Key

**Navigation Path**:
1. Go to your repository on GitHub
2. Click "Settings" (in the repository menu, not user settings)
3. In the left sidebar, find "Secrets and variables"
4. Click "Actions"
5. Click "New repository secret"
6. Name: `ANTHROPIC_API_KEY`
7. Value: Your Anthropic API key from https://console.anthropic.com/

**Note**: The API key for GitHub Actions is separate from your Claude.ai subscription and is billed based on API usage.

### Step 5: Troubleshooting Workflow Issues

#### Issue 1: Invalid Action Version

**Error**:
```
Unable to resolve action anthropics/claude-code-action@v1, unable to find version v1
```

**Solution**: Changed from `@v1` to `@beta` in the workflow file.

#### Issue 2: Missing OIDC Permissions

**Error**:
```
Could not fetch an OIDC token. Did you remember to add id-token: write to your workflow permissions?
```

**Solution**: Added `id-token: write` to the permissions section.

#### Issue 3: Incorrect Parameter Name

**Error**:
```
Unexpected input(s) 'api-key', valid inputs are ['anthropic_api_key', ...]
```

**Solution**: Changed `api-key` to `anthropic_api_key` in the workflow file.

## Testing the Setup

1. Created a test branch:
   ```bash
   git checkout -b test-claude-action
   ```

2. Added a test file and the workflow:
   ```bash
   echo "# Test File\n\nThis is a test." > test-file.md
   git add .
   git commit -m "test: add test file to verify Claude Code Action"
   git push -u origin test-claude-action
   ```

3. Created a pull request:
   ```bash
   gh pr create --title "Test Claude Code Action" --body "This PR tests if Claude Code Action is properly configured. @claude please verify you can see this."
   ```

4. Verified Claude responded in the PR

5. Cleaned up:
   ```bash
   gh pr close 1 --delete-branch
   ```

## Usage

Once set up, you can interact with Claude in any pull request by:

1. Mentioning `@claude` in a comment
2. Examples:
   - `@claude can you review this code?`
   - `@claude please add error handling to this function`
   - `@claude what improvements would you suggest?`
   - `@claude can you fix the failing tests?`

Claude will respond directly in the PR and can:
- Review code changes
- Suggest improvements
- Push commits with fixes
- Answer questions about the code
- Help with debugging

## Common Issues and Solutions

### VS Code Terminal Token Injection
If GitHub CLI authentication fails in VS Code terminal, always run:
```bash
unset GITHUB_TOKEN
```
Or add the unset command to your shell configuration file.

### Repository Settings vs User Settings
Ensure you're in repository settings (not user settings) when adding secrets:
- Repository settings URL: `https://github.com/<username>/<repo>/settings`
- Look for "Settings" in the repository navigation bar, not your profile menu

### Verifying Installation
Check if Claude Code Action is installed:
1. Go to https://github.com/settings/installations
2. Look for "Claude" or "Claude Code Action"
3. Ensure your repository is in the selected repositories list

## Security Considerations

- The `ANTHROPIC_API_KEY` is stored as an encrypted secret in GitHub
- Only workflows in your repository can access this secret
- The key is never exposed in logs or PR comments
- Each API call is billed to your Anthropic account

## Additional Resources

- [Claude Code Action Documentation](https://github.com/anthropics/claude-code-action)
- [Anthropic Console](https://console.anthropic.com/) - For API key management
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Summary

The setup process involved:
1. Resolving GitHub CLI authentication issues caused by VS Code
2. Installing the correct Claude GitHub App
3. Creating a properly configured workflow file
4. Adding the Anthropic API key as a repository secret
5. Fixing various configuration issues (action version, permissions, parameter names)
6. Successfully testing the integration

The Claude Code Action is now ready to assist with code reviews, bug fixes, and development tasks directly within GitHub pull requests.