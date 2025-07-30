# Metalsmith Plugin MCP Server - Development Context

## Project Overview

This is an MCP (Model Context Protocol) server for scaffolding and validating high-quality Metalsmith plugins. It provides tools for Claude to help users create, validate, and maintain Metalsmith plugins following best practices.

## Current Status (v0.9.0)

### Recent Major Work Completed

1. **Metalsmith-Specific Validation Refactor** - Complete overhaul of validation logic to focus on actual Metalsmith plugin patterns
2. **Removed Inappropriate Server Validations** - Eliminated caching, file I/O, DoS protection, and other server-oriented checks
3. **Added Plugin Pattern Validation** - New `metalsmith-patterns` check for factory functions, signatures, and metadata handling
4. **Build-Time Security Focus** - Refactored security checks to focus on build-time concerns (dependency security, error handling)
5. **Performance Optimization for Static Sites** - Updated performance checks for in-memory object transformations
6. **Metalsmith Context Documentation** - Added comprehensive guide explaining Metalsmith's execution model

### Core Philosophy: "Evaluate, Judge, and Inform"

The validation system follows this approach:

- **Evaluate**: Analyze what actually exists and works
- **Judge**: Make intelligent decisions about whether improvements are needed
- **Inform**: Provide specific, actionable feedback
- **Respect**: Author autonomy in license choices, naming conventions, etc.

## Key Architecture Decisions

### 1. Validation Categories

- ✓ **Passed**: Requirements that are met
- ✗ **Failed**: Critical issues that must be fixed
- ⚠ **Warnings**: Quality concerns (e.g., low test coverage)
- 💡 **Recommendations**: Optional improvements with actionable commands

### 2. Feature System

Uses exact strings only:

- `async-processing`: Batch processing and async capabilities
- `background-processing`: Worker thread support
- `metadata-generation`: Metadata extraction features

### 3. Configuration Files

- `.metalsmith-plugin-mcp` - Plugin scaffolding defaults
- `.metalsmith-plugin-validation.json` - Validation rule customization

## Important Implementation Details

### Default Behavior Changes

- **Old**: Empty features array `[]`
- **New**: Async processing by default `['async-processing']`
- **Rationale**: Modern plugins should include async capabilities

### Validation Approach

- **License**: Check presence only, not specific type (author choice)
- **Naming**: metalsmith- prefix is recommendation, not requirement
- **Structure**: Intelligent analysis based on actual code complexity
- **Functional**: Optional `--functional` flag runs actual tests/coverage

### Release Process

- **Problem**: Recurring GitHub release automation failures (token not persisting from hooks)
- **Solution**: GitHub CLI integration via secure shell script: `./scripts/release.sh`
- **Benefit**: No more token issues, fully automated GitHub releases
- **Requirement**: Developers need `gh CLI` installed and authenticated
- **Key Fix**: Environment variable must be set at script level in package.json, not in hooks

**IMPORTANT**: The release scripts now include the `--ci` flag automatically and use a secure shell script:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

The scripts use `./scripts/release.sh` which securely handles GitHub authentication without exposing tokens in package.json.

## User Workflows

### For Claude Code Integration

When users ask validation questions, guide them to use:

> "Does the MCP server have any recommendations for this plugin?"
> "Run the MCP validation on this plugin and implement any recommendations."

### CRITICAL: Following MCP Server Recommendations

**When the MCP server provides recommendations, ALWAYS:**

1. Implement them EXACTLY as shown in the recommendation output
2. Do NOT create your own interpretation or "simplified" version
3. Copy the exact code snippets provided by the MCP server
4. If a recommendation references existing patterns in CLAUDE.md, use those patterns precisely

**Example**: If the MCP server recommends a release configuration, copy it exactly rather than creating a custom implementation.

### For CLI Usage

```bash
# Show current setup
npx metalsmith-plugin-mcp-server config

# Create modern plugin (includes async-processing by default)
npx metalsmith-plugin-mcp-server scaffold my-plugin "Description here"

# Validate with actual test runs
npx metalsmith-plugin-mcp-server validate ./plugin --functional
```

## Development Patterns

### When Adding New Validation Rules

1. Make them **configurable** via validation config files
2. Provide **actionable recommendations** with specific commands
3. Distinguish between **requirements** (failed) vs **suggestions** (recommendations)
4. Include **template suggestions** where applicable

### When Modifying Features

