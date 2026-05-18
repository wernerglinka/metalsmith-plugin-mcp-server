import { promises as fs } from 'node:fs';
import path from 'node:path';
import { glob } from 'node:fs/promises';

const UTILITY_PATTERNS = [
  { pattern: /function\s+get\s*\(/, name: 'get' },
  { pattern: /function\s+pick\s*\(/, name: 'pick' },
  { pattern: /function\s+identity\s*\(/, name: 'identity' },
  { pattern: /const\s+get\s*=/, name: 'get' },
  { pattern: /const\s+pick\s*=/, name: 'pick' },
  { pattern: /const\s+identity\s*=/, name: 'identity' }
];

export async function checkPerformancePatterns(pluginPath, results) {
  try {
    const jsFiles = await Array.fromAsync(glob('src/**/*.js', { cwd: pluginPath }));

    for (const file of jsFiles) {
      try {
        const content = await fs.readFile(path.join(pluginPath, file), 'utf-8');

        const functionPattern = /function\s+\w+\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
        let match;
        while ((match = functionPattern.exec(content)) !== null) {
          const functionBody = match[1];
          if (/const\s+\w*(?:Map|Dict|Config|Options)\s*=\s*\{/.test(functionBody)) {
            results.warnings.push(
              `⚠ Object defined inside function in ${file} - move to module level for better performance`
            );
            results.recommendations.push(
              '💡 Move constant objects (typeMap, configMap, etc.) to module level to avoid recreation'
            );
          }
        }

        const foundUtils = [];
        for (const util of UTILITY_PATTERNS) {
          if (util.pattern.test(content) && !foundUtils.includes(util.name)) {
            foundUtils.push(util.name);
          }
        }

        if (foundUtils.length > 0) {
          results.warnings.push(
            `⚠ Custom utility functions (${foundUtils.join(', ')}) in ${file} - consider using established library like lodash`
          );
          results.recommendations.push('💡 Replace custom utilities with lodash or remove if only used once');
        }

        if (/\+\s*['"`].*\n.*\+\s*['"`]/.test(content)) {
          results.recommendations.push(
            `💡 String concatenation detected in ${file} - consider template literals for better readability`
          );
        }
      } catch {
        // skip unreadable files
      }
    }

    if (results.warnings.length === 0) {
      results.passed.push('✓ No obvious performance anti-patterns detected');
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check performance patterns: ${error.message}`);
  }
}
