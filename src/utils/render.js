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
    // Process arrays for display but keep originals for iteration
    const processedData = {};
    for (const key in data) {
      if (Array.isArray(data[key])) {
        // Keep original array
        processedData[key] = data[key];
        // Also create a display version
        processedData[`${key}Display`] = data[key].join(', ');
      } else {
        processedData[key] = data[key];
      }
    }

    // Enhance data with computed properties for common template needs
    const enhancedData = {
      ...processedData,
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
      year: new Date().getFullYear()
    };

    return env.renderString(template, enhancedData);
  } catch (error) {
    throw new Error(`Template rendering failed: ${error.message}`);
  }
}

// Legacy function exports for backward compatibility
export function renderTemplate(template, data) {
  return render(template, data);
}

export function renderConditionals(template, data) {
  // For test compatibility: only process conditionals, not variables
  // Nunjucks doesn't have a way to disable variable processing,
  // so we'll just render normally
  return render(template, data);
}

export function renderEach(template, data) {
  return render(template, data);
}
