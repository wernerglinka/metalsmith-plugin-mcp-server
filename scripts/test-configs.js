#!/usr/bin/env node

/**
 * Test script for the configs tool
 * This generates configuration files and shows the results
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'configs',
    arguments: {
      outputPath: './test-configs',
      configs: ['eslint', 'prettier', 'gitignore']
    }
  }
};

console.log('⚙️  Testing configs tool...\n');

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

      // Check if config files were actually created
      const configPath = './test-configs';
      try {
        const files = await fs.readdir(configPath);
        console.log('\n📄 Configuration files created:');

        for (const file of files) {
          const filePath = path.join(configPath, file);
          const stats = await fs.stat(filePath);
          console.log(`  - ${file} (${stats.size} bytes)`);

          // Show a preview of the file content
          if (stats.size < 500) {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`    Preview: ${content.slice(0, 100)}...`);
          }
        }
      } catch {
        console.log('\n❌ Config directory was not created');
      }
    }
  } catch (err) {
    console.error('❌ Failed to parse response:', err);
    console.log('Raw output:', output);
  }

  process.exit(code);
});
