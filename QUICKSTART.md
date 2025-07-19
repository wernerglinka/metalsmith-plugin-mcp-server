# Quick Start Guide

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

## 🔧 Manual Testing

You can also test individual tools manually using the MCP protocol:

### List Available Tools

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node src/index.js
```

### Create a Plugin

```bash
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "plugin-scaffold", "arguments": {"name": "metalsmith-my-plugin", "type": "processor", "features": ["async-processing"]}}}' | node src/index.js
```

## 🤖 Using with Claude

### Option 1: Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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
# Start the server
node src/index.js &

# Use with Claude API/CLI
# (Implementation depends on your Claude setup)
```

## 📝 What You Can Ask Claude

Once connected, you can ask Claude to:

- **"Create a Metalsmith plugin for processing images"**
- **"Validate my existing plugin at ./my-plugin"**
- **"Generate ESLint and Prettier configs for my project"**
- **"Create a transformer plugin with metadata generation"**

## 🎯 Expected Results

### Plugin Creation

- Complete directory structure (src/, test/, docs)
- Modern ESM-based code
- Comprehensive test setup
- Production-ready documentation
- Zero external dependencies by default

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
