import { promises as fs } from 'node:fs';
import path from 'node:path';
import { glob } from 'node:fs/promises';
import { resolveScriptContent } from '../utils.js';

export async function checkCoverage(pluginPath, results, _functional = false, config) {
  try {
    const isNewPlugin = !(await fs
      .access(path.join(pluginPath, 'node_modules'))
      .then(() => true)
      .catch(() => false));

    const coverageFiles = await Array.fromAsync(glob('coverage/**/*', { cwd: pluginPath }));

    if (coverageFiles.length > 0) {
      results.passed.push('✓ Coverage reports found');

      try {
        const summaryPath = path.join(pluginPath, 'coverage/coverage-summary.json');
        const summary = JSON.parse(await fs.readFile(summaryPath, 'utf-8'));
        const total = summary.total;

        if (total) {
          const coverage = total.lines.pct;
          const threshold = config?.rules?.tests?.coverageThreshold || 80;

          if (coverage >= 90) {
            results.passed.push(`✓ Excellent test coverage: ${coverage}%`);
          } else if (coverage >= threshold) {
            results.passed.push(`✓ Good test coverage: ${coverage}%`);
          } else {
            results.warnings.push(`⚠ Low test coverage: ${coverage}% (threshold: ${threshold}%)`);
          }
        }
      } catch {
        // no summary file
      }
    } else {
      if (isNewPlugin) {
        results.passed.push("ℹ Coverage reports will be generated after running 'npm run test:coverage'");
      } else {
        results.recommendations.push("💡 No coverage reports found - run 'npm run test:coverage' to generate");
      }
    }

    const [hasC8, hasNyc, hasNycJson] = await Promise.all([
      fs
        .access(path.join(pluginPath, '.c8rc.json'))
        .then(() => true)
        .catch(() => false),
      fs
        .access(path.join(pluginPath, '.nycrc'))
        .then(() => true)
        .catch(() => false),
      fs
        .access(path.join(pluginPath, '.nycrc.json'))
        .then(() => true)
        .catch(() => false)
    ]);

    try {
      const pkg = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));
      const coverageScript = pkg.scripts?.coverage || pkg.scripts?.['test:coverage'] || '';
      const coverageScriptContent = await resolveScriptContent(pluginPath, coverageScript);
      const usesNativeCoverage = coverageScriptContent.includes('--experimental-test-coverage');
      const wrapsUnknownShellScript = coverageScript && coverageScriptContent === coverageScript;

      if (usesNativeCoverage) {
        results.passed.push('✓ Using native node:test coverage (no config file needed)');
      } else if (hasC8 || hasNyc || hasNycJson) {
        results.recommendations.push(
          '💡 Legacy coverage tool detected (c8/nyc). Consider migrating to native `node --test --experimental-test-coverage` (Node >= 22).'
        );
      } else if (coverageScript && !wrapsUnknownShellScript) {
        results.recommendations.push(
          '💡 Consider using native coverage: mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=lcov --test-reporter-destination=coverage/lcov.info'
        );
      }
    } catch {
      // package.json read failure already reported elsewhere
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check coverage: ${error.message}`);
  }
}
