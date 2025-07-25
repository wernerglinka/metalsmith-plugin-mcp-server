# Metalsmith Plugin MCP Server - Development Context

## Project Overview

This is an MCP (Model Context Protocol) server for scaffolding and validating high-quality Metalsmith plugins. It provides tools for Claude to help users create, validate, and maintain Metalsmith plugins following best practices.

## Current Status (v0.7.0)

### Recent Major Work Completed

1. **Enhanced Validation System** - Converted from warnings to actionable recommendations
2. **Feature Validation** - Added validation for exact feature strings with helpful error messages
3. **Modern Defaults** - Changed default from empty features to `['async-processing']`
4. **Config Command** - Added `npx metalsmith-plugin-mcp-server config` for setup management
5. **GitHub Release Automation** - Fixed recurring release issues using GitHub CLI
6. **Removed Type Property** - Eliminated vestigial "type" classification system

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

- **Problem**: Recurring GitHub release automation failures
- **Solution**: GitHub CLI integration in release-it hooks
- **Benefit**: No more token issues, fully automated
- **Requirement**: Developers need `gh CLI` installed for releases

## User Workflows

### For Claude Code Integration

When users ask validation questions, guide them to use:

> "Does the MCP server have any recommendations for this plugin?"
> "Run the MCP validation on this plugin and implement any recommendations."

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

### Current Version: 0.7.0

- Major feature release with validation improvements
- All tests passing (62/62)
- GitHub release automation fixed
- Ready for production use

### Next Release Preparation

- Expect fine-tuning based on user feedback
- Test the new GitHub CLI release automation
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
