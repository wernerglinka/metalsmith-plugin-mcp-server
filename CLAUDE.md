# Metalsmith Plugin MCP Server - Development Context

## Communication Style

Maintain a friendly, professional, straightforward tone. Skip the enthusiasm and pleasantries - focus on solving problems effectively.

- Be direct and concise in responses
- Point out potential issues or better approaches when you see them
- Provide critical feedback when warranted
- Avoid phrases like "Great question!", "I'd be happy to...", or excessive praise
- Lead with the solution, not the preamble
- If something is wrong or could be improved, say so clearly
- Prioritize code quality and correctness over being agreeable

Remember: The goal is effective solutions, not making the user feel good about suboptimal choices.

## Error Handling

Focus on getting to successful results quickly:

- Fail fast with clear, actionable error messages
- Don't over-engineer error handling for unlikely edge cases
- Validate inputs early to catch problems at the source
- Use explicit error returns rather than exceptions where appropriate
- When errors occur, provide specific information about what went wrong and how to fix it
- Avoid defensive programming that obscures the actual problem
- If recovery is possible and straightforward, do it; otherwise, fail clearly

## Project Overview

This is an MCP (Model Context Protocol) server for scaffolding and validating high-quality Metalsmith plugins. It provides tools for Claude to help users create, validate, and maintain Metalsmith plugins following best practices.

## Current Status (v0.13.0)

### Recent Major Work Completed (v0.13.0)

1. **Show-Template Command** - New command to display recommended configuration templates for release-it, package scripts, ESLint, Prettier, etc.
2. **Enhanced Release Configuration** - Fixed .release-it.json template to include proper `tokenRef: "GH_TOKEN"` for consistent token handling
3. **Comprehensive Token Validation** - Added validation that checks consistency between package.json scripts and .release-it.json token references
4. **Improved UX** - Resolved configs command forEach error and enhanced validation messages to mention both package.json and .release-it.json issues
5. **Template Fixes** - Corrected README template debug section to use proper `metalsmith.env('DEBUG', 'plugin-name*')` format

### Previous Major Work (v0.9.0-v0.12.0)

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

# Show recommended configuration templates
npx metalsmith-plugin-mcp-server show-template release-it
npx metalsmith-plugin-mcp-server show-template package-scripts

# Generate configuration files
npx metalsmith-plugin-mcp-server configs ./plugin
```

## Development Patterns

### Metalsmith Dependency Pattern

**Important**: Metalsmith should be listed in `devDependencies`, not `peerDependencies` in plugin package.json files. This is because:

1. Metalsmith is required for running tests (tests import and use Metalsmith directly)
2. The plugin itself doesn't need Metalsmith at runtime - it receives the metalsmith instance as a parameter
3. Users will have Metalsmith installed in their own projects where they use the plugin
4. Having it in devDependencies ensures tests can run during development and CI

This differs from some other plugin ecosystems where the framework is a peer dependency. For Metalsmith plugins, the pattern is to have it as a dev dependency only.

### Metalsmith Native Methods

**CRITICAL**: Always prefer Metalsmith's native methods over external dependencies when available:

- **metalsmith.debug()** instead of the `debug` package
- **metalsmith.match()** instead of `minimatch` package
- **metalsmith.env()** instead of `process.env`
- **metalsmith.path()** instead of manual path manipulation

The MCP server validates for these patterns and will recommend switching to native methods. This reduces dependencies, ensures consistency, and follows Metalsmith best practices.

**Example**:

```javascript
// ❌ External dependency
const debug = require('debug')('my-plugin');
const minimatch = require('minimatch');

// ✅ Native methods
const debug = metalsmith.debug('my-plugin');
const isMatch = metalsmith.match(pattern, filename);
```

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

## Pre-Commit and Release Workflow

### CRITICAL: Always Run Pre-Commit Validation

**Before ANY commit or release, ALWAYS run these commands in order:**

```bash
npm run lint          # Fix linting issues
npm run format        # Format code consistently
npm test              # Ensure all tests pass
```

**If any of these commands fail, you MUST fix the issues before proceeding with commits or releases.**

### Common Linting Fixes

When linting fails, common issues include:

- Missing semicolons or trailing commas
- Inconsistent indentation or spacing
- Unused variables or imports
- JSDoc formatting issues

**Always run `npm run lint` to automatically fix most issues, then check `npm run lint:check` to verify.**

### Release Commands

Only after successful pre-commit validation:

```bash
npm run release:patch  # For bug fixes
npm run release:minor  # For new features
npm run release:major  # For breaking changes
```

## Release Information

### Current Version: 0.13.0

- **NEW**: show-template command for displaying recommended configuration templates
- **FIXED**: configs command forEach error resolved
- **ENHANCED**: .release-it.json template now includes proper tokenRef: "GH_TOKEN"
- **IMPROVED**: comprehensive validation for token reference consistency between package.json and .release-it.json
- **FIXED**: README template debug section uses correct metalsmith.env format
- All UX issues from user feedback addressed
- All tests passing
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

**CRITICAL: npm Publishing Configuration**:

The `.release-it.json` file has `"npm.publish": false` **intentionally**. This is NOT a bug:

- npm publishing is done manually by Werner
- DO NOT change this setting to `true`
- The comment in the file explains this is intentional

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

### Release Notes Generation Fix

**IMPORTANT**: Fixed a critical issue where GitHub releases only showed Snyk auto-fixes instead of our meaningful commits.

**Problem**: The release-it configuration had `"autoGenerate": false` but wasn't explicitly using our CHANGELOG.md content for GitHub release notes.

**Solution**: Added `"releaseNotes"` configuration to both the main .release-it.json and the template:

```json
{
  "github": {
    "autoGenerate": false,
    "releaseNotes": "npx auto-changelog -u --commit-limit false --ignore-commit-pattern '^((dev|chore|ci):|Release)' --stdout"
  }
}
```

This ensures GitHub releases now show our actual feature commits and fixes instead of just dependency updates.

### Next Release Preparation

- GitHub releases will now properly show meaningful commits and features
- Monitor that release notes include our actual changes, not just Snyk updates
- The changelog generation is working correctly and ignores maintenance commits

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
