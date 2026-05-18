import { promises as fs } from 'node:fs';
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { runCommand } from '../utils.js';

export async function checkTests(pluginPath, results, functional = false) {
  try {
    const testPatterns = [
      'test/**/*.test.js',
      'test/**/*.test.cjs',
      'test/**/*.test.mjs',
      'test/**/index.js',
      'test/**/index.cjs',
      'test/**/index.mjs',
      'test/**/*.spec.js',
      'test/**/*.spec.cjs',
      'test/**/*.spec.mjs'
    ];

    let allTestFiles = [];
    for (const pattern of testPatterns) {
      for await (const file of glob(pattern, { cwd: pluginPath })) {
        allTestFiles.push(file);
      }
    }
    allTestFiles = [...new Set(allTestFiles)];

    if (allTestFiles.length > 0) {
      results.passed.push(`✓ Found ${allTestFiles.length} test file(s)`);
    } else {
      results.failed.push('✗ No test files found');
    }

    const fixtureFiles = await Array.fromAsync(glob('test/fixtures/**/*', { cwd: pluginPath }));
    if (fixtureFiles.length > 0) {
      results.passed.push(`✓ Test fixtures present (${fixtureFiles.length} files)`);
    } else {
      results.recommendations.push(
        `💡 Consider adding test fixtures. Run: npx metalsmith-plugin-mcp-server scaffold ${
          pluginPath
        } test/fixtures/basic/sample.md basic`
      );
    }

    const packageJson = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));

    if (packageJson.scripts?.test) {
      if (functional) {
        const testResult = await runCommand('npm', ['test'], pluginPath);
        if (testResult.success) {
          results.passed.push(`✓ Tests run successfully (${testResult.summary})`);
        } else {
          results.failed.push(`✗ Tests failed: ${testResult.error}`);
        }
      } else {
        results.passed.push('✓ Test script defined in package.json');
      }
    } else {
      results.failed.push('✗ No test script in package.json');
    }

    if (packageJson.scripts?.['test:coverage'] || packageJson.scripts?.coverage) {
      if (functional) {
        const coverageResult = await runCommand(
          'npm',
          ['run', packageJson.scripts?.['test:coverage'] ? 'test:coverage' : 'coverage'],
          pluginPath
        );
        if (coverageResult.success) {
          const output = `${coverageResult.output}\n${coverageResult.stderr}`;
          let percentage = 'unknown';

          const patterns = [
            /Lines\s*\|\s*(\d+(?:\.\d+)?)\s*\|/i,
            /Lines\s*:\s*(\d+(?:\.\d+)?)%/i,
            /(\d+(?:\.\d+)?)%\s+lines/i,
            /All files\s*\|[^|]*\|[^|]*\|[^|]*\|\s*(\d+(?:\.\d+)?)\s*\|/i
          ];
          for (const pattern of patterns) {
            const match = output.match(pattern);
            if (match) {
              percentage = match[1];
              break;
            }
          }

          results.passed.push(`✓ Coverage generated successfully (${percentage}% lines covered)`);
        } else {
          results.failed.push(`✗ Coverage generation failed: ${coverageResult.error}`);
        }
      } else {
        results.passed.push('✓ Coverage script defined');
      }
    } else {
      results.recommendations.push('💡 Consider adding a coverage script (e.g., test:coverage) to track code coverage');
    }
  } catch (error) {
    results.failed.push(`✗ Error checking tests: ${error.message}`);
  }
}
