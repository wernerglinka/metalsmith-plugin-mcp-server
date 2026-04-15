#!/usr/bin/env node

/**
 * Lint, format, add, commit with message prompt, and push
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'inherit' });
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

function promptCommitMessage() {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Enter commit message: ', (message) => {
      rl.close();
      resolve(message.trim());
    });
  });
}

async function main() {
  try {
    console.log('🎨 Formatting and linting code...');
    await runCommand('npm', ['run', 'lint']);

    console.log('📝 Adding changes (including formatted files)...');
    await runCommand('git', ['add', '.']);

    const message = await promptCommitMessage();
    if (!message) {
      console.log('❌ No commit message provided. Aborting.');
      process.exit(1);
    }

    console.log('💾 Committing changes...');
    await runCommand('git', ['commit', '-m', message]);

    console.log('🚀 Pushing to remote...');
    await runCommand('git', ['push']);

    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
