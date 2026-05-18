# MCP Tools Reference

This document describes each MCP tool the server exposes, with calling
examples, options, and notes. For terminal use see
[cli.md](cli.md); for installing the server in Claude Desktop or
Claude Code see [setup.md](setup.md).

The server exposes ten MCP tools. The CLI adds one more
(`batch-audit`) that is not surfaced over MCP.

| Tool | Purpose |
|------|---------|
| [`plugin-scaffold`](#plugin-scaffold) | Generate a complete plugin structure (new plugins only) |
| [`validate`](#validate) | Check an existing plugin against quality standards |
| [`audit-plugin`](#audit-plugin) | Validation + lint + tests + coverage in one report |
| [`configs`](#configs) | Generate config files (biome.json, .release-it.json, etc.) |
| [`show-template`](#show-template) | Display a canonical config template |
| [`list-templates`](#list-templates) | List every available template path |
| [`get-template`](#get-template) | Retrieve a specific template file verbatim |
| [`install-claude-md`](#install-claude-md) | Add or smart-merge a CLAUDE.md into an existing plugin |
| [`diff-template`](#diff-template) | Detect drift between a plugin and the current scaffold |
| [`update-deps`](#update-deps) | Update dependencies via npm-check-updates |

---

## plugin-scaffold

Generate a complete Metalsmith plugin. Use only for new plugins in an
empty directory; never against an existing project.

```js
await mcp.call('plugin-scaffold', {
  name: 'my-feature',
  description: 'Processes and transforms content based on custom rules',
  features: ['async-processing', 'background-processing', 'metadata-generation'],
  outputPath: './plugins'
});
```

Generates:

- ESM-only `package.json` (`"type": "module"`, `"exports": "./src/index.js"`)
- `src/index.js` with the two-phase plugin pattern
- `test/index.test.js` using `node:test` + `node:assert/strict`
- `README.md`, `CLAUDE.md`, `docs/THEORY.md` (with stub markers)
- `biome.json` for unified lint + format
- `.github/workflows/test.yml`, `test-matrix.yml`, `claude-code.yml`
- `.github/dependabot.yml`
- `scripts/release.sh` for secure manual releases

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | **required** | Plugin name. Used exactly as provided — the tool never auto-adds a `metalsmith-` prefix. |
| `description` | `string` | **required** | What the plugin does. Required so Claude isn't tempted to infer functionality from the name. |
| `features` | `string[]` | `['async-processing']` | Any of `async-processing`, `background-processing`, `metadata-generation`. Exact strings required. |
| `outputPath` | `string` | `'.'` | Directory where `name/` will be created |
| `author` | `string` | from `.metalsmith-plugin-mcp` or git | Plugin author |
| `license` | `string` | `'MIT'` | `'MIT'`, `'Apache-2.0'`, `'ISC'`, `'BSD-3-Clause'`, `'UNLICENSED'` |

### Features

What each `features` value adds to the scaffold:

- **`async-processing`** — batch processing with configurable batch sizes,
  promise-based file iteration, error handling, progress tracking.
- **`background-processing`** — worker thread setup, concurrent file
  processing, worker pool management, structured message passing.
- **`metadata-generation`** — metadata extraction helpers, automatic
  enrichment of file objects, configurable schemas.

---

## validate

Check an existing plugin against quality standards. Returns a categorised
report: `passed`, `failed`, `warnings`, `recommendations`.

```js
await mcp.call('validate', {
  path: './metalsmith-my-plugin',
  functional: false
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | **required** | Plugin directory to validate |
| `checks` | `string[]` | All default checks | Subset of checks to run (see below) |
| `functional` | `boolean` | `false` | Actually run `npm test` and the coverage command instead of just inspecting config |

### Available checks

Pass any subset via the `checks` option. Default set runs every check
except `biome`, `coverage`, and `integration` (those are optional).

| Check | What it looks at |
|-------|------------------|
| `structure` | Required and recommended directories and files |
| `tests` | Test files, fixtures, test/coverage scripts in package.json |
| `docs` | README sections, badges, code examples, LICENSE |
| `package-json` | Required fields, naming, scripts, ESM exports, release setup |
| `release-notes` | `.release-it.json` config, executable `scripts/release.sh` |
| `biome` | Presence of `biome.json` (flags legacy ESLint/Prettier) |
| `coverage` | Coverage reports, native vs c8/nyc, threshold check |
| `jsdoc` | `@typedef`, `@param`, `@returns`, `Object.defineProperty(name)` patterns |
| `performance` | Files iteration patterns, RegExp placement, Buffer handling |
| `security` | Dangerous code execution, shell exec, hardcoded secrets |
| `integration` | Metadata respect, common plugin compatibility, ordering docs |
| `metalsmith-patterns` | Factory pattern, signature, native method usage |
| `marketing-language` | Buzzwords (`intelligent`, `smart`, `seamless`, etc.) |
| `module-consistency` | CJS syntax in README code blocks (scaffold is ESM-only) |
| `hardcoded-values` | Values that should be configurable options |
| `performance-patterns` | Objects redefined in functions, redundant utils |
| `i18n-readiness` | English-only output strings, locale assumptions |
| `theory-doc` | Presence and fill-in of `docs/THEORY.md` |

Each check lives in its own file under
[`src/tools/validate/checks/`](../src/tools/validate/checks/).

### CLAUDE.md integration

When a plugin has a `CLAUDE.md` declaring release patterns (npm script vs
shell script approach), the validator detects them and validates against
them instead of imposing a conflicting recommendation. This avoids the
"validator vs. project standard" noise on plugins that already have a
deliberate approach.

### Native methods detection

The validator flags external packages with native Metalsmith equivalents:

- `debug` → `metalsmith.debug()`
- `minimatch` → `metalsmith.match()`
- `process.env` → `metalsmith.env()`
- `path.join` → `metalsmith.path()`

---

## audit-plugin

Comprehensive plugin health report combining validation, linting,
formatting, tests, and coverage in one run.

```js
await mcp.call('audit-plugin', {
  path: './my-plugin',
  fix: true,         // apply automatic lint/format fixes
  output: 'json'     // 'console' | 'markdown' | 'json'
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `'.'` | Plugin directory |
| `fix` | `boolean` | `false` | Run `npm run lint` and `npm run format` (writing) instead of `--check` variants |
| `output` | `string` | `'console'` | `'console'`, `'markdown'`, or `'json'` |

### Scoring

Overall health is computed from weighted check results:

| Check | Weight |
|-------|--------|
| Validation | 40% |
| Tests pass/fail | 30% |
| Coverage % | 20% |
| Lint clean | 5% |
| Format clean | 5% |

| Label | Score |
|-------|-------|
| `EXCELLENT` | 90%+ |
| `GOOD` | 80–89% |
| `FAIR` | 70–79% |
| `NEEDS IMPROVEMENT` | 60–69% |
| `POOR` | <60% |

---

## configs

Generate one or more configuration files in a directory.

```js
await mcp.call('configs', {
  outputPath: './my-plugin',
  configs: ['biome', 'editorconfig', 'gitignore', 'release-it']
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputPath` | `string` | `'.'` | Directory to write into |
| `configs` | `string[]` | `['biome', 'editorconfig', 'gitignore']` | Any of `biome`, `editorconfig`, `gitignore`, `release-it` |

Existing files are never overwritten.

---

## show-template

Display the canonical content of a recommended configuration template
without writing it to disk. Useful for showing the user "this is what
the scaffold would generate."

```js
await mcp.call('show-template', { template: 'release-it' });
```

`template` accepts `'release-it'`, `'package-scripts'`, `'biome'`,
`'gitignore'`, `'editorconfig'`.

---

## list-templates

Return every template path the server can hand back via `get-template`.
Call this before guessing a template name.

```js
await mcp.call('list-templates');
```

No options.

---

## get-template

Retrieve the exact content of a specific template file.

```js
await mcp.call('get-template', { template: 'plugin/CLAUDE.md' });
```

| Option | Type | Description |
|--------|------|-------------|
| `template` | `string` | Template path, e.g. `'plugin/CLAUDE.md'`, `'configs/release-it.json'`, `'workflows/test.yml'` |

Use [`list-templates`](#list-templates) first to discover paths.

---

## install-claude-md

Install or smart-merge a `CLAUDE.md` into an existing plugin. The smart
merge preserves user customisations and only updates the
`## MCP Server Integration (CRITICAL)` section.

```js
await mcp.call('install-claude-md', {
  path: '.',
  replace: false,    // false = smart merge, true = overwrite
  dryRun: false      // true = preview only
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `'.'` | Directory where `CLAUDE.md` lives |
| `replace` | `boolean` | `false` | Overwrite the entire file instead of merging |
| `dryRun` | `boolean` | `false` | Show what would change without writing |

### Smart-merge behaviour

- No existing `CLAUDE.md` → writes the full template.
- Existing file with no MCP section → inserts the MCP section after
  the first `# ` heading.
- Existing file with an MCP section → replaces just that section,
  preserving everything else.

---

## diff-template

Diff a plugin against the current scaffold templates. Reports which
files match, are missing, or have drifted, with unified-diff snippets
for drifted files.

```js
await mcp.call('diff-template', {
  path: '.',
  templates: ['plugin/package.json.template']  // optional filter
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `'.'` | Plugin directory |
| `templates` | `string[]` | all tracked | Filter by template path or target path |

Filter values accept either form:
`'plugin/package.json.template'` or `'.github/workflows/test.yml'`.

---

## update-deps

Update dependencies in a single plugin or every plugin in a parent
directory using `npm-check-updates`.

```js
await mcp.call('update-deps', {
  path: './plugins',
  major: false,        // minor/patch only by default
  interactive: false,
  dryRun: false
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `'.'` | Plugin directory or parent containing plugins |
| `major` | `boolean` | `false` | Include major version bumps (otherwise minor/patch only) |
| `interactive` | `boolean` | `false` | Step through updates interactively |
| `dryRun` | `boolean` | `false` | Show updates without writing |

Plugins are detected by `metalsmith-` prefix when scanning a parent
directory.