1. Update **validation** in `src/tools/plugin-scaffold.js`
2. Update **MCP schema** in `src/index.js`
3. Update **documentation** with examples and exact strings
4. Update **tests** to reflect changes

### Code Quality Standards

- **ESLint**: Modern flat config (eslint.config.js)
- **Testing**: 100% test coverage expected
- **Documentation**: Comprehensive with examples
- **Commits**: Conventional commits with Claude attribution

## Testing Strategy

### Test Structure

- `test/plugin-scaffold.test.js` - Plugin generation tests
- `test/validate-plugin.test.js` - Validation logic tests
- All tests use temporary directories for isolation
- Both ESM and CJS plugin generation tested

### Running Tests

```bash
npm test              # All tests
npm run test:coverage # With coverage report
npm run lint          # Code quality
```

## Known Issues & Considerations

### User Feedback Patterns

- Users often want **specific commands** they can run from recommendations
- License and naming choices are **author preferences**, not requirements
- **Functional validation** is preferred over structural checks
- **Template integration** helps Claude Code act on recommendations

### Future Enhancement Areas

1. **Batch validation** for multiple plugins
2. **CI/CD integration** templates
3. **Performance optimization** for functional validation
4. **More granular configuration** options

## Release Information

### Current Version: 0.9.0

- **BREAKING**: Validation logic completely refactored for Metalsmith-specific patterns
- Removed inappropriate server-oriented recommendations (caching, DoS protection, etc.)
- Added new `metalsmith-patterns` validation check
- Updated performance and security validations for build-time context
- All tests passing (62/62)
- Metalsmith execution model documented in METALSMITH_CONTEXT.md
- Ready for production use

### Release Process Implementation

The release scripts in package.json use a secure shell script:

```json
{
  "release:patch": "./scripts/release.sh patch --ci",
  "release:minor": "./scripts/release.sh minor --ci",
  "release:major": "./scripts/release.sh major --ci"
}
```

The .release-it.json configuration uses:

```json
{
  "github": {
    "release": true,
    "tokenRef": "GH_TOKEN"
  }
}
```

**Why this works**:

- `$(gh auth token)` retrieves the token from GitHub CLI
- Setting `GH_TOKEN=` at the script level makes it available to the entire release-it process
- release-it reads `GH_TOKEN` via `tokenRef` and creates the GitHub release automatically

### Additional Release Best Practices

Based on successful plugin implementations, consider these enhancements to .release-it.json:

1. **Pre-release Authentication Check**

   ```json
   {
     "hooks": {
       "before:init": ["gh auth status"]
     }
   }
   ```

   Ensures GitHub CLI is authenticated before attempting release.

2. **Custom Release Name**

   ```json
   {
     "github": {
       "releaseName": "${name} ${version}"
     }
   }
   ```

   Uses the actual plugin name from package.json for clearer release identification in GitHub.

3. **Commit Pattern Filtering**

   ```json
   {
     "git": {
       "commitMessage": "chore: release v${version}",
       "changelog": "git log --pretty=format:\"* %s (%h)\" ${from}...${to} | grep -v -E \"^\\* (chore|ci|dev):\""
     }
   }
   ```

   Excludes development/maintenance commits from changelog for cleaner release notes.

4. **Success Confirmation**
   ```json
   {
     "hooks": {
       "after:release": "echo \"✅ Successfully released ${name} ${version}\""
     }
   }
   ```
   Provides clear feedback when release completes successfully.

### Next Release Preparation

- Expect fine-tuning based on user feedback
- The GitHub CLI release automation is now working properly
- Monitor for any edge cases in validation logic

## Communication Style

### When Working on This Project

- **Be concise** - Users want direct answers
- **Provide specific commands** - Include exact npx commands when helpful
- **Respect user choices** - Don't force conventions, recommend them
- **Focus on functionality** - Does it work? vs Does it follow structure?

### Common User Requests

1. "Validate this plugin" → Use MCP validation tool
2. "Create a plugin that..." → Use scaffold with exact name provided
3. "Fix these warnings" → Convert to actionable recommendations
4. "Make it modern" → Include async-processing features

## Development Environment Notes

- **Node.js**: ESM modules throughout
- **Package Manager**: npm (not yarn/pnpm)
- **Git Workflow**: Feature branches → PR → main
- **Dependencies**: Minimal, well-justified additions only
- **Templates**: Nunjucks-based with conditional rendering

This context should help you continue development seamlessly. The project is in a good state with solid architecture and clear patterns established.
