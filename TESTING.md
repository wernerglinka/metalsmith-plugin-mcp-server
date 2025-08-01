# Testing the Metalsmith MCP Server

This guide shows you how to test the MCP server locally before using it with Claude.

> **Important**: Starting with v0.5.0, plugin descriptions are required and plugin names are used exactly as provided (no automatic `metalsmith-` prefix).

## Method 1: CLI Testing (Recommended)

The easiest way to test the MCP server is using the CLI interface:

### Test with npx (no installation required)

```bash
# Show help and available commands
npx metalsmith-plugin-mcp-server --help

# Create a test plugin (description is now required)
npx metalsmith-plugin-mcp-server scaffold test-plugin "A test plugin for validation" ./test-output

# Validate the created plugin (structure-based)
npx metalsmith-plugin-mcp-server validate ./test-output/test-plugin

# Test functional validation (runs tests and coverage)
npx metalsmith-plugin-mcp-server validate ./test-output/test-plugin --functional

# Generate config files
npx metalsmith-plugin-mcp-server configs ./test-output/test-plugin

# Test template commands
npx metalsmith-plugin-mcp-server list-templates
npx metalsmith-plugin-mcp-server get-template plugin/CLAUDE.md
npx metalsmith-plugin-mcp-server get-template configs/release-it.json

# Test CLAUDE.md installation and smart merge
npx metalsmith-plugin-mcp-server install-claude-md ./test-output/test-plugin
npx metalsmith-plugin-mcp-server install-claude-md ./test-output/test-plugin --dry-run
```

### Test with local installation

```bash
# If you've cloned the repository
npm install
npm link

# Now use the CLI (description is required)
metalsmith-plugin-mcp-server scaffold test-plugin "A test plugin for local testing"
metalsmith-plugin-mcp-server validate ./test-plugin
```

### Test with configuration file

Create a `.metalsmith-plugin-mcp` file:

```json
{
  "license": "MIT",
  "author": "Test Author <test@example.com>",
  "outputPath": "./test-plugins"
}
```

Then run:

```bash
# Description is still required even with config file
npx metalsmith-plugin-mcp-server scaffold configured-plugin "Plugin created with configuration defaults"
```

## Testing Validation Configuration

You can test custom validation rules by creating a configuration file:

### 1. Create a test plugin with custom validation config

```bash
# Create a minimal plugin
mkdir -p test-config-plugin/src
echo '{"name": "test-plugin", "version": "1.0.0", "license": "MIT"}' > test-config-plugin/package.json
echo 'export default () => {}' > test-config-plugin/src/index.js
echo '# Test Plugin\n\n## Usage\n\nThis is how to use it.' > test-config-plugin/README.md

# Create validation config
cat << 'EOF' > test-config-plugin/.metalsmith-plugin-validation.json
{
  "rules": {
    "structure": {
      "enabled": true,
      "requiredDirs": ["src"],
      "requiredFiles": ["src/index.js"],
      "recommendedDirs": []
    },
    "tests": {
      "enabled": false
    },
    "documentation": {
      "enabled": true,
      "requiredSections": ["Usage"],
      "recommendedSections": ["Installation", "Options"]
    },
    "packageJson": {
      "namePrefix": "",
      "requiredScripts": [],
      "recommendedScripts": ["build"]
    }
  },
  "recommendations": {
    "showCommands": false,
    "templateSuggestions": false
  }
}
EOF

# Test validation with config
npx metalsmith-plugin-mcp-server validate test-config-plugin

# Test without config (rename it temporarily)
mv test-config-plugin/.metalsmith-plugin-validation.json test-config-plugin/.metalsmith-plugin-validation.json.bak
npx metalsmith-plugin-mcp-server validate test-config-plugin

# Restore config
mv test-config-plugin/.metalsmith-plugin-validation.json.bak test-config-plugin/.metalsmith-plugin-validation.json
```

### 2. Understanding Validation Output

The validation output shows:

- ✓ **Passed**: Requirements that are met
- ✗ **Failed**: Critical issues that must be fixed
- ⚠ **Warnings**: Quality concerns (e.g., low test coverage)
- 💡 **Recommendations**: Optional improvements with actionable commands

When config is used:

- Tests can be disabled completely
- Custom required/recommended sections
- Different naming conventions
- Shorter recommendation messages

## Method 2: Manual MCP Protocol Testing

The MCP server communicates using JSON-RPC over stdio. You can test it manually:

### 1. List Available Tools

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node src/index.js
```

This should return a JSON response showing the four available tools.

### 2. Test Plugin Scaffolding

```bash
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "plugin-scaffold", "arguments": {"name": "test-plugin", "description": "A test plugin for validation purposes", "features": ["async-processing"], "outputPath": "./test-output"}}}' | node src/index.js
```

### 3. Test Plugin Validation

First create a simple plugin structure, then validate it:

```bash
mkdir -p test-plugin/src test-plugin/test
echo '{"name": "metalsmith-test", "version": "1.0.0"}' > test-plugin/package.json
echo 'export default function() {}' > test-plugin/src/index.js
echo '# Test Plugin' > test-plugin/README.md

echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "validate", "arguments": {"path": "./test-plugin", "checks": ["structure", "package-json"]}}}' | node src/index.js
```

### 4. Test Configuration Generation

```bash
echo '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "configs", "arguments": {"outputPath": "./test-configs", "configs": ["eslint", "prettier"]}}}' | node src/index.js
```

## Method 2: Using the Test Scripts

We've provided convenient test scripts in the `scripts/` directory:

### Run All Tests

```bash
npm run test:mcp
```

### Test Individual Tools

```bash
# Test plugin scaffolding
npm run test:scaffold

