#!/usr/bin/env node

/**
 * Example: Scaffold a new Metalsmith plugin
 *
 * This demonstrates how to use the MCP server to create a new plugin
 * with all the enhanced standards and best practices.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function main() {
  // Start the MCP server
  const serverProcess = spawn('node', ['../src/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const transport = new StdioClientTransport({
    child: serverProcess,
  });

  const client = new Client(
    {
      name: 'example-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    },
  );

  await client.connect(transport);

  console.log('🚀 Scaffolding a new Metalsmith plugin...\n');

  try {
    // Scaffold a new content processor plugin
    const result = await client.callTool({
      name: 'plugin-scaffold',
      arguments: {
        name: 'metalsmith-content-processor',
        type: 'processor',
        features: ['async-processing', 'background-processing'],
        outputPath: './output',
      },
    });

    console.log(result.content[0].text);

    // Now validate the created plugin
    console.log('\n🔍 Validating the created plugin...\n');

    const validationResult = await client.callTool({
      name: 'validate-plugin',
      arguments: {
        path: './output/metalsmith-content-processor',
        checks: ['structure', 'tests', 'docs', 'package-json'],
      },
    });

    console.log(validationResult.content[0].text);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

main().catch(console.error);
