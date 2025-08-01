#!/usr/bin/env node

/**
 * Test script for the validate tool
 * This creates a simple plugin structure and validates it
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

async function createTestPlugin() {
  const pluginDir = './test-validation-plugin';

  // Create directory structure
  await fs.mkdir(path.join(pluginDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(pluginDir, 'test'), { recursive: true });

  // Create package.json
  const packageJson = {
    name: 'metalsmith-test-validation',
    version: '1.0.0',
    description: 'A test plugin for validation',
    main: 'src/index.js',
    license: 'MIT',
    scripts: {
      test: 'mocha test'
    },
    repository: {
      type: 'git',
      url: 'https://github.com/test/metalsmith-test-validation'
    },
    keywords: ['metalsmith', 'plugin']
  };

  await fs.writeFile(path.join(pluginDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Create src/index.js
  await fs.writeFile(
    path.join(pluginDir, 'src/index.js'),
    `export default function testPlugin(options = {}) {
  return function (files, metalsmith, done) {
    // Process files here
    done();
  };
}`
  );

  // Create README.md
  await fs.writeFile(
    path.join(pluginDir, 'README.md'),
    `# metalsmith-test-validation

> A test plugin for validation

## Installation

\`\`\`bash
npm install metalsmith-test-validation
\`\`\`

## Usage

\`\`\`js
import testPlugin from 'metalsmith-test-validation';

metalsmith.use(testPlugin());
\`\`\`

## Options

No options yet.

## Examples

Basic usage example.
`
  );

  // Create a test file
  await fs.writeFile(
    path.join(pluginDir, 'test/index.test.js'),
    `import { expect } from 'chai';
import testPlugin from '../src/index.js';

describe('testPlugin', () => {
  it('should export a function', () => {
    expect(testPlugin).to.be.a('function');
  });
});`
  );

  console.log('📝 Created test plugin structure for validation');
}

async function validatePlugin() {
  const testRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'validate',
      arguments: {
        path: './test-validation-plugin',
        checks: ['structure', 'tests', 'docs', 'package-json']
      }
    }
  };

  console.log('🔍 Testing validate tool...\n');

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

  return new Promise((resolve) => {
    server.on('close', (code) => {
      try {
        const response = JSON.parse(output);

        if (response.error) {
          console.error('❌ Error:', response.error);
        } else {
          console.log('✅ Validation complete!');
          console.log(response.result.content[0].text);
        }
      } catch (err) {
        console.error('❌ Failed to parse response:', err);
        console.log('Raw output:', output);
      }

      resolve(code);
    });
  });
}

async function main() {
  try {
    await createTestPlugin();
    await validatePlugin();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
