# Metalsmith Technical Context

## Core Philosophy

Metalsmith is "an extremely simple, pluggable static site generator for NodeJS" that treats file transformation as JavaScript object manipulation. Its fundamental approach is to convert directory trees into plain JavaScript objects that can be effortlessly manipulated through plugins.

## Execution Model

### Build Pipeline

1. **Read Phase**: Metalsmith core reads all files from source directory into memory
2. **Transform Phase**: Plugins sequentially process the `files` object
3. **Write Phase**: Metalsmith core writes the final `files` object to destination directory

### Key Principle: In-Memory Processing

- **Plugins DO NOT interact with the file system directly**
- **Plugins only manipulate JavaScript objects in memory**
- **File I/O is handled exclusively by Metalsmith core**

## Files Object Structure

The `files` object is a dictionary where:

- **Keys**: File paths (strings) relative to source directory
- **Values**: `File` objects containing:
  - `contents`: NodeJS Buffer with file contents
  - `stats`: Filesystem metadata (from fs.stat)
  - `mode`: Octal permission mode
  - **Custom metadata**: Any properties added by plugins

```javascript
// Example files object structure
{
  "index.md": {
    contents: Buffer.from("# Hello World"),
    stats: { /* fs.Stats object */ },
    mode: "0644",
    // Plugin-added metadata
    title: "Home Page",
    layout: "page.html",
    collection: "pages"
  },
  "about.md": {
    contents: Buffer.from("# About Us"),
    // ... more properties
  }
}
```

## Plugin Architecture

### Plugin Function Signature

```javascript
function plugin(files, metalsmith, done) {
  // Synchronous processing - no done() call needed
  Object.keys(files).forEach((filepath) => {
    const file = files[filepath];
    // Transform file.contents or add metadata
  });

  // OR asynchronous processing - must call done()
  setTimeout(() => {
    // async work
    done(); // Signal completion
  }, 100);
}
```

### Plugin Capabilities

Plugins can:

- **Read/modify file contents** (Buffer manipulation)
- **Add/modify/delete metadata** on file objects
- **Add/remove files** from the files object
- **Access global metadata** via `metalsmith.metadata()`
- **Chain with other plugins** through sequential execution

### Plugin Execution Context

- **Single execution per build** - plugins run once, not repeatedly
- **Sequential processing** - plugins execute in order they're added
- **Shared state** - all plugins operate on the same `files` object
- **No file system access** - transformation happens in memory

## What This Means for Plugin Development

### Performance Considerations

- **No file I/O optimization needed** - Metalsmith core handles this
- **No caching of file system operations** - files are already in memory
- **Focus on object manipulation efficiency** - string/Buffer operations
- **Memory usage patterns** - working with potentially large files objects

### Security Considerations

- **No directory traversal risks** - no direct file system access
- **No external input validation** - build-time configuration from trusted sources
- **Dependency security** - main concern is supply chain attacks
- **Build environment** - controlled, not production runtime environment

### Common Plugin Patterns

1. **File filtering**: `Object.keys(files).filter(path => condition)`
2. **Content transformation**: Modify `file.contents` Buffer
3. **Metadata enrichment**: Add properties to file objects
4. **File creation**: Add new entries to `files` object
5. **Integration**: Respect/use metadata from other plugins

### What Plugins Should NOT Do

- Direct file system operations (reading/writing files)
- Network requests (unless specifically needed for content)
- Process spawning (unless for external tools)
- Database connections
- Server-like error handling patterns

## Use Cases Beyond Static Sites

Metalsmith's flexibility enables:

- Project scaffolding tools
- Documentation generators
- Build process automation
- eBook creation
- Any file transformation pipeline

## Key Takeaway

Metalsmith plugins are **pure data transformation functions** that operate on JavaScript objects representing files. They should be designed around efficient object manipulation, not file system operations or server-like patterns.
