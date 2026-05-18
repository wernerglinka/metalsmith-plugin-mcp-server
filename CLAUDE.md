# Metalsmith Plugin MCP Server — Development Context

This file gives Claude what it needs to work in *this* repo. Project overview,
release notes, and migration steps live in [README.md](README.md),
[CHANGELOG.md](CHANGELOG.md), [RELEASE.md](RELEASE.md), and
[MIGRATION.md](MIGRATION.md) respectively — don't duplicate them here.

Composes with `~/Documents/CLAUDE.md` (loaded by Claude Code under `~/Documents/`).
Tone rules from there apply: direct, no agreement filler, prose over bullets,
no em-dashes.

## Hard rules

### Never modify configuration files without explicit permission

Includes any `.json`, `.yml`, `.yaml`, `.config.js`. Always ask:
"Should I modify [file] to [change]?"

The trap to remember: `.release-it.json` has `"npm.publish": false`
intentionally. Werner publishes to npm manually. Do not flip this to `true`.

### Detect context before invoking MCP tools

Run `LS` first. Files present (`package.json`, `src/`, `README.md`) → existing
project; use `get-template`, `validate`, `install-claude-md`, edit files
directly. Empty directory → new project; use `plugin-scaffold`. Never call
`plugin-scaffold` against a populated directory.

### Never mock Metalsmith in tests

Use a real `Metalsmith` instance against a temp directory. Applies to tests
in this repo and to scaffolded plugin test templates. Mocking
`metalsmith()`, `metalsmith.match`, `metalsmith.debug`, `metalsmith.env`,
`metalsmith.path`, or plugin invocation has historically hidden signature
mismatches, metadata bugs, and path resolution errors that only surfaced in
production. Metalsmith lives in `devDependencies` for this reason. Mocking
unrelated systems (network, non-Metalsmith fs concerns) is fine.

### Follow MCP server recommendations verbatim

When the MCP server returns a recommendation, copy the suggested code or
configuration exactly. Do not paraphrase, "simplify", or improvise an
equivalent. Past Claude instances have done this and broken release
workflows.

## Pre-commit workflow

Before any commit or release, run in order:

```bash
npm run lint
npm run format
npm test
```

If any step fails, fix the underlying issue and re-run. Don't skip hooks or
bypass checks. Lint failures are usually auto-fixable; the `lint` script
already passes `--write`.

Release commands (only after the above succeed):

```bash
npm run release:patch   # bug fix
npm run release:minor   # new feature
npm run release:major   # breaking change
```

## What the server does

Provides MCP tools and an equivalent CLI for scaffolding and validating
Metalsmith plugins. Each tool implementation lives in `src/tools/<name>.js`
and is wired into the MCP dispatcher in [src/index.js](src/index.js) and
into the CLI in [src/cli.js](src/cli.js).

Currently exposed tools: `plugin-scaffold`, `validate`, `configs`,
`update-deps`, `show-template`, `list-templates`, `get-template`,
`install-claude-md`, `audit-plugin`, `diff-template`. Tool schemas are
authoritative in `src/index.js`; the CLI must stay in sync with those
enums.

## Validation categories

Each `checkXxx` in [src/tools/validate-plugin.js](src/tools/validate-plugin.js)
pushes into one of four buckets:

- `passed` — requirement met
- `failed` — must-fix (license missing, wrong package shape, etc.)
- `warnings` — quality concern (low test coverage, theory doc stub)
- `recommendations` — optional improvement with the exact command to run

Naming and license choices are author preferences and stay as
recommendations, never failures.

## Feature strings (exact)

The scaffold accepts `features: ['async-processing', 'background-processing',
'metadata-generation']`. Default is `['async-processing']`. Any other
string is rejected.

## Per-plugin config files

- `.metalsmith-plugin-mcp` — scaffolding defaults (author, license, etc.)
- `.metalsmith-plugin-validation.json` — per-rule overrides

## Metalsmith plugin conventions

**Metalsmith in `devDependencies`, not `peerDependencies`.** Tests import
Metalsmith directly; the plugin code itself receives the instance as a
parameter and never imports Metalsmith. Users have it in their own project.

**Prefer Metalsmith's native methods over external packages:**

```javascript
// ❌
const debug = require('debug')('my-plugin');
const minimatch = require('minimatch');
// ✅
const debug = metalsmith.debug('my-plugin');
const isMatch = metalsmith.match(pattern, filename);
```

Also use `metalsmith.env()` over `process.env` and `metalsmith.path()` over
manual joins. The validator flags external packages where a native method
exists.

## When changing tools or schemas

A tool change usually touches multiple files. Easy to miss one and ship
drift:

1. Tool implementation — `src/tools/<name>.js`
2. MCP schema — `src/index.js` (`TOOLS` array)
3. CLI command — `src/cli.js`
4. Tests — `test/<name>.test.js`
5. README + this file if the change is user-visible

The `validate-plugin` and `diff-template` tools also have manifests that
must stay in sync with `copyTemplates()` in `src/tools/plugin-scaffold.js`
when scaffold files are added or removed.

## Error handling

Fail fast with actionable messages. Don't add defensive checks for
impossible states. Don't wrap clear errors in vague catch-all messages.
Validate inputs at the boundary (MCP tool args, CLI argv); trust internal
calls.

## Style

- Be concise. Skip preambles.
- Provide specific commands users can paste, especially in recommendation
  output.
- Respect author choices; recommend, don't enforce.
- Functional correctness matters more than structural conformance.
