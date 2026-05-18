# Setup Guide

How to install the MCP server in Claude Desktop or Claude Code so an
AI assistant can scaffold and validate Metalsmith plugins for you.

For the tool surface itself see [tools.md](tools.md). For terminal use
without an AI client see [cli.md](cli.md).

## Quick start (Claude Code, recommended)

The fastest path. No local install needed:

```bash
claude mcp add metalsmith-plugin npx "metalsmith-plugin-mcp-server@latest" "server"
```

Verify:

```bash
claude mcp list
```

Then restart Claude Code. In a new session, the server's MCP tools
become available — see [tools.md](tools.md) for the full list.

## Claude Desktop

Edit your Claude Desktop MCP configuration:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

Add one of these `mcpServers` entries.

**Option A — npx (recommended, no install)**

```json
{
  "mcpServers": {
    "metalsmith-plugin-server": {
      "command": "npx",
      "args": ["metalsmith-plugin-mcp-server", "server"]
    }
  }
}
```

**Option B — local installation**

First install the server somewhere:

```bash
mkdir ~/metalsmith-mcp-tools
cd ~/metalsmith-mcp-tools
npm init -y
npm install metalsmith-plugin-mcp-server
```

Then point Claude Desktop at the installed binary:

```json
{
  "mcpServers": {
    "metalsmith-plugin-server": {
      "command": "node",
      "args": ["/Users/yourusername/metalsmith-mcp-tools/node_modules/metalsmith-plugin-mcp-server/src/index.js"],
      "cwd": "/Users/yourusername/metalsmith-mcp-tools"
    }
  }
}
```

Restart Claude Desktop after editing the file.

## Notes

- Replace `yourusername` with your actual username for the local-install
  paths.
- Paths are case-sensitive — `/Users` on macOS, not `/users`.
- If you use NVM, the binary path may differ; run `which node` to find
  yours.
- For the npx form, the trailing `server` argument is required — the CLI
  uses it to switch from interactive mode to stdio MCP mode.

## Verifying the setup

In a new Claude Desktop / Claude Code session, ask:

> "Do you have access to the Metalsmith Plugin MCP Server?"

You should see these tools listed:

- `plugin-scaffold` — generate plugin structures
- `validate` — check plugin quality
- `audit-plugin` — full validation + lint + tests + coverage report
- `configs` — create configuration files
- `show-template` — display recommended config templates
- `list-templates` — show all available templates
- `get-template` — retrieve specific template content
- `install-claude-md` — install CLAUDE.md with smart merge
- `update-deps` — update plugin dependencies
- `diff-template` — detect drift vs the current scaffold

If the server is connected but the tools aren't showing, restart the
Claude client.

## Workflow for existing plugins

For an existing plugin that doesn't have a CLAUDE.md yet:

```bash
# 1. (One time) Add the MCP server
claude mcp add metalsmith-plugin npx "metalsmith-plugin-mcp-server@latest" "server"

# 2. Install a CLAUDE.md with full MCP instructions
#    Smart-merges with any existing content
npx metalsmith-plugin-mcp-server install-claude-md

# Preview the merge first if unsure
npx metalsmith-plugin-mcp-server install-claude-md --dry-run

# Or replace any existing CLAUDE.md entirely
npx metalsmith-plugin-mcp-server install-claude-md --replace
```

Then in Claude:

> "Please review CLAUDE.md for context on how to work with this plugin."

Claude will now know to use the MCP server's tools and templates
verbatim rather than improvising. See
[tools.md → install-claude-md](tools.md#install-claude-md) for how the
smart merge works.

## Example prompts

Once the server is connected, these prompts trigger MCP tool calls:

**Create a new plugin**

> "Create a new Metalsmith plugin called metalsmith-json-feed that
> generates JSON feeds from markdown files. Include async processing
> and comprehensive tests."

**Validate and act on recommendations**

> "Does the MCP server have any recommendations for this plugin?"
>
> "Run the MCP validation on this plugin and implement any
> recommendations."

**Modernise an older plugin**

> "Update my Metalsmith plugin to use Biome for lint+format and the
> native node:test runner."

**Detect scaffold drift**

> "Diff this plugin against the current scaffold and tell me what's
> out of date."

## Following recommendations verbatim

When the MCP server returns a recommendation with an exact command or
config snippet, copy it exactly. Past Claude instances have paraphrased
or "simplified" recommendations and broken release workflows. The
recommendations are designed to match the templates the rest of the
toolchain expects.
