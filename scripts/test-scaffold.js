#!/usr/bin/env node

/**
 * Test script for the plugin-scaffold tool
 * This creates a test plugin and shows the output
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'plugin-scaffold',
    arguments: {
      name: 'metalsmith-test-plugin',
      type: 'processor',
      features: [], // No features to avoid missing template files
      outputPath: './test-output'
    }
  }
};

console.log('🚀 Testing plugin-scaffold tool...\n');

const server = spawn('node', ['src/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send the request
server.stdin.write(`${JSON.stringify(testRequest)}\n`);
server.stdin.end();

// Collect response
let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  console.error('Server log:', data.toString());
});

server.on('close', async (code) => {
  try {
    const response = JSON.parse(output);

    if (response.error) {
      console.error('❌ Error:', response.error);
    } else {
      console.log('✅ Success!');
      console.log(response.result.content[0].text);

      // Check if files were actually created
      const pluginPath = './test-output/metalsmith-test-plugin';
      try {
        const stats = await fs.stat(pluginPath);
        if (stats.isDirectory()) {
          console.log('\n📁 Plugin directory created successfully!');

          // List created files
          const files = await fs.readdir(pluginPath, { recursive: true });
          console.log('\nCreated files:');
          files.forEach((file) => console.log(`  - ${file}`));
        }
      } catch {
        console.log('\n❌ Plugin directory was not created');
      }
    }
  } catch (err) {
    console.error('❌ Failed to parse response:', err);
    console.log('Raw output:', output);
  }

  process.exit(code);
});
