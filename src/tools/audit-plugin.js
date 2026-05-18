/**
 * audit-plugin.js
 *
 * Comprehensive plugin audit tool that runs validation, linting, formatting,
 * tests, and coverage checks in a single command.
 */

import { resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { validatePluginTool } from './validate-plugin.js';
import { sanitizePath } from '../utils/path-security.js';

/**
 * Run a command and capture output
 * @param {string} command - Command to run
 * @param {string} cwd - Working directory
 * @returns {Object} Result with stdout, stderr, and success status
 */
function runCommand(command, cwd) {
  try {
    const result = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { stdout: result, stderr: '', success: true };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      success: false
    };
  }
}

/**
 * Check if a npm script exists
 * @param {string} scriptName - Script name to check
 * @param {string} pluginPath - Plugin directory path
 * @returns {boolean} True if script exists
 */
function hasScript(scriptName, pluginPath) {
  const packagePath = resolve(pluginPath, 'package.json');
  if (!existsSync(packagePath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return !!(packageJson.scripts && packageJson.scripts[scriptName]);
  } catch {
    return false;
  }
}

/**
 * Extract validation score from output
 * @param {string} output - Validation output
 * @returns {number|null} Quality score percentage
 */
function extractValidationScore(output) {
  // Look for quality score patterns in validation output
  const patterns = [/Quality score: (\d+)%/, /Score: (\d+)%/, /Overall: (\d+)%/, /✓ Passed: (\d+)% score/];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Extract test results from runner output. Handles both the native
 * node:test spec reporter (`# pass 163`, `# fail 0`, `# tests 163`) and
 * older mocha-style output (`163 passing`, `0 failing`).
 *
 * @param {string} output - Test output
 * @returns {{passing: number, failing: number, total: number}}
 */
function extractTestStats(output) {
  const stats = { passing: 0, failing: 0, total: 0 };

  // node:test spec reporter — anchored to line starts so we don't grab
  // numbers from unrelated output. The leading `#` is optional because
  // node strips it when piping through some shells.
  const nodePass = output.match(/^#?\s*pass\s+(\d+)\s*$/m);
  const nodeFail = output.match(/^#?\s*fail\s+(\d+)\s*$/m);
  const nodeTotal = output.match(/^#?\s*tests\s+(\d+)\s*$/m);

  if (nodePass) {
    stats.passing = parseInt(nodePass[1], 10);
  }
  if (nodeFail) {
    stats.failing = parseInt(nodeFail[1], 10);
  }
  if (nodeTotal) {
    stats.total = parseInt(nodeTotal[1], 10);
  }

  // Mocha-style fallback if node:test didn't match.
  if (stats.passing === 0 && stats.failing === 0 && stats.total === 0) {
    const mochaPass = output.match(/(\d+)\s+passing/);
    const mochaFail = output.match(/(\d+)\s+failing/);
    if (mochaPass) {
      stats.passing = parseInt(mochaPass[1], 10);
    }
    if (mochaFail) {
      stats.failing = parseInt(mochaFail[1], 10);
    }
  }

  // Derive total when only pass/fail are available.
  if (stats.total === 0 && (stats.passing > 0 || stats.failing > 0)) {
    stats.total = stats.passing + stats.failing;
  }
  // Or pass count when only total is present.
  if (stats.total > 0 && stats.passing === 0 && stats.failing === 0) {
    stats.passing = stats.total;
  }

  return stats;
}

/**
 * Read line coverage from a plugin's coverage/lcov.info file, if present.
 * The scaffold's coverage script writes lcov via
 * `--test-reporter=lcov --test-reporter-destination=coverage/lcov.info`,
 * so the file is the authoritative source — avoids fragile regex parsing
 * of the spec reporter's freeform table.
 *
 * Returns null when no lcov file exists or it has no executable lines.
 *
 * @param {string} pluginPath - Plugin directory
 * @returns {number|null} Line coverage percentage (0–100)
 */
function readLcovCoverage(pluginPath) {
  const lcovPath = resolve(pluginPath, 'coverage/lcov.info');
  if (!existsSync(lcovPath)) {
    return null;
  }
  try {
    const content = readFileSync(lcovPath, 'utf8');
    let totalLines = 0;
    let hitLines = 0;
    for (const line of content.split('\n')) {
      if (line.startsWith('LF:')) {
        totalLines += parseInt(line.slice(3), 10) || 0;
      } else if (line.startsWith('LH:')) {
        hitLines += parseInt(line.slice(3), 10) || 0;
      }
    }
    if (totalLines === 0) {
      return null;
    }
    return Math.round((hitLines / totalLines) * 10000) / 100;
  } catch {
    return null;
  }
}

/**
 * Extract coverage percentage from runner output. Used as a fallback
 * when no lcov file is available (e.g. plugins on a non-standard
 * coverage setup).
 *
 * @param {string} output - Coverage tool output
 * @returns {number|null} Coverage percentage
 */
function extractCoverage(output) {
  const patterns = [
    /All files[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+\.?\d*)/, // Istanbul table
    /Coverage[:\s]+(\d+\.?\d*)%/i,
    /Statements\s*:[^\d]*(\d+\.?\d*)%/,
    /Lines\s*:[^\d]*(\d+\.?\d*)%/,
    /Functions\s*:[^\d]*(\d+\.?\d*)%/,
    /Branches\s*:[^\d]*(\d+\.?\d*)%/,
    /Total Coverage:\s*(\d+\.?\d*)%/i
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

/**
 * Run plugin audit
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Plugin directory path
 * @param {boolean} args.fix - Apply automatic fixes
 * @param {string} args.output - Output format
 * @returns {Promise<string>} Audit report
 */
export async function auditPlugin(args) {
  const pluginPath = sanitizePath(args.path || '.', process.cwd());
  const pluginName = basename(pluginPath);
  const results = {
    validation: { score: null, passed: false },
    linting: { passed: false, fixed: false },
    formatting: { passed: false, fixed: false },
    tests: { passed: false, stats: {} },
    coverage: { percentage: null, passed: false }
  };

  // Progress output goes to stderr so it doesn't corrupt MCP stdio when this
  // tool is invoked over the protocol; CLI users still see it on the terminal.
  console.error(chalk.blue(`\n🔍 Running plugin audit for ${chalk.bold(pluginName)}...\n`));

  // 1. Run validation
  const validationSpinner = ora('Running validation...').start();
  try {
    const validationResult = await validatePluginTool({ path: pluginPath });
    const validationText = validationResult.content[0].text;

    results.validation.score = extractValidationScore(validationText);
    results.validation.passed = results.validation.score >= 70;

    if (results.validation.score !== null) {
      validationSpinner.succeed(`Validation: ${results.validation.score}%`);
    } else {
      validationSpinner.warn('Validation: No score found');
    }
  } catch {
    // Validation failed
    validationSpinner.fail('Validation failed');
  }

  // 2. Run linting
  if (hasScript('lint', pluginPath)) {
    const lintSpinner = ora('Running linter...').start();
    const lintCommand = args.fix ? 'npm run lint:fix' : 'npm run lint';
    const { success, stdout } = runCommand(lintCommand, pluginPath);

    results.linting.passed = success;
    results.linting.fixed = args.fix && stdout.includes('fixed');

    if (success) {
      lintSpinner.succeed(results.linting.fixed ? 'Linting: Fixed issues' : 'Linting: Passed');
    } else {
      lintSpinner.fail('Linting: Issues found');
    }
  }

  // 3. Check formatting
  if (hasScript('format:check', pluginPath) || hasScript('format', pluginPath)) {
    const formatSpinner = ora('Checking formatting...').start();
    const formatCommand = args.fix ? 'npm run format' : 'npm run format:check';
    const { success } = runCommand(formatCommand, pluginPath);

    results.formatting.passed = success;
    results.formatting.fixed = args.fix;

    if (success) {
      formatSpinner.succeed(results.formatting.fixed ? 'Formatting: Fixed' : 'Formatting: Clean');
    } else {
      formatSpinner.fail('Formatting: Issues found');
    }
  }

  // 4. Run tests
  if (hasScript('test', pluginPath)) {
    const testSpinner = ora('Running tests...').start();
    const { success, stdout } = runCommand('npm test', pluginPath);

    results.tests.passed = success;
    results.tests.stats = extractTestStats(stdout);

    if (success) {
      const { passing, total } = results.tests.stats;
      testSpinner.succeed(`Tests: ${passing}/${total} passing`);
    } else {
      const { passing, failing, total } = results.tests.stats;
      testSpinner.fail(`Tests: ${passing}/${total} passing, ${failing} failing`);
    }
  }

  // 5. Check coverage
  if (hasScript('test:coverage', pluginPath) || hasScript('coverage', pluginPath)) {
    const coverageSpinner = ora('Checking coverage...').start();
    const coverageCommand = hasScript('test:coverage', pluginPath) ? 'npm run test:coverage' : 'npm run coverage';
    const { stdout } = runCommand(coverageCommand, pluginPath);

    // Prefer the lcov file the scaffold writes; fall back to regex.
    results.coverage.percentage = readLcovCoverage(pluginPath) ?? extractCoverage(stdout);
    results.coverage.passed = results.coverage.percentage >= 80;

    if (results.coverage.percentage !== null) {
      coverageSpinner[results.coverage.passed ? 'succeed' : 'warn'](`Coverage: ${results.coverage.percentage}%`);
    } else {
      coverageSpinner.info('Coverage: No data');
    }
  }

  // Generate summary
  const overallHealth = calculateOverallHealth(results);
  console.error(chalk.blue(`\n📊 Overall Health: ${getHealthLabel(overallHealth)}\n`));

  // Format output based on requested format
  if (args.output === 'json') {
    return JSON.stringify({ pluginName, results, overallHealth }, null, 2);
  } else if (args.output === 'markdown') {
    return generateMarkdownReport(pluginName, results, overallHealth);
  } else {
    return generateConsoleReport(results, overallHealth);
  }
}

/**
 * Calculate overall health score
 * @param {Object} results - Audit results
 * @returns {string} Health status
 */
function calculateOverallHealth(results) {
  let score = 0;
  let total = 0;

  // Validation (40% weight)
  if (results.validation.score !== null) {
    score += (results.validation.score / 100) * 40;
    total += 40;
  }

  // Tests (30% weight)
  if (results.tests.stats.total > 0) {
    const testScore = results.tests.passed ? 30 : 0;
    score += testScore;
    total += 30;
  }

  // Coverage (20% weight)
  if (results.coverage.percentage !== null) {
    score += (results.coverage.percentage / 100) * 20;
    total += 20;
  }

  // Linting and formatting (10% weight)
  if (results.linting.passed) {
    score += 5;
  }
  if (results.formatting.passed) {
    score += 5;
  }
  total += 10;

  const percentage = total > 0 ? (score / total) * 100 : 0;

  if (percentage >= 90) {
    return 'EXCELLENT';
  }
  if (percentage >= 80) {
    return 'GOOD';
  }
  if (percentage >= 70) {
    return 'FAIR';
  }
  if (percentage >= 60) {
    return 'NEEDS IMPROVEMENT';
  }
  return 'POOR';
}

/**
 * Get health label with color
 * @param {string} health - Health status
 * @returns {string} Colored health label
 */
function getHealthLabel(health) {
  const colors = {
    EXCELLENT: chalk.green,
    GOOD: chalk.green,
    FAIR: chalk.yellow,
    'NEEDS IMPROVEMENT': chalk.red,
    POOR: chalk.red
  };

  return colors[health](health);
}

/**
 * Generate console report
 * @param {Object} results - Audit results
 * @param {string} overallHealth - Health status
 * @returns {string} Console report
 */
function generateConsoleReport(results, overallHealth) {
  const lines = [];

  if (overallHealth === 'POOR' || overallHealth === 'NEEDS IMPROVEMENT') {
    lines.push(chalk.yellow('\n⚠️  Issues found:\n'));

    if (!results.validation.passed) {
      lines.push(`  • Validation score below 70% (${results.validation.score}%)`);
    }
    if (!results.linting.passed) {
      lines.push('  • Linting errors found');
    }
    if (!results.formatting.passed) {
      lines.push('  • Formatting issues found');
    }
    if (!results.tests.passed) {
      lines.push(`  • ${results.tests.stats.failing} test(s) failing`);
    }
    if (!results.coverage.passed) {
      lines.push(`  • Coverage below 80% (${results.coverage.percentage}%)`);
    }

    lines.push(chalk.blue('\n💡 Run with --fix to automatically fix some issues'));
  }

  return lines.join('\n');
}

/**
 * Generate markdown report
 * @param {string} pluginName - Plugin name
 * @param {Object} results - Audit results
 * @param {string} overallHealth - Health status
 * @returns {string} Markdown report
 */
function generateMarkdownReport(pluginName, results, overallHealth) {
  const lines = [
    `# Audit Report: ${pluginName}`,
    '',
    `**Date**: ${new Date().toISOString()}`,
    `**Overall Health**: ${overallHealth}`,
    '',
    '## Results',
    '',
    '| Check | Status | Details |',
    '|-------|--------|---------|'
  ];

  // Add result rows
  if (results.validation.score !== null) {
    const status = results.validation.passed ? '✅' : '❌';
    lines.push(`| Validation | ${status} | ${results.validation.score}% |`);
  }

  if (results.linting.passed !== undefined) {
    const status = results.linting.passed ? '✅' : '❌';
    const details = results.linting.fixed ? 'Fixed issues' : results.linting.passed ? 'Clean' : 'Issues found';
    lines.push(`| Linting | ${status} | ${details} |`);
  }

  if (results.formatting.passed !== undefined) {
    const status = results.formatting.passed ? '✅' : '❌';
    const details = results.formatting.fixed ? 'Fixed' : results.formatting.passed ? 'Clean' : 'Issues found';
    lines.push(`| Formatting | ${status} | ${details} |`);
  }

  if (results.tests.stats.total > 0) {
    const status = results.tests.passed ? '✅' : '❌';
    const { passing, total } = results.tests.stats;
    lines.push(`| Tests | ${status} | ${passing}/${total} passing |`);
  }

  if (results.coverage.percentage !== null) {
    const status = results.coverage.passed ? '✅' : '⚠️';
    lines.push(`| Coverage | ${status} | ${results.coverage.percentage}% |`);
  }

  return lines.join('\n');
}

export default auditPlugin;
