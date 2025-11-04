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

## CRITICAL: Configuration File Changes

**NEVER modify configuration files without explicit user permission:**

- `.release-it.json` - Release configuration (npm.publish is intentionally false)
- `package.json` - Dependencies, scripts, or metadata changes
- `eslint.config.js` - Code linting rules
- `prettier.config.js` - Code formatting rules
- Any `.json`, `.yml`, `.yaml`, or `.config.js` files

**Always ask first**: "Should I modify [config-file] to [specific change]?"

**Why**: Previous Claude instances have made "helpful" changes that broke workflows, especially changing npm.publish from false to true, causing unwanted automatic publishing.

## CRITICAL: Context Detection Before MCP Server Usage

**BEFORE using ANY MCP server command, MUST check:**

1. **Use `LS` tool to list current directory contents**
2. **Analyze the context:**
   - Files present = EXISTING project → Use `get-template` for reference only
   - Empty/no relevant files = NEW project → Use `plugin-scaffold`

**EXISTING Project Indicators:**

- `package.json` present
- `src/` directory exists
- `README.md` exists
- Any plugin-related files

**When EXISTING project detected:**

- ❌ NEVER use `plugin-scaffold`
- ✅ Use `get-template` to retrieve content for reference
- ✅ Use `validate` for recommendations
- ✅ Use `install-claude-md` to add/update CLAUDE.md context file
- ✅ Edit existing files directly

**When NEW project (empty directory):**

- ✅ Use `plugin-scaffold` to create structure
- ✅ Follow complete scaffolding workflow

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

## Current Status (v1.4.0 - Enhanced Quality Standards)

### Recent Major Work Completed (v1.4.0 - Plugin Quality Validation Enhancements)

**Addressing Metalsmith Maintainer Feedback** - Added comprehensive validation rules targeting real-world plugin quality issues:

1. **Marketing Language Detection** - Identifies and flags buzzwords ("intelligent", "smart", "seamless") in documentation that should be replaced with technical descriptions
2. **Module System Consistency Validation** - Detects dangerous CJS/ESM mixing in README examples that cause runtime errors when users copy-paste code
3. **Hardcoded Values Detection** - Finds hardcoded configurations (wordsPerMinute, viewport settings, etc.) that should be user-configurable options
4. **Performance Anti-Pattern Analysis** - Catches objects redefined inside functions, redundant utility functions (get, pick, identity), and other performance issues
5. **Internationalization Readiness Checks** - Detects English-only text outputs that prevent global plugin adoption

**Implementation Details:**

- All new validations are included in default validation checks
- Updated MCP server schema to expose new validation options
- Enhanced validation reporting with actionable recommendations
- Comprehensive test coverage for all new validation patterns
- Updated documentation and examples

### Previous Major Work (v1.3.0 - Release Notes Enhancement)

