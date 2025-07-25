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
        complex: {}
      }
    }
  };

  // Add feature-specific directories
  if (features.includes('async-processing')) {
    baseStructure.src.processors = {
      ...baseStructure.src.processors,
      async: {}
    };
  }

  if (features.includes('background-processing')) {
    baseStructure.src.workers = {};
  }

  if (features.includes('metadata-generation')) {
    baseStructure.src.metadata = {};
  }

  return baseStructure;
}
