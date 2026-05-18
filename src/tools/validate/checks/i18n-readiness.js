import { promises as fs } from 'node:fs';
import path from 'node:path';

const ENGLISH_ONLY_PATTERNS = [
  { pattern: /['"`]\d+\s+minutes?\s+read['"`]/, message: 'Returns English reading time text instead of data' },
  { pattern: /['"`].*minute\s+read['"`]/, message: 'Hardcoded English time text' },
  { pattern: /['"`](seconds?|minutes?|hours?)\s/, message: 'Hardcoded English time units' },
  { pattern: /['"`](Loading|Error|Success|Failed)['"`]/, message: 'Hardcoded English status messages' },
  { pattern: /console\.log\(['"`][A-Z].*['"`]\)/, message: 'English console messages' }
];

const LOCALE_PATTERNS = [
  { pattern: /MM\/DD\/YYYY|DD\/MM\/YYYY/, message: 'Hardcoded date format - use configurable format or ISO dates' },
  { pattern: /\$\d+|\d+\s*USD/, message: 'Hardcoded currency format' },
  { pattern: /\d{1,3},\d{3}/, message: 'Hardcoded number formatting (US style)' }
];

export async function checkI18nReadiness(pluginPath, results) {
  try {
    const mainFilePath = path.join(pluginPath, 'src/index.js');
    const mainFileContent = await fs.readFile(mainFilePath, 'utf-8');

    let foundI18nIssues = false;
    for (const check of ENGLISH_ONLY_PATTERNS) {
      if (check.pattern.test(mainFileContent)) {
        foundI18nIssues = true;
        results.warnings.push(`⚠ I18n issue: ${check.message}`);
      }
    }

    const returnsDataPattern = /return\s*\{[\s\S]*(?:minutes|seconds|value)[\s\S]*\}/;
    const usesConfigurableText = /options\.(?:text|message|label)/;

    if (foundI18nIssues) {
      if (returnsDataPattern.test(mainFileContent)) {
        results.recommendations.push('💡 Good: Plugin returns data objects. Remove any remaining hardcoded text');
      } else {
        results.recommendations.push(
          '💡 Return data objects instead of formatted text: { minutes: 5, seconds: 20 } instead of "5 minute read"'
        );
      }

      if (!usesConfigurableText.test(mainFileContent)) {
        results.recommendations.push(
          '💡 Make text messages configurable via options: options.messages?.readingTime || "minute read"'
        );
      }
    } else if (returnsDataPattern.test(mainFileContent)) {
      results.passed.push('✓ Plugin returns data instead of hardcoded English text');
    } else {
      results.passed.push('✓ No obvious internationalization issues detected');
    }

    for (const check of LOCALE_PATTERNS) {
      if (check.pattern.test(mainFileContent)) {
        results.warnings.push(`⚠ Locale assumption: ${check.message}`);
      }
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check internationalization readiness: ${error.message}`);
  }
}
