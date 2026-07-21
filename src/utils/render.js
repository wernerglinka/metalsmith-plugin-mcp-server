/**
 * Template Rendering Utilities
 *
 * Uses Nunjucks for proper template processing with full support for
 * conditionals, loops, filters, and complex expressions.
 */

import nunjucks from 'nunjucks';

/**
 * Configure Nunjucks environment with custom filters
 */
const env = nunjucks.configure({ autoescape: false, trimBlocks: true });

// Add custom filter for camelCase conversion
env.addFilter('camelCase', (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  return str
    .split('-')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
});

// Add custom filter to remove prefix from string
env.addFilter('removePrefix', (str, prefix) => {
  if (typeof str !== 'string' || typeof prefix !== 'string') {
    return str;
  }
  return str.startsWith(prefix) ? str.slice(prefix.length) : str;
});

/**
 * Render template using Nunjucks
 *
 * @param {string} template - Template string with Nunjucks syntax
 * @param {Object} data - Data object containing template variables
 * @returns {string} Rendered template
 */
export function render(template, data) {
  try {
    // Enhance data with computed properties for common template needs.
    // These are defensive defaults — most callers pre-compute them, but
    // diff-template renders raw scaffold templates against any plugin's
    // package.json and may not.
    const enhancedData = {
      ...data,
      // Add short plugin name (without metalsmith- prefix)
      pluginNameShort: data.pluginName ? data.pluginName.replace('metalsmith-', '') : '',
      // Add camelCase function name
      functionName: data.pluginName
        ? data.pluginName
            .replace('metalsmith-', '')
            .split('-')
            .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
            .join('')
        : '',
      // Add feature flags as boolean properties
      ...(data.features
        ? data.features.reduce((acc, feature) => {
            acc[
              `has${feature
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join('')}`
            ] = true;
            return acc;
          }, {})
        : {}),
      // Current year for copyright
      year: new Date().getFullYear(),
      // Pre-rendered keywords array body. Building this in JS avoids the
      // whitespace artifacts that a {% for %} loop inside JSON produces
      // under trimBlocks (stray spaces / bracket on the wrong line).
      keywordsBlock: ['metalsmith', 'metalsmith-plugin', ...(data.features || [])]
        .filter((kw, index, arr) => arr.indexOf(kw) === index)
        .map((kw) => `    "${kw}"`)
        .join(',\n')
    };

    return env.renderString(template, enhancedData);
  } catch (error) {
    throw new Error(`Template rendering failed: ${error.message}`);
  }
}
