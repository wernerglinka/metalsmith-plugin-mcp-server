import chalk from 'chalk';

export function generateReport(results) {
  const lines = [chalk.bold('🔍 Plugin Validation Report'), ''];

  if (results.passed.length > 0) {
    lines.push(chalk.green.bold(`Passed (${results.passed.length}):`));
    results.passed.forEach((item) => lines.push(chalk.green(item)));
    lines.push('');
  }

  if (results.warnings.length > 0) {
    lines.push(chalk.yellow.bold(`Warnings (${results.warnings.length}):`));
    results.warnings.forEach((item) => lines.push(chalk.yellow(item)));
    lines.push('');
  }

  if (results.recommendations.length > 0) {
    lines.push(chalk.blue.bold(`Recommendations (${results.recommendations.length}):`));
    results.recommendations.forEach((item) => lines.push(chalk.blue(item)));
    lines.push('');
  }

  if (results.failed.length > 0) {
    lines.push(chalk.red.bold(`Failed (${results.failed.length}):`));
    results.failed.forEach((item) => lines.push(chalk.red(item)));
    lines.push('');
  }

  const total =
    results.passed.length + results.warnings.length + results.failed.length + results.recommendations.length;
  const score = Math.round((results.passed.length / total) * 100);

  lines.push(chalk.bold('Summary:'));
  lines.push(`Total checks: ${total}`);
  lines.push(`Quality score: ${score}%`);

  if (results.failed.length === 0) {
    lines.push(chalk.green.bold('✅ Plugin meets quality standards!'));
  } else {
    lines.push(chalk.red.bold('❌ Plugin needs improvements'));
  }

  return lines.join('\n');
}
