#!/usr/bin/env node

/**
 * Metalsmith MCP Server
 *
 * This is a Model Context Protocol (MCP) server that provides tools for
 * scaffolding and validating Metalsmith plugins with enhanced standards.
 *
 * MCP is a protocol that allows AI assistants like Claude to interact with
 * external tools and data sources. This server exposes four main tools:
 * 1. plugin-scaffold: Generate complete plugin structures
 * 2. validate-plugin: Check plugins against quality standards
 * 3. generate-configs: Create configuration files
 * 4. update-deps: Update dependencies using npm-check-updates
 *
 * The server communicates via stdio (standard input/output) which allows
 * Claude to call our tools and receive structured responses.
 */

// Import MCP SDK components
import { Server } from '@modelcontextprotocol/sdk/server/index.js'; // Main MCP server class
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'; // Transport for stdio communication
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'; // Request type schemas

// Import our custom tool implementations
import { pluginScaffoldTool } from './tools/plugin-scaffold.js';
import { validatePluginTool } from './tools/validate-plugin.js';
import { generateConfigsTool } from './tools/generate-configs.js';
import { updateDepsTool } from './tools/update-deps.js';

// Import AI assistant instructions
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load AI assistant instructions
let aiInstructions = '';
try {
  aiInstructions = await fs.readFile(path.join(__dirname, 'instructions.md'), 'utf8');
} catch (error) {
  console.error('Warning: Could not load AI instructions:', error.message);
}

/**
 * Create the MCP server instance
 *
 * The Server constructor takes two parameters:
 * 1. Server info: Basic metadata about our server
 * 2. Capabilities: What features our server supports
 *
 * For this server, we only need the 'tools' capability since we're
 * providing tools for Claude to use, not resources or prompts.
 */
const server = new Server(
  {
    name: '@metalsmith/mcp-server', // Server identifier
    version: '0.1.0' // Server version
  },
  {
    capabilities: {
      tools: {} // We provide tools (empty object means default tool capabilities)
    }
  }
);

/**
 * Tool definitions
 *
 * In MCP, tools are functions that Claude can call to perform specific tasks.
 * Each tool needs:
 * - name: A unique identifier for the tool
 * - description: What the tool does (Claude uses this to decide when to call it)
 * - inputSchema: JSON Schema defining the expected parameters
 *
 * These definitions tell Claude what tools are available and how to use them.
 * The actual implementation is in separate files for better organization.
 */
const TOOLS = [
  {
    name: 'plugin-scaffold',
    description: `Generate a complete Metalsmith plugin structure with enhanced standards.

IMPORTANT INSTRUCTIONS FOR AI ASSISTANTS:
1. ALWAYS use the EXACT plugin name provided by the user - do NOT add 'metalsmith-' prefix automatically
2. ALWAYS ask the user what the plugin should do - description is REQUIRED
3. The plugin will be created at outputPath/name/ (not nested further)
4. Pay attention to path information in the response for follow-up operations

${aiInstructions ? `\n${aiInstructions}` : ''}`,
    inputSchema: {
      type: 'object', // The input must be an object (not string, array, etc.)
      properties: {
        name: {
          type: 'string',
          description: 'Plugin name (use EXACT name provided by user, do not add metalsmith- prefix)'
        },
        description: {
          type: 'string',
          description: 'REQUIRED: What the plugin does (ask the user if not provided)'
        },
        features: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['async-processing', 'background-processing', 'metadata-generation']
          },
          description:
            'Additional features to include:\n- async-processing: Adds batch processing and async capabilities\n- background-processing: Adds worker thread support for concurrent processing\n- metadata-generation: Adds metadata extraction and generation features',
          default: ['async-processing']
        },
        outputPath: {
          type: 'string',
          description: 'Path where the plugin will be created',
          default: '.' // Current directory if not specified
        },
        license: {
          type: 'string',
          enum: ['MIT', 'Apache-2.0', 'ISC', 'BSD-3-Clause', 'UNLICENSED'],
          description:
            'License for the plugin (choose appropriate license for your project, UNLICENSED for proprietary)',
          default: 'MIT'
        }
      },
      required: ['name', 'description'] // Both name and description are required
    }
  },
  {
    name: 'validate-plugin',
    description: 'Check an existing Metalsmith plugin against quality standards with build-time focused validations',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the plugin directory'
        },
        checks: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'structure',
              'tests',
              'docs',
              'package-json',
              'eslint',
              'coverage',
              'jsdoc',
              'performance',
              'security',
              'integration',
              'metalsmith-patterns'
            ]
          },
          description: 'Specific checks to perform. Use metalsmith-patterns for plugin-specific validations',
          default: [
            'structure',
            'tests',
            'docs',
            'package-json',
            'jsdoc',
            'performance',
            'security',
            'metalsmith-patterns'
          ]
        }
      },
      required: ['path']
    }
  },
  {
    name: 'generate-configs',
    description: 'Generate configuration files following enhanced standards',
    inputSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Path where configs will be created',
          default: '.'
        },
        configs: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['eslint', 'prettier', 'editorconfig', 'gitignore', 'release-it']
          },
          description: 'Configuration files to generate',
          default: ['eslint', 'prettier', 'editorconfig', 'gitignore']
        }
      },
      required: []
    }
  },
  {
    name: 'update-deps',
    description: 'Update dependencies in Metalsmith plugin(s) using npm-check-updates',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Plugin directory path or parent directory containing plugins',
          default: '.'
        },
        major: {
          type: 'boolean',
          description: 'Include major version updates (default: false - only minor/patch)',
          default: false
        },
        interactive: {
          type: 'boolean',
          description: 'Run in interactive mode',
          default: false
        },
        dryRun: {
          type: 'boolean',
          description: 'Show what would be updated without making changes',
          default: false
        }
      },
      required: []
    }
  }
];

