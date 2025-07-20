# Metalsmith MCP Server

> MCP server for scaffolding and validating high-quality Metalsmith plugins

[![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url]
[![test coverage][coverage-badge]][coverage-url]
[![AI-assisted development][ai-assist-badge]][ai-assist-url]

This MCP (Model Context Protocol) server provides tools for creating and maintaining Metalsmith plugins following enhanced quality standards. It encapsulates years of best practices from the Metalsmith ecosystem, particularly inspired by the exceptional quality demonstrated in plugins like `metalsmith-optimize-images`.

## Installation

```bash
npm install -g metalsmith-plugin-mcp-server
```

## Features

The MCP server provides three main tools:

### 1. Plugin Scaffolding

Generate a complete Metalsmith plugin structure with enhanced standards:

```js
await mcp.call("plugin-scaffold", {
  name: "metalsmith-my-feature",
  type: "processor", // 'processor', 'transformer', or 'validator'
  features: [
    "async-processing",
    "background-processing",
    "metadata-generation",
  ],
  outputPath: "./plugins",
});
```

This creates a fully-configured plugin with:

- Modern ESM structure
- Comprehensive test setup (targeting >95% coverage)
- Production-ready documentation
- ESLint 9.x flat config
- Prettier formatting
- Release automation with GitHub integration
- Local utility functions (minimal npm dependencies)
- Metalsmith's native file matching
- Deep configuration merging
- Robust error handling

### 2. Plugin Validation

Check existing plugins against quality standards:

```js
await mcp.call("validate-plugin", {
  path: "./metalsmith-my-plugin",
  checks: ["structure", "tests", "docs", "package-json", "eslint", "coverage"],
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
await mcp.call("generate-configs", {
  outputPath: "./my-plugin",
  configs: ["eslint", "prettier", "editorconfig", "gitignore", "release-it"],
});
```

## Usage

### Setting Up Claude or Other AI Assistants

1. **Install the MCP Server**:

   ```bash
   npm install -g metalsmith-plugin-mcp-server
   ```

2. **Configure Your AI Assistant**:

   For Claude Desktop, add to your Claude configuration file:

   ```json
   {
     "mcpServers": {
       "metalsmith-plugin": {
         "command": "metalsmith-mcp-server"
       }
     }
   }
   ```

3. **Verify Installation**:

   Ask your AI assistant:

   > "Do you have access to the Metalsmith Plugin MCP Server?"

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

## Philosophy

This MCP server embodies a philosophy of **fundamentals over frameworks**:

- **Sustainable Development**: Focus on HTML, CSS, and Node.js skills that transfer everywhere
- **Educational Impact**: Teach patterns that last decades, not quarters

## Enhanced Standards

The server implements standards inspired by [@metalsmith/core-plugin](https://github.com/metalsmith/core-plugin), building upon and extending these proven patterns:

### Code Quality

- **ESLint 9.x flat config** with sophisticated rule sets
- **Comprehensive testing** with real Metalsmith instances (no mocks)
- **>95% test coverage** with systematic gap testing
- **Modern ES modules** with proper exports configuration

### Architecture

- **Modular design** with clear separation of concerns
- **Deep configuration merging** for flexible defaults
- **Token-based filename patterns** for dynamic paths
- **Comprehensive error handling** with helpful messages
- **Use native Metalsmith methods wherever possible**

### Documentation

- **Production-ready README** with badges and examples
- **Complete API documentation** with JSDoc comments
- **Troubleshooting guides** for common issues
- **Migration paths** for version updates

## Plugin Types

### Processor

Plugins that process file contents (e.g., markdown rendering, image optimization)

### Transformer

Plugins that transform file metadata or structure (e.g., permalinks, collections)

### Validator

Plugins that validate files against rules (e.g., HTML validation, link checking)

## Features

### Async Processing

Adds support for asynchronous file processing with configurable batch sizes

### Background Processing

Implements worker threads for CPU-intensive operations

### Metadata Generation

Automatically generates and attaches metadata to processed files

## Configuration

The MCP server can be configured through environment variables:

- `METALSMITH_MCP_DEBUG`: Enable debug logging
- `METALSMITH_MCP_TEMPLATES`: Custom templates directory

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing

```bash
# Run tests
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

_"Build with confidence knowing your generated code follows patterns you can understand, maintain, and explain to any developer."_

[npm-badge]: https://img.shields.io/npm/v/metalsmith-plugin-mcp-server.svg
[npm-url]: https://www.npmjs.com/package/metalsmith-plugin-mcp-server
[license-badge]: https://img.shields.io/github/license/wernerglinka/metalsmith-plugin-mcp-server
[license-url]: LICENSE
[coverage-badge]: https://img.shields.io/badge/test%20coverage-95%25-brightgreen
[coverage-url]: https://github.com/wernerglinka/metalsmith-plugin-mcp-server/actions/workflows/test.yml
[ai-assist-badge]: https://img.shields.io/badge/AI%20assist-CLAUDE-blue
[ai-assist-url]: ./CONTRIBUTING.md#ai-assistance-in-this-project
