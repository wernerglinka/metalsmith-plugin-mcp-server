#!/usr/bin/env node

/**
 * Metalsmith MCP Server
 *
 * Entry point — registers the server's tools with the MCP SDK and starts
 * a stdio transport. Tool implementations live in src/tools/<name>.js
 * and are wrapped here with zod schemas so the SDK validates inputs
 * before dispatch.
 *
 * Communication is JSON-RPC over stdio:
 * - stdin:  requests from the client
 * - stdout: protocol responses (NEVER write non-protocol data here)
 * - stderr: free for diagnostic logging
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import chalk from 'chalk';
import { z } from 'zod';

// Force-disable ANSI color codes in tool responses. chalk auto-detects
// non-TTY stdout, but FORCE_COLOR can override that. Pin level=0 so MCP
// responses stay clean regardless of the environment the server runs in.
chalk.level = 0;

import { pluginScaffoldTool } from './tools/plugin-scaffold.js';
import { validatePluginTool } from './tools/validate-plugin.js';
import { generateConfigsTool } from './tools/generate-configs.js';
import { updateDepsTool } from './tools/update-deps.js';
import { showTemplateTool } from './tools/show-template.js';
import { auditPlugin } from './tools/audit-plugin.js';
import { listTemplatesTool } from './tools/list-templates.js';
import { getTemplateTool } from './tools/get-template.js';
import { installClaudeMdTool } from './tools/install-claude-md.js';
import { diffTemplateTool } from './tools/diff-template.js';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reflect the published version in MCP capability negotiation.
let serverVersion = '0.0.0';
try {
  const pkg = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8'));
  serverVersion = pkg.version;
} catch (error) {
  console.error('Warning: Could not read package.json version:', error.message);
}

const server = new McpServer({
  name: '@metalsmith/mcp-server',
  version: serverVersion
});

// Default check set for the `validate` tool. Kept here so the dispatcher
// in src/tools/validate-plugin.js doesn't have to repeat it.
const DEFAULT_VALIDATE_CHECKS = [
  'structure',
  'tests',
  'docs',
  'package-json',
  'release-notes',
  'jsdoc',
  'performance',
  'security',
  'metalsmith-patterns',
  'marketing-language',
  'module-consistency',
  'hardcoded-values',
  'performance-patterns',
  'i18n-readiness',
  'theory-doc'
];

const VALIDATE_CHECK_NAMES = [
  'structure',
  'tests',
  'docs',
  'package-json',
  'release-notes',
  'biome',
  'coverage',
  'jsdoc',
  'performance',
  'security',
  'integration',
  'metalsmith-patterns',
  'marketing-language',
  'module-consistency',
  'hardcoded-values',
  'performance-patterns',
  'i18n-readiness',
  'theory-doc'
];

server.registerTool(
  'plugin-scaffold',
  {
    description:
      "Scaffold a complete Metalsmith plugin (src/, test/, package.json, README.md, CLAUDE.md, GitHub workflows). Use only for NEW plugins in an empty directory — never against an existing project. Pass the user's exact plugin name (do not add a `metalsmith-` prefix); both name and description are required.",
    inputSchema: {
      name: z.string().describe('Plugin name (use EXACT name provided by user; do not add metalsmith- prefix)'),
      description: z.string().describe('What the plugin does (ask the user if not provided)'),
      features: z
        .array(z.enum(['async-processing', 'background-processing', 'metadata-generation']))
        .default(['async-processing'])
        .describe(
          'Optional features:\n- async-processing: batch processing and async capabilities\n- background-processing: worker thread support\n- metadata-generation: metadata extraction and generation'
        ),
      outputPath: z.string().default('.').describe('Path where the plugin will be created'),
      license: z
        .enum(['MIT', 'Apache-2.0', 'ISC', 'BSD-3-Clause', 'UNLICENSED'])
        .default('MIT')
        .describe('License for the plugin (UNLICENSED for proprietary)')
    }
  },
  (args) => pluginScaffoldTool(args)
);

server.registerTool(
  'validate',
  {
    description: 'Check an existing Metalsmith plugin against quality standards.',
    inputSchema: {
      path: z.string().describe('Path to the plugin directory'),
      checks: z
        .array(z.enum(VALIDATE_CHECK_NAMES))
        .default(DEFAULT_VALIDATE_CHECKS)
        .describe('Specific checks to perform. Use metalsmith-patterns for plugin-specific validations.'),
      functional: z
        .boolean()
        .default(false)
        .describe('Run functional checks (executes test/coverage commands rather than just inspecting config).')
    }
  },
  (args) => validatePluginTool(args)
);

server.registerTool(
  'configs',
  {
    description: 'Generate configuration files following enhanced standards.',
    inputSchema: {
      outputPath: z.string().default('.').describe('Path where configs will be created'),
      configs: z
        .array(z.enum(['biome', 'editorconfig', 'gitignore', 'release-it']))
        .default(['biome', 'editorconfig', 'gitignore'])
        .describe('Configuration files to generate')
    }
  },
  (args) => generateConfigsTool(args)
);

server.registerTool(
  'show-template',
  {
    description: 'Display a recommended configuration template for Metalsmith plugins.',
    inputSchema: {
      template: z
        .enum(['release-it', 'package-scripts', 'biome', 'gitignore', 'editorconfig'])
        .describe('Template to display')
    }
  },
  (args) => showTemplateTool(args)
);

server.registerTool(
  'list-templates',
  {
    description:
      'List every template the server can hand back via get-template. Call this before guessing a template name.'
  },
  () => listTemplatesTool()
);

server.registerTool(
  'get-template',
  {
    description:
      'Retrieve the exact content of a specific template file. Run list-templates first to see available names. Use these templates verbatim instead of improvising.',
    inputSchema: {
      template: z.string().describe('Template name (e.g. "plugin/CLAUDE.md", "configs/release-it.json")')
    }
  },
  (args) => getTemplateTool(args)
);

server.registerTool(
  'install-claude-md',
  {
    description:
      'Install a CLAUDE.md in an existing Metalsmith plugin. Smart-merges the MCP Server Integration section into any existing CLAUDE.md so user customizations survive.',
    inputSchema: {
      path: z.string().default('.').describe('Directory path where CLAUDE.md should be created'),
      replace: z.boolean().default(false).describe('Replace existing CLAUDE.md completely (default: smart merge)'),
      dryRun: z.boolean().default(false).describe('Preview the merge without writing')
    }
  },
  (args) => installClaudeMdTool(args)
);

server.registerTool(
  'diff-template',
  {
    description:
      'Diff a plugin against the current scaffold templates. Reports which files match, are missing, or have drifted (with unified diff snippets). Use to keep aging plugins in sync with the latest scaffold.',
    inputSchema: {
      path: z.string().default('.').describe('Plugin directory path'),
      templates: z
        .array(z.string())
        .optional()
        .describe(
          'Optional filter — restrict the diff to specific templates by template path (e.g. "plugin/package.json.template") or target path (e.g. ".github/workflows/test.yml"). Omit to diff every tracked template.'
        )
    }
  },
  (args) => diffTemplateTool(args)
);

server.registerTool(
  'update-deps',
  {
    description: 'Update dependencies in Metalsmith plugin(s) using npm-check-updates.',
    inputSchema: {
      path: z.string().default('.').describe('Plugin directory or parent containing plugins'),
      major: z.boolean().default(false).describe('Include major version updates (default: minor/patch only)'),
      interactive: z.boolean().default(false).describe('Run in interactive mode'),
      dryRun: z.boolean().default(false).describe('Show what would be updated without making changes')
    }
  },
  (args) => updateDepsTool(args)
);

server.registerTool(
  'audit-plugin',
  {
    description: 'Run a comprehensive plugin audit (validation + lint + tests + coverage) and return a health report.',
    inputSchema: {
      path: z.string().default('.').describe('Plugin directory path'),
      fix: z.boolean().default(false).describe('Apply automatic fixes where possible'),
      output: z.enum(['console', 'markdown', 'json']).default('console').describe('Output format for the audit report')
    }
  },
  async (args) => {
    // auditPlugin returns a raw string; wrap in the MCP CallToolResult shape.
    const text = await auditPlugin(args);
    return { content: [{ type: 'text', text }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Metalsmith MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