# Test plugin validation
npm run test:validate

# Test config generation
npm run test:configs
```

## Method 4: Integration with Claude Desktop

To use this with Claude Desktop, you need to configure it in your MCP settings:

### 1. Create MCP Configuration

Add this to your Claude Desktop MCP configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

**Option A: Using npx (recommended)**

```json
{
  "mcpServers": {
    "metalsmith-plugin-server": {
      "command": "npx",
      "args": ["metalsmith-plugin-mcp-server", "server"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Option B: Using local installation**

```json
{
  "mcpServers": {
    "metalsmith-plugin-server": {
      "command": "node",
      "args": ["/path/to/metalsmith-plugin-mcp-server/src/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. Restart Claude Desktop

After adding the configuration, restart Claude Desktop for the changes to take effect.

### 3. Test in Claude

Ask Claude something like:

> "Can you create a new Metalsmith plugin for processing markdown files?"

Claude should be able to use the plugin-scaffold tool to generate a complete plugin structure.

## Method 4: Using with Claude API/CLI

If you're using the Claude API or CLI, you can configure the MCP server:

```bash
# Start the MCP server
node src/index.js &
MCP_PID=$!

# Use with Claude CLI (if available)
claude --mcp-server "metalsmith-plugin-server" "Create a Metalsmith plugin for image optimization"

# Clean up
kill $MCP_PID
```

## Expected Output

When tools run successfully, you should see:

### Plugin Scaffold Success

- ✅ New directory created with plugin name
- ✅ Complete file structure with dual module support (src/, test/, package.json, README.md, etc.)
- ✅ Both ESM and CJS test files created (index.test.js and cjs.test.cjs)
- ✅ Build configuration with microbundle for dual outputs
- ✅ All template variables properly substituted
- ✅ Git repository initialized
- ✅ Native Metalsmith methods integrated (no external pattern matching dependencies)

### Plugin Validation Success

- ✅ Quality score and detailed report
- ✅ Recommendations for improvements
- ✅ File structure compliance check

### Config Generation Success

- ✅ Modern configuration files created
- ✅ ESLint flat config, Prettier, .gitignore, etc.
- ✅ No overwriting of existing files

## Troubleshooting

### Common Issues

1. **"Duplicate export" errors**: Make sure there are no conflicting exports in utility files
2. **"Cannot find module" errors**: Run `npm install` to install dependencies
3. **Template rendering errors**: Check that all template files exist in the templates/ directory
4. **Permission errors**: Ensure the output directories are writable

### Debug Mode

Enable debug logging:

```bash
DEBUG=metalsmith:* node src/index.js
```

### Logs

The server logs to stderr, so you can monitor activity:

```bash
node src/index.js 2>server.log &
tail -f server.log
```

## Testing Smart Merge Functionality

The `install-claude-md` command has smart merge capabilities that preserve existing content. Test this thoroughly:

### Testing Smart Merge with Existing Content

```bash
# Create a test plugin with existing CLAUDE.md
mkdir test-merge-plugin
cd test-merge-plugin
echo '{"name": "test-plugin", "description": "Test plugin"}' > package.json

# Create existing CLAUDE.md with custom content
cat > CLAUDE.md << 'EOF'
# test-plugin - Development Context

## Project Overview
This plugin does amazing custom things.

## Custom Development Notes
- Special requirements here
- Team-specific workflows
- Custom deployment process

## Architecture Notes
Important design decisions that must be preserved.
EOF

# Test dry run (preview changes)
npx metalsmith-plugin-mcp-server install-claude-md --dry-run

# Test smart merge (should preserve custom content)
npx metalsmith-plugin-mcp-server install-claude-md

# Verify content was preserved and MCP section was added
cat CLAUDE.md

# Test updating existing MCP section
npx metalsmith-plugin-mcp-server install-claude-md

# Test force replacement (should overwrite everything)
npx metalsmith-plugin-mcp-server install-claude-md --replace

# Cleanup
cd .. && rm -rf test-merge-plugin
```

### Testing Without Existing CLAUDE.md

```bash
# Create plugin without CLAUDE.md
mkdir test-new-plugin
cd test-new-plugin
echo '{"name": "new-plugin", "description": "New plugin"}' > package.json

# Should create new CLAUDE.md with plugin-specific content
npx metalsmith-plugin-mcp-server install-claude-md

# Verify plugin name and description were inserted
grep "new-plugin" CLAUDE.md
grep "New plugin" CLAUDE.md

# Cleanup
cd .. && rm -rf test-new-plugin
```

## Testing Generated Plugins

After generating a plugin, you should test its dual module functionality:

```bash
cd generated-plugin-name

# Install dependencies
npm install

# Build both ESM and CJS versions
npm run build

# This should create lib/index.js (ESM) and lib/index.cjs (CJS)
ls lib/

# Run tests for both module formats
npm test

# Run tests individually
npm run test:esm  # Tests the built ESM version
npm run test:cjs  # Tests the built CJS version

# Check that both modules can be imported
node -e "import plugin from './lib/index.js'; console.log('ESM works:', typeof plugin)"
node -e "const plugin = require('./lib/index.cjs'); console.log('CJS works:', typeof plugin)"
```

## Development Testing

For development of the MCP server itself, you can run the unit tests:

```bash
# Run all MCP server tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test files
npm test -- --grep "plugin-scaffold"
```

This will run the Mocha test suite and show you detailed test results and coverage information.
