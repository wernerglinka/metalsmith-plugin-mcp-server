# Metalsmith Sectioned Blog Pagination - Development Guide

## MCP Server Integration (CRITICAL)

**IMPORTANT**: This plugin was created with `metalsmith-plugin-mcp-server`. When working on this plugin, AI assistants (Claude) MUST use the MCP server tools rather than creating their own implementations.

### Essential MCP Commands

This plugin generates paginated blog landing pages for Metalsmith sites using a modular page building paradigm.

## Quick Commands

```bash
# Development
npm test           # Run all tests
npm run coverage   # Generate coverage report
npm run lint       # Lint and fix code
npm run format     # Format code with Prettier

# Release
npm run release:patch  # Bug fixes (1.0.0 → 1.0.1)
npm run release:minor  # New features (1.0.0 → 1.1.0)
npm run release:major  # Breaking changes (1.0.0 → 2.0.0)
npm run release:check  # Dry run to preview release

# Build
npm run build      # Build ESM and CommonJS versions
```

## Plugin Overview

This plugin creates blog pagination metadata that works with sectioned/modular page builders. It generates multiple blog landing pages (e.g., `/blog/`, `/blog/2/`, `/blog/3/`) from a main template file.

### Key Features

- Generates pagination metadata for blog collections
- Works with modular/sectioned page templates
- Configurable posts per page
- Compatible with Nunjucks and other templating engines

## Architecture

### Core Logic Flow

1. Plugin reads the main blog template (default: `blog.md`)
2. Calculates total pages based on collection size and `pagesPerPage`
3. Creates new pages in Metalsmith's file tree for each pagination page
4. Adds pagination metadata to each generated page
5. Removes the original template from the build

### Generated Metadata

Each generated page receives:

- `params.pageNumber`: Current page number (1-indexed)
- `params.numberOfPages`: Total number of pages
- `params.currentList`: Array of blog posts for current page
- Original page metadata is preserved

## Configuration Options

- `pagesPerPage` (number): Number of blog posts per page (default: 10)
- `blogDirectory` (string): Directory containing blog posts (default: "blog/")
- `mainTemplate` (string): Main blog template file (default: "blog.md")

## Testing

The plugin includes comprehensive tests:

- Unit tests for configuration validation
- Integration tests with Metalsmith
- Edge case handling (empty collections, missing templates)

Run tests with:

```bash
npm test           # Run all tests
npm run test:esm   # Run ESM tests only
npm run test:cjs   # Run CommonJS tests only
npm run coverage   # Generate coverage report
```

## Common Use Cases

### Basic Blog Pagination

```javascript
metalsmith
  .use(
    collections({
      blog: {
        pattern: 'blog/*.md',
        sortBy: 'date',
        reverse: true
      }
    })
  )
  .use(
    sectionedBlogPagination({
      pagesPerPage: 12,
      blogDirectory: 'blog/'
    })
  );
```

### Multiple Blog Sections

For sites with multiple blog sections, run the plugin multiple times with different configurations:

```javascript
// Tech blog
.use(sectionedBlogPagination({
  pagesPerPage: 10,
  blogDirectory: "tech-blog/",
  mainTemplate: "tech-blog.md"
}))
// Personal blog
.use(sectionedBlogPagination({
  pagesPerPage: 15,
  blogDirectory: "personal/",
  mainTemplate: "personal-blog.md"
}))
```

## Debugging

Enable debug output:

```bash
DEBUG=metalsmith-sectioned-blog-pagination:* npm test
```

## Development Workflow

### Making Changes

1. **Before starting**: Run tests to ensure clean state

   ```bash
   npm test
   ```

2. **During development**: Use watch mode if available or run tests frequently

   ```bash
   npm test
   ```

3. **Before committing**: Run all checks
   ```bash
   npm run lint
   npm run format
   npm test
   npm run coverage
   ```

### Release Process

1. **Ensure GitHub CLI is authenticated**:

   ```bash
   gh auth status
   ```

2. **Run release check**:

   ```bash
   npm run release:check
   ```

3. **Create release**:
   ```bash
   npm run release:patch  # for bug fixes
   npm run release:minor  # for new features
   npm run release:major  # for breaking changes
   ```

## Integration with Templates

The plugin provides pagination data that can be used in templates:

```nunjucks
<ul class="blogs-pagination">
  {% for i in range(0, params.numberOfPages) -%}
  <li {% if ((i + 1) == params.pageNumber) %}class="active"{% endif %}>
    {% if i == 0 %}
    <a href="/blog/">1</a>
    {% else %}
    <a href="/blog/{{ i + 1 }}/">{{ i + 1 }}</a>
    {% endif %}
  </li>
  {%- endfor %}
</ul>
```

## Project Structure

```
metalsmith-sectioned-blog-pagination/
├── src/
│   ├── index.js          # Main plugin file
│   └── utils/            # Utility functions
│       ├── validation.js # Input validation
│       └── pagination.js # Pagination helpers
├── lib/                  # Built files (ESM & CJS)
├── test/
│   ├── index.js          # Main tests
│   ├── cjs.test.cjs      # CommonJS compatibility tests
│   └── fixtures/         # Test fixtures
├── scripts/
│   └── release.sh        # Secure release script
└── .github/
    └── workflows/
        └── tests.yml     # CI/CD pipeline
```

## Code Style Guidelines

- Use functional programming patterns
- Prefer pure functions
- Use descriptive variable names
- Add JSDoc comments for all public functions
- Keep functions small and focused
- Use early returns to reduce nesting

## Testing Guidelines

- Write tests for all new features
- Maintain > 90% code coverage
- Test both ESM and CommonJS builds
- Include edge cases in tests
- Use descriptive test names

## Contributing

When contributing to this plugin:

1. Follow the existing code style
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass
5. Use semantic commit messages

## Known Issues & Limitations

1. The plugin assumes blog posts are in a collection named "blog"
2. Generated paths follow the pattern `{blogDirectory}/{pageNumber}/`
3. The main template must exist before the plugin runs

## Future Enhancements

- Support for custom collection names
- Configurable URL patterns
- Previous/next page metadata
- First/last page indicators
