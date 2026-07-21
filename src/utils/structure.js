/**
 * Generate plugin directory structure based on features
 * @param {string[]} features - Additional features
 * @returns {Object} Directory structure
 */
export function generatePluginStructure(features) {
  const baseStructure = {
    src: {
      utils: {}
    },
    test: {
      fixtures: {
        basic: {},
        empty: {}
      }
    },
    scripts: {},
    docs: {}
  };

  // Add feature-specific directories. The async processor lives at
  // src/processors/async.js (a file, not a directory), so create the
  // processors/ dir only; the file itself is copied from a template.
  if (features.includes('async-processing')) {
    baseStructure.src.processors = {};
  }

  if (features.includes('background-processing')) {
    baseStructure.src.workers = {};
  }

  if (features.includes('metadata-generation')) {
    baseStructure.src.metadata = {};
  }

  return baseStructure;
}
