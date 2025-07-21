#!/usr/bin/env node

/**
 * Setup git hooks for automatic formatting and linting
 */

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const preCommitHook = `#!/bin/sh

# Pre-commit hook to format and lint code before committing

echo "🎨 Running Prettier formatting..."
npm run format

echo "🔍 Running ESLint..."
npm run lint

# Re-add any files that were formatted
git add .

echo "✅ Pre-commit checks passed!"
`;

try {
  const hookPath = join('.git', 'hooks', 'pre-commit');
  writeFileSync(hookPath, preCommitHook);
  execSync(`chmod +x ${hookPath}`);
  console.log('✅ Pre-commit hook installed successfully!');
  console.log('   Code will now be automatically formatted and linted before each commit.');
} catch (error) {
  console.error('❌ Error installing pre-commit hook:', error.message);
  process.exit(1);
}
