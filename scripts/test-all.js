#!/usr/bin/env node

/**
 * Run all MCP server tests
 * This script tests all four tools in sequence
 */

import { spawn } from 'child_process';

async function runTest(testName, scriptPath) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🧪 Running ${testName} test`);
  console.log(`${'='.repeat(50)}\n`);

  return new Promise((resolve) => {
    const test = spawn('node', [scriptPath], {
      stdio: 'inherit'
    });

    test.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${testName} test passed`);
      } else {
        console.log(`\n❌ ${testName} test failed with code ${code}`);
      }
      resolve(code);
    });
  });
}

async function main() {
  console.log('🚀 Running all MCP server tests...');

  const tests = [
    ['Plugin Scaffold', 'scripts/test-scaffold.js'],
    ['Plugin Validation', 'scripts/test-validate.js'],
    ['Config Generation', 'scripts/test-configs.js']
  ];

  let allPassed = true;

  for (const [testName, scriptPath] of tests) {
    const code = await runTest(testName, scriptPath);
    if (code !== 0) {
      allPassed = false;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  if (allPassed) {
    console.log('🎉 All tests passed! The MCP server is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the output above for details.');
  }
  console.log(`${'='.repeat(50)}\n`);

  process.exit(allPassed ? 0 : 1);
}

main();
