import { readPluginSource } from '../utils.js';

const HARDCODED_PATTERNS = [
  {
    pattern: /wordsPerMinute\s*[:=]\s*\d+/,
    message: 'Hardcoded reading speed (wordsPerMinute) - should be configurable option'
  },
  {
    pattern: /viewport.*width=device-width.*initial-scale=1\.0/,
    message: 'Hardcoded viewport meta tag - should be configurable option'
  },
  {
    pattern: /charset.*utf-8/i,
    message: 'Hardcoded charset - consider making configurable'
  },
  {
    pattern: /lang.*en(-US)?/,
    message: 'Hardcoded language - should support internationalization'
  },
  {
    pattern: /minute read|minutes read/,
    message: 'Hardcoded English text for reading time - prevents internationalization'
  },
  {
    pattern: /\b\d{2,4}\s*px\b|\b\d{1,3}%\b/,
    message: 'Hardcoded CSS dimensions - consider making configurable'
  }
];

export async function checkHardcodedValues(pluginPath, results) {
  try {
    const { all } = await readPluginSource(pluginPath);

    let foundHardcodedValues = false;
    for (const check of HARDCODED_PATTERNS) {
      if (check.pattern.test(all)) {
        foundHardcodedValues = true;
        results.warnings.push(`⚠ ${check.message}`);
      }
    }

    const hasOptionsDefaults = /options\s*=\s*\{[\s\S]*\}|Object\.assign\(.*options|\.\.\.options/.test(all);
    const hasOptionsValidation = /options\?\.|options\s*\|\|\s*\{/.test(all);

    if (foundHardcodedValues) {
      if (hasOptionsDefaults) {
        results.recommendations.push('💡 Move hardcoded values to configurable options with sensible defaults');
      } else {
        results.recommendations.push(
          '💡 Add options parameter with defaults: function plugin(options = {}) { const config = { defaults, ...options }; }'
        );
      }
    } else if (hasOptionsDefaults || hasOptionsValidation) {
      results.passed.push('✓ Plugin uses configurable options instead of hardcoded values');
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check hardcoded values: ${error.message}`);
  }
}
