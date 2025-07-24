# Metalsmith Plugin MCP Server

MCP server for scaffolding and validating high-quality Metalsmith plugins

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url]
[![test coverage][coverage-badge]][coverage-url]
[![ESM/CommonJS][modules-badge]][npm-url]
[![Known Vulnerabilities](https://snyk.io/test/npm/metalsmith-plugin-mcp-server/badge.svg)](https://snyk.io/test/npm/metalsmith-plugin-mcp-server)

This MCP (Model Context Protocol) server provides tools for creating and maintaining Metalsmith plugins following enhanced quality standards. It encapsulates best practices from the Metalsmith ecosystem, such as `@metalsmith/core-plugin` and contributed plugins like `metalsmith-optimize-images`.

## Installation

```bash
npm install -g metalsmith-plugin-mcp-server
```

Or use directly with npx (no installation required):

```bash
npx metalsmith-plugin-mcp-server --help
```

## MCP Tools

The MCP server provides three main tools:

### 1. Plugin Scaffolding

Generate a complete Metalsmith plugin structure with enhanced standards:

```js
await mcp.call('plugin-scaffold', {
  name: 'my-feature', // Uses exact name provided
  description: 'Processes and transforms content based on custom rules',
  type: 'processor', // 'processor', 'transformer', or 'validator'
  features: ['async-processing', 'background-processing', 'metadata-generation'],
  outputPath: './plugins'
});
```

This creates a fully-configured plugin with:

- **Dual Module Support**: Both ESM and CommonJS builds using microbundle
- **Native Metalsmith Methods**: Uses `metalsmith.match()` instead of external dependencies
- **Zero External Dependencies**: Self-contained utilities for pattern matching and config merging
- Comprehensive test setup with both ESM and CJS testing
- Production-ready documentation
- ESLint 9.x flat config
- Prettier formatting
- Release automation with GitHub integration
- Deep configuration merging
- Robust error handling

### 2. Plugin Validation

Check existing plugins against quality standards:

```js
await mcp.call('validate-plugin', {
  path: './metalsmith-my-plugin',
  checks: ['structure', 'tests', 'docs', 'package-json', 'eslint', 'coverage']
});
```

Validation checks include:

- **Structure**: Required directories and files
- **Tests**: Test coverage and fixture setup
- **Documentation**: README sections, examples, and badges
- **Package.json**: Required fields and conventions
- **ESLint**: Modern configuration presence
- **Coverage**: Test coverage analysis

### 3. Configuration Generation

Generate configuration files following enhanced standards:

```js
await mcp.call('generate-configs', {
  outputPath: './my-plugin',
  configs: ['eslint', 'prettier', 'editorconfig', 'gitignore', 'release-it']
});
```

## Usage

You can use this tool in two ways:

1. **Direct CLI Usage**: Run commands directly in your terminal using npx - perfect for one-off plugin creation or when you prefer manual control
2. **MCP Server**: Set up the server for AI assistants (Claude Desktop/Code) - ideal for interactive plugin development with AI guidance and natural language requests

### Direct CLI Usage (with npx)

The fastest way to get started is using npx directly:

```bash
# Show help and available commands
npx metalsmith-plugin-mcp-server help

# Create a new plugin with guided prompts
npx metalsmith-plugin-mcp-server scaffold

# Create a new plugin with all parameters (expert mode)
npx metalsmith-plugin-mcp-server scaffold my-plugin "Processes and transforms content" ./plugins

# Validate an existing plugin
npx metalsmith-plugin-mcp-server validate ./my-plugin

# Generate configuration files
npx metalsmith-plugin-mcp-server configs ./my-plugin
```

#### Guided vs. Expert Mode

**Guided Mode** (recommended for beginners):

```bash
npx metalsmith-plugin-mcp-server scaffold
# Will prompt you for:
# - Plugin name: my-awesome-plugin
# - Plugin description: Processes markdown files with custom rules
# - Output path (./): ./plugins
```

**Expert Mode** (for quick execution):

```bash
npx metalsmith-plugin-mcp-server scaffold my-awesome-plugin "Processes markdown files" ./plugins
```

### Setting Up the MCP Server

#### 1. Create a Local MCP Server Installation:

```bash
# Create a dedicated folder for the MCP server
mkdir ~/metalsmith-mcp-tools
cd ~/metalsmith-mcp-tools

# Initialize npm project and install the MCP server
npm init -y
npm install metalsmith-plugin-mcp-server
```

#### 2. Configure Your AI Assistant:

**For Claude Desktop**

Add to your configuration file at `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "metalsmith-plugin-mcp-server": {
      "command": "node",
      "args": ["/Users/yourusername/metalsmith-mcp-tools/node_modules/metalsmith-plugin-mcp-server/src/index.js"],
      "cwd": "/Users/yourusername/metalsmith-mcp-tools"
    }
  }
}
```

**For Claude Code**

After installing the MCP server as above, configure it using Claude Code's MCP management
commands:

```bash
# Add the MCP server to Claude Code
claude mcp add metalsmith-plugin /Users/yourusername/metalsmith-mcp-tools/node_modules/metalsmith-plugin-mcp-server/src/index.js
```

**Verify it was added correctly!**

```bash
claude mcp list
```

Important Notes:

- Use the full absolute path to the src/index.js file (not just the directory)
- Path is case-sensitive - use /Users (uppercase U) on macOS
- Replace yourusername with your actual username
- If using NVM, the path might be different - use which node to find your Node.js path

> **Restart Required!**
> Exit and restart Claude Code for the MCP server to become available.

**Verify Setup:**
In a new Claude Code session, the following tools should be available:

- **plugin-scaffold** - Generate plugin structures
- **validate-plugin** - Check plugin quality
- **generate-configs** - Create configuration files

### Restart Your AI Assistant\*\*:

- Claude Desktop: Restart the application
- Claude Code: Restart or reload your development environment

### Using the MCP Server for Plugin Development

Now you can create Metalsmith plugins in any directory and use AI assistance:

```bash
# Create a new plugin project anywhere
mkdir ~/my-projects/metalsmith-awesome-plugin
cd ~/my-projects/metalsmith-awesome-plugin

# Start Claude Code or use Claude Desktop
# The MCP server is now available globally
```

**Verify Installation** by asking your AI assistant:

> "Do you have access to the Metalsmith Plugin MCP Server?"

**Example Development Workflow**:

> "Create a new Metalsmith plugin called 'metalsmith-image-optimizer' that compresses images and generates responsive variants."

### Example Prompts

Here are prompts that will trigger the MCP server's capabilities:

**Creating a New Plugin**:

> "Create a new Metalsmith plugin called metalsmith-json-feed that generates JSON feeds from markdown files. Include async processing and comprehensive tests."

**Validating an Existing Plugin**:

> "Check my metalsmith-sass plugin against the MCP server's enhanced quality standards and suggest improvements."

**Upgrading Configuration**:

> "Update my Metalsmith plugin to use ESLint 9 flat config and modern testing patterns."

**Complex Plugin Development**:

> "Help me build a Metalsmith plugin that optimizes SVG files, supports batch processing, and integrates with the plugin chain properly."

The AI assistant will automatically use the MCP server tools to scaffold, validate, and configure your Metalsmith plugins according to best practices.

## Options

### Plugin Scaffolding Options

| Option        | Type       | Default         | Description                                                                           |
| ------------- | ---------- | --------------- | ------------------------------------------------------------------------------------- |
| `name`        | `string`   | Required        | Plugin name (exact name as provided - no auto-prefix)                                 |
| `description` | `string`   | Required        | What the plugin does (must be provided)                                               |
| `type`        | `string`   | `'processor'`   | Plugin type: 'processor', 'transformer', or 'validator'                               |
| `features`    | `string[]` | `[]`            | Optional features: 'async-processing', 'background-processing', 'metadata-generation' |
| `outputPath`  | `string`   | `'.'`           | Where to create the plugin directory                                                  |
| `author`      | `string`   | From config/git | Plugin author                                                                         |
| `license`     | `string`   | `'MIT'`         | License type: 'MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'                              |

### Plugin Validation Options

| Option   | Type       | Default    | Description                                                                                |
| -------- | ---------- | ---------- | ------------------------------------------------------------------------------------------ |
| `path`   | `string`   | Required   | Path to the plugin to validate                                                             |
| `checks` | `string[]` | All checks | Specific checks to run: 'structure', 'tests', 'docs', 'package-json', 'eslint', 'coverage' |

### Configuration Generation Options

| Option       | Type       | Default     | Description                                                                               |
| ------------ | ---------- | ----------- | ----------------------------------------------------------------------------------------- |
| `outputPath` | `string`   | Required    | Where to generate config files                                                            |
| `configs`    | `string[]` | All configs | Config files to generate: 'eslint', 'prettier', 'editorconfig', 'gitignore', 'release-it' |

## Plugin Types

### Processor

Plugins that process file contents (e.g., markdown rendering, image optimization)

### Transformer

Plugins that transform file metadata or structure (e.g., permalinks, collections)

### Validator

Plugins that validate files against rules (e.g., HTML validation, link checking)

## Plugin Features

### Async Processing

Adds support for asynchronous file processing with configurable batch sizes

### Background Processing

Implements worker threads for CPU-intensive operations

### Metadata Generation

Automatically generates and attaches metadata to processed files

## Configuration

### Environment Variables

Currently, no environment variables are used for configuration. All configuration is handled through the configuration file or command-line arguments.

### Configuration File

You can create a `.metalsmith-plugin-mcp` file to set default values for plugin creation. The CLI will look for this file in:

1. Current working directory
2. Your home directory

Example `.metalsmith-plugin-mcp`:

```json
{
  "type": "processor",
  "license": "MIT",
  "author": "Your Name <your.email@example.com>",
  "outputPath": "./plugins",
  "features": ["async-processing"]
}
```

Available configuration options:

| Option       | Type       | Default       | Description                              |
| ------------ | ---------- | ------------- | ---------------------------------------- |
| `type`       | `string`   | `'processor'` | Default plugin type                      |
| `license`    | `string`   | `'MIT'`       | Default license                          |
| `author`     | `string`   | `''`          | Default author name and email            |
| `outputPath` | `string`   | `'.'`         | Default output directory for new plugins |
| `features`   | `string[]` | `[]`          | Default features to include              |

## Debug

The MCP server currently uses standard console output for logging. For troubleshooting:

1. **CLI Usage**: All output is shown directly in the terminal
2. **MCP Server**: Check your AI assistant's connection logs
3. **Verbose Output**: The server provides detailed success/error messages for all operations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Release Process

The release process is fully automated. Simply run:

```bash
npm run release
```

The release automatically:

- Syncs with remote (to handle CI commits like coverage badge updates)
- Runs tests and linting
- Generates changelog from commit history
- Creates GitHub release using CLI (no browser needed)
- Pushes everything including tags

## Development Workflow

Generated plugins follow a modern dual-module development workflow:

```bash
# Install dependencies
npm install

# Build both ESM and CJS versions
npm run build

# Run tests for both module formats
npm test

# Run only ESM tests
npm run test:esm

# Run only CJS tests
npm run test:cjs

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Format code
npm run format
```

**Important**:

- Always run `npm run build` before testing or publishing, as the tests run against the built files in the `lib/` directory.
- Remove any empty directories (like `src/processors`, `src/transformers`, `src/validators`) that aren't needed for your specific plugin type after development is complete.

## Testing

The MCP server itself uses comprehensive testing:

```bash
# Run all MCP server tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Format code
npm run format
```

## Resources

- [Metalsmith Documentation](https://metalsmith.io)
- [MCP Protocol Specification](https://modelcontextprotocol.io)

## License

MIT © Werner Glinka

---

[metalsmith-badge]: https://img.shields.io/badge/metalsmith-plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[npm-badge]: https://img.shields.io/npm/v/metalsmith-plugin-mcp-server.svg
[npm-url]: https://www.npmjs.com/package/metalsmith-plugin-mcp-server
[license-badge]: https://img.shields.io/github/license/wernerglinka/metalsmith-plugin-mcp-server
[license-url]: LICENSE
[coverage-badge]: https://img.shields.io/badge/test%20coverage-100.0%25-brightgreen
[coverage-url]: https://github.com/wernerglinka/metalsmith-plugin-mcp-server/actions/workflows/test.yml
[modules-badge]: https://img.shields.io/badge/modules-ESM%2FCJS-blue
