# Metalsmith Plugin MCP Server

MCP server for scaffolding and validating high-quality Metalsmith plugins.

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url]
[![test coverage][coverage-badge]][coverage-url]
[![Known Vulnerabilities](https://snyk.io/test/npm/metalsmith-plugin-mcp-server/badge.svg)](https://snyk.io/test/npm/metalsmith-plugin-mcp-server)

This MCP (Model Context Protocol) server gives Claude and other AI
clients a small, opinionated toolkit for creating and maintaining
Metalsmith plugins. Scaffolded plugins are ESM-only (Node 22+), use
Biome for unified lint + format, and run tests via the native
`node:test` runner with native coverage. CommonJS consumers can still
`require()` ESM-only plugins via Node 22's stable `require(esm)`.

Use it two ways: as an MCP server inside Claude Desktop / Claude Code,
or directly from the terminal with `npx`.

## Documentation

- **[docs/tools.md](docs/tools.md)** — per-tool MCP reference (options, examples, validation rules)
- **[docs/cli.md](docs/cli.md)** — full CLI command reference
- **[docs/setup.md](docs/setup.md)** — installing the server in Claude Desktop or Claude Code
- **[MIGRATION.md](MIGRATION.md)** — upgrading existing plugins to the current scaffold
- **[CHANGELOG.md](CHANGELOG.md)** / [GitHub releases](https://github.com/wernerglinka/metalsmith-plugin-mcp-server/releases) — version history
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — contributing guidelines
- **[TESTING.md](TESTING.md)** — testing the server locally
- **[RELEASE.md](RELEASE.md)** — release process

## Installation

```bash
npm install -g metalsmith-plugin-mcp-server
```

Or use directly with npx (no install):

```bash
npx metalsmith-plugin-mcp-server --help
```

## Quick start

**Scaffold a new plugin:**

```bash
npx metalsmith-plugin-mcp-server scaffold metalsmith-my-plugin "Processes markdown files" ./plugins
```

**Validate an existing plugin:**

```bash
npx metalsmith-plugin-mcp-server validate ./metalsmith-my-plugin
```

**Use with Claude Code:**

```bash
claude mcp add metalsmith-plugin npx "metalsmith-plugin-mcp-server@latest" "server"
```

Then in Claude: *"Create a Metalsmith plugin called metalsmith-json-feed
that generates JSON feeds from markdown files."* See
[docs/setup.md](docs/setup.md) for the full setup, including Claude
Desktop config.

## Available tools

| Tool | What it does |
|------|--------------|
| `plugin-scaffold` | Generate a complete plugin (src/, test/, package.json, README.md, CLAUDE.md, GitHub workflows). Use only for new plugins in an empty directory. |
| `validate` | Check an existing plugin against 17 quality checks (structure, tests, docs, package shape, native methods, marketing language, hardcoded values, etc.) |
| `audit-plugin` | Validation + lint + tests + coverage in one health report |
| `configs` | Generate config files (biome.json, .release-it.json, .editorconfig, .gitignore) |
| `show-template` | Display a canonical config template (release-it, package-scripts, biome, etc.) |
| `list-templates` | List every template the server can hand back |
| `get-template` | Retrieve a specific template file verbatim |
| `install-claude-md` | Add or smart-merge a CLAUDE.md into an existing plugin |
| `diff-template` | Detect drift between a plugin and the current scaffold templates |
| `update-deps` | Update dependencies via npm-check-updates |

The CLI adds `batch-audit` for processing every plugin in a directory.

See [docs/tools.md](docs/tools.md) for full options, examples, and the
complete list of validation checks.

## What a scaffolded plugin looks like

A `plugin-scaffold` call produces:

- ESM-only `package.json` (`"type": "module"`, `"exports": "./src/index.js"`) — no build step, no `lib/`, no microbundle
- `src/index.js` using the two-phase plugin factory pattern
- `test/index.test.js` using `node:test` + `node:assert/strict` against a real Metalsmith instance
- `biome.json` for unified lint + format
- Native test coverage via `node --test --experimental-test-coverage`
- `README.md`, `CLAUDE.md`, `docs/THEORY.md` skeletons
- `.github/workflows/test.yml`, `test-matrix.yml`, `claude-code.yml`
- `.github/dependabot.yml`
- `scripts/release.sh` for secure manual releases (`gh auth token` based)

The scaffold enforces use of Metalsmith's native methods
(`metalsmith.debug()`, `metalsmith.match()`, `metalsmith.env()`,
`metalsmith.path()`) over external `debug`, `minimatch`, `process.env`,
or `path.join`.

## Validation philosophy

The `validate` tool returns four categories:

- **Passed** — requirement met
- **Failed** — must-fix
- **Warnings** — quality concern (low coverage, unfilled THEORY.md stub)
- **Recommendations** — optional, with the exact command you can paste

Naming and license are recommendations, never failures — author choice
is respected. Each check lives in its own file under
[`src/tools/validate/checks/`](src/tools/validate/checks/) and is
described in [docs/tools.md](docs/tools.md#available-checks).

## Plugin types

The scaffold supports the three common plugin shapes:

- **Processor** — transforms file contents (markdown rendering, image optimization)
- **Transformer** — reshapes file metadata or structure (permalinks, collections)
- **Validator** — checks files against rules (HTML validation, link checking)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Before any commit:

```bash
npm run lint
npm run format
npm test
```

## Resources

- [Metalsmith Documentation](https://metalsmith.io)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)

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
