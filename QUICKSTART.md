# Quick Start Guide

## 🚀 Quick Start with npx (No Installation Required)

The fastest way to use the MCP server is with npx:

> **New in v0.9.0**: Validation refactored for Metalsmith-specific patterns. Focuses on build-time concerns rather than server-oriented validations.

```bash
# Show version information
npx metalsmith-plugin-mcp-server version

# Show available commands
npx metalsmith-plugin-mcp-server --help

# Create a new plugin (description is now required)
npx metalsmith-plugin-mcp-server scaffold my-plugin "Transforms content using custom processing rules"

# Validate an existing plugin (structure-based)
npx metalsmith-plugin-mcp-server validate ./my-plugin

# Functional validation (runs tests and coverage)
npx metalsmith-plugin-mcp-server validate ./my-plugin --functional

# Generate configuration files
npx metalsmith-plugin-mcp-server configs ./my-plugin

# Update dependencies (dry run)
npx metalsmith-plugin-mcp-server update-deps ./my-plugin

# Update and install dependencies
npx metalsmith-plugin-mcp-server update-deps ./my-plugin --install

# Update, install, and run tests
npx metalsmith-plugin-mcp-server update-deps ./my-plugin --install --test
```

### Validation Configuration (Optional)

Customize validation rules by creating a `.metalsmith-plugin-validation.json` file in your plugin directory:

```json
{
  "rules": {
    "tests": {
      "coverageThreshold": 85
    },
    "documentation": {
      "requiredSections": ["Installation", "Usage"],
      "recommendedSections": ["Options", "Examples"]
    },
    "packageJson": {
      "namePrefix": "metalsmith-",
      "recommendedScripts": ["lint", "test:coverage"]
    }
  },
  "recommendations": {
    "showCommands": true,
    "templateSuggestions": true
  }
}
```

### User Configuration File (Optional)

Create a `.metalsmith-plugin-mcp` file in your project or home directory:

```json
{
  "license": "MIT",
  "author": "Your Name <your.email@example.com>",
  "outputPath": "./plugins",
  "features": ["async-processing"]
}
```

## 🚀 Testing the MCP Server Locally

### 1. Install Dependencies

```bash
npm install
```

### 2. Test All Tools

```bash
npm run test:mcp
```

### 3. Test Individual Tools

**Create a plugin:**

```bash
npm run test:scaffold
```

**Validate a plugin:**

```bash
npm run test:validate
```

**Generate configs:**

```bash
npm run test:configs
```

**Update dependencies:**

```bash
npx metalsmith-plugin-mcp-server update-deps ./test-plugins
```

## 🔧 Manual Testing

You can also test individual tools manually using the MCP protocol:

### List Available Tools

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node src/index.js
```

### Create a Plugin

```bash
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "plugin-scaffold", "arguments": {"name": "metalsmith-my-plugin", "features": ["async-processing"]}}}' | node src/index.js
```

## 🤖 Using with Claude

### Option 1: Claude Desktop with npx

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "metalsmith-plugin-server": {
      "command": "npx",
      "args": ["metalsmith-plugin-mcp-server", "server"]
    }
  }
}
```

Or if you have it installed locally:

```json
{
  "mcpServers": {
    "metalsmith-plugin-server": {
      "command": "node",
      "args": ["/absolute/path/to/metalsmith-plugin-mcp-server/src/index.js"]
    }
  }
}
```

Then restart Claude Desktop and ask:

> "Create a new Metalsmith plugin for processing markdown files"

### Option 2: Command Line

```bash
# Start the MCP server with npx
npx metalsmith-plugin-mcp-server server

# Or if installed locally
node src/index.js

# Use with Claude API/CLI
# (Implementation depends on your Claude setup)
```

## 📝 What You Can Ask Claude

Once connected, you can ask Claude to:

- **"Create a plugin called 'content-processor' that transforms markdown files"**
- **"Make a plugin named 'image-optimizer' that compresses and resizes images"**
- **"Validate my existing plugin at ./my-plugin"**
- **"Generate ESLint and Prettier configs for my project"**
- **"Create a transformer plugin with metadata generation"**

Note: Claude will now ask you to describe what the plugin should do before creating it.

### 💡 Important: Following MCP Server Recommendations

When the MCP server provides recommendations or code snippets through your AI assistant:

- **Implement exactly as shown** - Don't create simplified versions
- **Copy configurations precisely** - Release scripts, ESLint configs, etc. should match exactly
- **Follow referenced patterns** - If the server mentions specific documentation patterns, use them as-is
- **Ask before deviating** - If something seems unclear, ask for clarification rather than interpreting

This prevents common issues like release automation failures or configuration conflicts.

### Working with Generated Plugins

After Claude creates a plugin, the typical development workflow is:

```bash
# Navigate to the generated plugin
cd metalsmith-my-plugin

# Install dependencies
npm install

# Build both ESM and CJS versions
npm run build

# Run tests for both module formats
npm test

# Start developing
# - Edit files in src/
# - Add tests in test/
# - Run npm run build before testing
# - Both ESM and CJS builds are tested automatically
```

## 🎯 Expected Results

### Plugin Creation

- Complete directory structure with dual module support (src/, lib/, test/)
- Modern ESM source with automatic CJS builds via microbundle
- Comprehensive test setup for both ESM and CommonJS
- Production-ready documentation with build instructions
- Zero external runtime dependencies
- Native Metalsmith method integration

### Plugin Validation

- Quality score and detailed report
- Standards compliance checking
- Actionable improvement recommendations

### Config Generation

- Modern ESLint flat config
- Prettier with sensible defaults
- .gitignore with common patterns
- Release automation setup

## 🛠️ Troubleshooting

If you encounter issues:

1. **Check dependencies**: `npm install`
2. **Verify server starts**: `node src/index.js` (should wait for input)
3. **Check file permissions**: Ensure output directories are writable
4. **Enable debug**: `DEBUG=metalsmith:* node src/index.js`

For detailed troubleshooting, see [TESTING.md](./TESTING.md).
