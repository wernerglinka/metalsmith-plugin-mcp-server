# CLI Reference

The `metalsmith-plugin-mcp-server` CLI mirrors the MCP tool surface plus
a few interactive niceties. Use it directly with `npx` for one-off
scaffolding, validation, audits, or batch operations — no Claude
required.

For the MCP tool surface used by AI clients see [tools.md](tools.md).
For installing the server in Claude Desktop or Claude Code see
[setup.md](setup.md).

## Command list

```bash
npx metalsmith-plugin-mcp-server <command> [args]
```

| Command | Purpose |
|---------|---------|
| `help` | Show CLI help |
| `version` | Show server version |
| `config` | Show current configuration |
| `server` | Start the MCP server (used by Claude Desktop/Code) |
| `scaffold [name] [description] [path]` | Scaffold a new plugin |
| `validate [path] [--functional]` | Validate a plugin |
| `audit [path] [--fix] [--output=...]` | Audit one plugin |
| `batch-audit [path] [--fix] [--output=...]` | Audit every plugin in a directory |
| `configs [path]` | Generate config files |
| `show-template <type>` | Display a config template |
| `list-templates` | List all retrievable templates |
| `get-template <name>` | Print a template's content |
| `install-claude-md [path] [--replace] [--dry-run]` | Install or merge CLAUDE.md |
| `update-deps [path] [--install] [--test]` | Update dependencies |
| `diff-template [path] [--templates=a,b]` | Diff plugin against current scaffold |

Most commands run in **guided mode** if you omit required parameters —
they'll prompt you. **Expert mode** is positional: pass everything on
the command line.

## scaffold

Create a new plugin from the canonical scaffold.

```bash
# Guided
npx metalsmith-plugin-mcp-server scaffold

# Expert
npx metalsmith-plugin-mcp-server scaffold my-plugin "Processes markdown files" ./plugins
```