/**
 * Handle list tools request
 *
 * When Claude connects to our server, it will ask "what tools do you have?"
 * This handler responds with our TOOLS array, telling Claude what's available.
 *
 * ListToolsRequestSchema is a predefined schema from the MCP SDK that
 * validates the incoming request format.
 */
server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: TOOLS // Send back our tool definitions
}));

/**
 * Handle tool execution
 *
 * When Claude wants to use one of our tools, it sends a CallToolRequest.
 * This handler:
 * 1. Extracts the tool name and arguments from the request
 * 2. Routes to the appropriate tool implementation
 * 3. Returns the result or an error response
 *
 * The response format is standardized:
 * - content: Array of content blocks (text, images, etc.)
 * - isError: Boolean indicating if this is an error response
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Extract tool name and arguments from the request
  // Note: 'arguments' is a reserved word, so we destructure it as 'args'
  const { name, arguments: args } = request.params;

  try {
    // Route to the appropriate tool implementation based on the tool name
    switch (name) {
      case 'plugin-scaffold':
        return await pluginScaffoldTool(args); // Generate new plugin

      case 'validate-plugin':
        return await validatePluginTool(args); // Check existing plugin

      case 'generate-configs':
        return await generateConfigsTool(args); // Create config files

      case 'update-deps':
        return await updateDepsTool(args); // Update plugin dependencies

      default:
        // This shouldn't happen if Claude only calls tools we advertised
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // If any tool throws an error, we catch it and return a standardized error response
    return {
      content: [
        {
          type: 'text', // Content type (could also be 'image', etc.)
          text: `Error executing tool ${name}: ${error.message}`
        }
      ],
      isError: true // Tell Claude this is an error, not normal output
    };
  }
});

/**
 * Start the server
 *
 * This function initializes the MCP server and starts listening for requests.
 * The communication happens over stdio (standard input/output):
 * - stdin: Receives requests from Claude
 * - stdout: Sends responses back to Claude
 * - stderr: Used for our own logging (doesn't interfere with the protocol)
 */
async function main() {
  // Create a transport that communicates via stdio
  // This is the most common transport for MCP servers
  const transport = new StdioServerTransport();

  // Connect our server to the transport
  // After this, the server is ready to receive requests from Claude
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with the MCP protocol messages
  // Claude reads from stdout, so we must never write non-protocol data there
  console.error('Metalsmith MCP Server started');
}

// Start the server and handle any startup errors
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1); // Exit with error code if startup fails
});