1. **CLAUDE.md-Aware Validation** - Validation system now detects existing project standards from CLAUDE.md files and validates against them instead of imposing conflicting recommendations
2. **Improved Section Detection** - Enhanced README validation to detect Examples sections at any header level (###, ####, etc.)
3. **Context-Aware Recommendations** - Provides recommendations that match existing project patterns rather than generic suggestions
4. **Reduced False Positives** - Eliminated incorrect warnings for approved patterns (e.g., npm script release approaches)
5. **Quality Score Improvements** - Better scores reflecting actual compliance rather than conflicts with existing standards

### Phase 1 Foundation Work Completed (v1.0.0)

1. **Audit Plugin Tool** - Comprehensive plugin health assessment combining validation, linting, formatting, tests, and coverage into a single command
2. **Batch Audit Command** - Audit multiple plugins in a directory with summary reporting and batch operations
3. **CLI Integration** - Added `audit` and `batch-audit` commands to CLI with --fix and --output options
4. **MCP Integration** - Audit tools available via MCP server for AI assistant integration
5. **Pre-Release Validation Hooks** - New plugins include `pre-release` script that runs full audit before releases
6. **Health Scoring System** - Five-tier health assessment (EXCELLENT/GOOD/FAIR/NEEDS IMPROVEMENT/POOR) with weighted scoring

### Previous Major Work (v0.13.0)

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

### 4. Enhanced Quality Standards (v1.4.0)

**New Validation Rules** addressing real-world plugin quality issues:

- **Marketing Language Detection** (`marketing-language`): Flags non-technical buzzwords in documentation
- **Module System Consistency** (`module-consistency`): Prevents CJS/ESM mixing that causes runtime errors
- **Hardcoded Values Detection** (`hardcoded-values`): Identifies values that should be configurable options
- **Performance Pattern Analysis** (`performance-patterns`): Catches objects recreated in functions, redundant utilities
- **Internationalization Readiness** (`i18n-readiness`): Detects English-only outputs that limit global adoption

These rules help create plugins that meet professional standards and avoid common pitfalls identified by Metalsmith maintainers.

### 5. Complementary CI/CD Architecture

**NEW (v1.4.1)**: Scaffolded plugins now include complementary GitHub workflows and release scripts for professional development workflows:

**GitHub Workflows** (`.github/workflows/`):

- **test.yml**: CI/CD automation with Node.js testing, coverage extraction, and automatic README badge updates
- **claude-code.yml**: AI-assisted code review integration using Anthropic's Claude Code Action

**Release Scripts** (`scripts/`):

- **release.sh**: Manual release control with GitHub CLI authentication
- **release-notes.sh**: Custom release notes generation for clean GitHub releases

**Benefits of Complementary Architecture**:

- ✅ **Automated Quality Gates** - Every PR/push runs tests and updates coverage
- ✅ **Human Release Control** - Developers decide when to release, not CI
- ✅ **Professional Standards** - Coverage badges, AI code review, secure token handling
- ✅ **Clean GitHub Releases** - Proper release notes filtering out maintenance commits

**Package.json Integration**:

```json
{
  "release:patch": "./scripts/release.sh patch --ci",
  "release:minor": "./scripts/release.sh minor --ci",
  "release:major": "./scripts/release.sh major --ci"
}
```

This architecture matches the pattern used in production plugins like `metalsmith-bundled-components` and `metalsmith-search`.

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
- **IDE Compatibility**: Script clears `GITHUB_TOKEN` environment variable before calling `gh auth token` to prevent conflicts with IDE-set tokens (VSCode, Claude Code, etc.)

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

# Validate with actual test runs (includes enhanced quality standards)
npx metalsmith-plugin-mcp-server validate ./plugin --functional

# Run comprehensive plugin audit (validation + linting + tests + coverage)
npx metalsmith-plugin-mcp-server audit ./plugin

# Run audit with automatic fixes
npx metalsmith-plugin-mcp-server audit ./plugin --fix

# Audit multiple plugins in a directory
npx metalsmith-plugin-mcp-server batch-audit ./plugins

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

### Current Version: 1.5.0 (In Development)

**NEW Complementary CI/CD Architecture** - Professional development workflows for scaffolded plugins:

- **GitHub Workflows**: Automated CI/CD with `test.yml` and AI code review with `claude-code.yml`
- **Release Scripts**: Manual release control with `release.sh` and clean release notes with `release-notes.sh`
- **Validation Integration**: Validation now checks for and recommends complementary architecture files
- **Template System**: New workflow templates available via `get-template workflows/*`
- **Documentation Updates**: All relevant docs updated with architecture information

This provides scaffolded plugins with professional-grade development workflows combining automated quality gates with human-controlled releases.

### Previous Version: 1.4.1

**Plugin Quality Validation Enhancements** - Addressing metalsmith maintainer feedback:

- **Marketing Language Detection**: Flags buzzwords like "intelligent", "smart", "seamless" in documentation
- **Module System Consistency**: Detects CJS/ESM mixing in README examples that would cause runtime errors
- **Hardcoded Values Detection**: Identifies values that should be configurable (wordsPerMinute, viewport, etc.)
- **Performance Pattern Analysis**: Finds objects redefined in functions, redundant utilities (get, pick, identity)
- **Internationalization Readiness**: Detects English-only outputs that prevent global usage

### Previous Version: 1.3.0

- **NEW**: Comprehensive release notes improvement system addressing malformed GitHub releases
- **IMPLEMENTED**: Clean, professional GitHub release notes with version-specific changes
- **ENHANCED**: Automatic commit filtering (excludes chore, ci, dev commits)
- **ADDED**: Custom release notes script template for cleaner GitHub releases
- **IMPROVED**: Full changelog links for detailed comparisons

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

### Improved Release Notes System (v1.2.0)

**IMPLEMENTED**: Complete release notes improvement system addressing malformed GitHub releases.

**New System Features:**

- ✅ Clean, professional GitHub release notes
- ✅ Version-specific changes (no "Unreleased" sections)
- ✅ Automatic commit filtering (excludes chore, ci, dev commits)
- ✅ Proper GitHub markdown formatting with commit links
- ✅ Full changelog links for detailed comparisons

**Implementation Changes:**

1. **Custom Release Notes Script**: New `scripts/release-notes.sh` template generates clean, focused release notes
2. **Updated Release-It Configuration**: Template now uses `"releaseNotes": "./scripts/release-notes.sh ${latestTag}"`
3. **Scaffold Integration**: Automatically creates and installs release notes script in new plugins
4. **Configs Command Enhancement**: Includes release notes script when generating release-it configuration
5. **Validation Checks**: New validation rules ensure release notes system is properly configured
6. **Documentation Updates**: Both plugin templates and main documentation updated with release management info

**Template Changes:**

- `templates/scripts/release-notes.sh.template` - Custom release notes generation script
- `templates/configs/release-it.json.template` - Updated to use custom release notes
- `templates/plugin/CLAUDE.md.template` - Added release system documentation
- `templates/plugin/README.md.template` - Added release management section

**Validation Integration:**

- New `checkReleaseNotes` validation function
- Checks for script existence and executability
- Validates .release-it.json configuration
- Provides upgrade paths for existing plugins

This replaces the previous auto-changelog approach with a more targeted solution that generates clean, professional GitHub releases.

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

### Enhanced Quality Standards - Practical Benefits

The new validation rules help users avoid common plugin quality issues identified by Metalsmith maintainers:

**Marketing Language Issues:**

- ❌ "This intelligent plugin seamlessly transforms content"
- ✅ "Transforms markdown content to HTML with configurable options"

**Module System Problems:**

- ❌ Mixed CJS/ESM in examples causes runtime errors when users copy-paste
- ✅ Consistent module syntax that actually works when implemented

**Hardcoded Configuration:**

- ❌ `const wordsPerMinute = 200;` prevents user customization
- ✅ `const config = { wordsPerMinute: 200, ...options };` allows user control

**Performance Anti-patterns:**

- ❌ Object recreation inside functions kills performance
- ✅ Module-level constants avoid unnecessary object creation

**Internationalization Barriers:**

- ❌ `return "5 minute read"` limits plugin to English sites
- ✅ `return { minutes: 5, seconds: 20 }` allows template customization

## Development Environment Notes

- **Node.js**: ESM modules throughout
- **Package Manager**: npm (not yarn/pnpm)
- **Git Workflow**: Feature branches → PR → main
- **Dependencies**: Minimal, well-justified additions only
- **Templates**: Nunjucks-based with conditional rendering

This context should help you continue development seamlessly. The project is in a good state with solid architecture and clear patterns established.
