# Testing the Metalsmith MCP Server

This guide shows you how to test the MCP server locally before using it with Claude.

## Method 1: Manual MCP Protocol Testing

The MCP server communicates using JSON-RPC over stdio. You can test it manually:

### 1. List Available Tools

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node src/index.js
```

This should return a JSON response showing the three available tools.

### 2. Test Plugin Scaffolding

```bash
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "plugin-scaffold", "arguments": {"name": "metalsmith-test-plugin", "type": "processor", "features": ["async-processing"], "outputPath": "./test-output"}}}' | node src/index.js
```

### 3. Test Plugin Validation

First create a simple plugin structure, then validate it:

```bash
mkdir -p test-plugin/src test-plugin/test
echo '{"name": "metalsmith-test", "version": "1.0.0"}' > test-plugin/package.json
echo 'export default function() {}' > test-plugin/src/index.js
echo '# Test Plugin' > test-plugin/README.md

echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "validate-plugin", "arguments": {"path": "./test-plugin", "checks": ["structure", "package-json"]}}}' | node src/index.js
```

### 4. Test Configuration Generation

```bash
echo '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "generate-configs", "arguments": {"outputPath": "./test-configs", "configs": ["eslint", "prettier"]}}}' | node src/index.js
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

## Method 3: Integration with Claude Desktop

To use this with Claude Desktop, you need to configure it in your MCP settings:

### 1. Create MCP Configuration

Add this to your Claude Desktop MCP configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

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
- ✅ Complete file structure (src/, test/, package.json, README.md, etc.)
- ✅ All template variables properly substituted
- ✅ Git repository initialized

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

## Development Testing

For development, you can also run the unit tests:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test files
npm test -- --grep "plugin-scaffold"
```

This will run the Mocha test suite and show you detailed test results and coverage information.
