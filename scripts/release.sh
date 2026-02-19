#!/bin/bash

# Secure release script for GitHub releases
# Usage: ./scripts/release.sh [patch|minor|major] [options]
# All options after release type are passed through to release-it

set -e

# Check for release type argument
if [ $# -eq 0 ]; then
    echo "Error: Please specify release type (patch, minor, or major)"
    echo "Usage: ./scripts/release.sh [patch|minor|major] [options]"
    exit 1
fi

# Get release type and shift to pass remaining args
RELEASE_TYPE=$1
shift

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "Error: Release type must be patch, minor, or major"
    echo "Usage: ./scripts/release.sh [patch|minor|major] [options]"
    exit 1
fi

# Check for GitHub CLI authentication
if ! gh auth status >/dev/null 2>&1; then
    echo "Error: GitHub CLI not authenticated. Run: gh auth login"
    exit 1
fi

echo "Starting $RELEASE_TYPE release..."

# Clear any existing GITHUB_TOKEN that might interfere
unset GITHUB_TOKEN

# Set the GitHub token securely from gh CLI
export GH_TOKEN=$(gh auth token)

# Run release-it with the specified type and pass through all remaining args
npx release-it "$RELEASE_TYPE" "$@"

echo "Release completed successfully!"