Positional args: `name`, `description`, `outputPath` (defaults to `.`).
See [tools.md → plugin-scaffold](tools.md#plugin-scaffold) for what gets
generated.

## validate

Check a plugin against quality standards.

```bash
# Standard validation — inspects files and config only
npx metalsmith-plugin-mcp-server validate ./my-plugin

# Functional validation — also runs `npm test` and the coverage command
npx metalsmith-plugin-mcp-server validate ./my-plugin --functional
```

Output is grouped into four categories:

- **Passed** — requirement met
- **Failed** — must-fix
- **Warnings** — quality concern
- **Recommendations** — optional, with exact commands you can paste

Example recommendation lines:

```
💡 Consider adding a LICENSE file. Generate one with: npx metalsmith-plugin-mcp-server scaffold ./my-plugin LICENSE MIT
💡 Consider adding a Biome configuration for lint + format. Generate with: npx metalsmith-plugin-mcp-server configs . --configs biome
💡 Use metalsmith.debug() instead of debug package. Replace debug() calls with metalsmith.debug()
💡 Use metalsmith.match() instead of minimatch package for file pattern matching
```

### Native methods

The validator flags external packages with native Metalsmith
equivalents:

| External | Replace with |
|----------|--------------|
| `debug` | `metalsmith.debug()` |
| `minimatch` | `metalsmith.match()` |
| `process.env` | `metalsmith.env()` |
| `path.join` | `metalsmith.path()` |

### CLAUDE.md awareness

If your plugin has a `CLAUDE.md` declaring a release-script pattern,
the validator detects it and validates against that pattern rather than
imposing a conflicting recommendation. See
[tools.md → validate](tools.md#validate) for the full check list and
the per-check breakdown.

## audit / batch-audit

Run validation + lint + format + tests + coverage as a single health
report. The MCP surface only exposes `audit-plugin` (single plugin);
the CLI adds `batch-audit` for processing every plugin in a directory.

```bash
# Single plugin
npx metalsmith-plugin-mcp-server audit ./my-plugin
npx metalsmith-plugin-mcp-server audit ./my-plugin --fix
npx metalsmith-plugin-mcp-server audit ./my-plugin --output=json
npx metalsmith-plugin-mcp-server audit ./my-plugin --output=markdown

# Every plugin in a parent directory
npx metalsmith-plugin-mcp-server batch-audit ./plugins
npx metalsmith-plugin-mcp-server batch-audit ./plugins --fix
npx metalsmith-plugin-mcp-server batch-audit ./plugins --output=json
```

`--fix` applies automatic lint and format fixes. See
[tools.md → audit-plugin](tools.md#audit-plugin) for the scoring
formula and health-label thresholds.

## configs

Generate one or more configuration files in a plugin directory.

```bash
npx metalsmith-plugin-mcp-server configs ./my-plugin
```

Default set is `biome`, `editorconfig`, `gitignore`. Existing files are
never overwritten. See
[tools.md → configs](tools.md#configs) for the full options list.

## show-template / list-templates / get-template

Inspect the canonical scaffold templates without scaffolding a whole
plugin:

```bash
# Show one of the curated config templates
npx metalsmith-plugin-mcp-server show-template release-it
npx metalsmith-plugin-mcp-server show-template package-scripts

# List every template available via get-template
npx metalsmith-plugin-mcp-server list-templates

# Print a specific template's content verbatim
npx metalsmith-plugin-mcp-server get-template plugin/CLAUDE.md
npx metalsmith-plugin-mcp-server get-template configs/release-it.json
```

## install-claude-md

Add or merge a `CLAUDE.md` in an existing plugin. The smart merge
preserves user customisations.

```bash
# Smart merge (default) — preserves your existing content
npx metalsmith-plugin-mcp-server install-claude-md

# Preview the merge without writing
npx metalsmith-plugin-mcp-server install-claude-md --dry-run

# Replace the file entirely
npx metalsmith-plugin-mcp-server install-claude-md --replace
```

See [tools.md → install-claude-md](tools.md#install-claude-md) for the
merge algorithm.

## update-deps

Update dependencies in a plugin (or every plugin in a parent directory).

```bash
# Show what's available to update
npx metalsmith-plugin-mcp-server update-deps ./my-plugin

# Update, install, and run tests in one go
npx metalsmith-plugin-mcp-server update-deps ./my-plugin --install --test

# Process every plugin in a directory
npx metalsmith-plugin-mcp-server update-deps ./plugins --install --test
```

By default only minor/patch updates are applied — pass `--major` for
breaking changes. See [tools.md → update-deps](tools.md#update-deps).

## diff-template

Detect drift between a plugin and the current scaffold templates.

```bash
# Compare every tracked template
npx metalsmith-plugin-mcp-server diff-template ./my-plugin

# Diff one specific template
npx metalsmith-plugin-mcp-server diff-template . --templates=plugin/package.json.template
```

Each tracked file is reported as `matches`, `missing`, or `drifted`
(with a unified diff snippet for drifted files).

## config

Show current effective configuration and explain how settings affect
plugin creation.

```bash
npx metalsmith-plugin-mcp-server config
```

Prints which config files were found, the merged values, what each
configured feature does, and an example config block.

## Per-user defaults: `.metalsmith-plugin-mcp`

Create a `.metalsmith-plugin-mcp` file in the current directory or your
home directory to set defaults for new plugins:

```json
{
  "license": "MIT",
  "author": "Your Name <your.email@example.com>",
  "outputPath": "./plugins",
  "features": ["async-processing"]
}
```

Available defaults:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `license` | `string` | `'MIT'` | Default license |
| `author` | `string` | `''` | Default author |
| `outputPath` | `string` | `'.'` | Default output directory |
| `features` | `string[]` | `['async-processing']` | Default features |

## Per-plugin validation rules: `.metalsmith-plugin-validation.json`

Override the validator's defaults per plugin by dropping a config file
in the plugin directory. The validator looks for, in order:

1. `.metalsmith-plugin-validation.json`
2. `.validation.json`
3. `.validationrc.json`

```json
{
  "rules": {
    "structure": {
      "enabled": true,
      "requiredDirs": ["src", "test"],
      "requiredFiles": ["src/index.js", "README.md"],
      "recommendedDirs": ["src/utils", "test/fixtures"]
    },
    "tests": {
      "enabled": true,
      "coverageThreshold": 85,
      "requireFixtures": false
    },
    "documentation": {
      "enabled": true,
      "requiredSections": ["Installation", "Usage"],
      "recommendedSections": ["Options", "Examples", "API"]
    },
    "packageJson": {
      "namePrefix": "metalsmith-",
      "requiredScripts": ["test"],
      "recommendedScripts": ["lint", "format", "test:coverage"]
    }
  },
  "recommendations": {
    "showCommands": true,
    "templateSuggestions": true
  }
}
```

Set `namePrefix` to `""` to disable the metalsmith- prefix
recommendation entirely.

## Debugging

The server writes diagnostic output to stderr; stdout is reserved for
the MCP JSON-RPC protocol. To watch the server's logs while running:

```bash
node src/index.js 2>&1 >/dev/null
```

For CLI commands, all output is shown directly in your terminal.
