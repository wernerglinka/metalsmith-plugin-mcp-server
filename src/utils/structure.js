/**
 * Generate plugin directory structure based on type and features
 * @param {string} type - Plugin type
 * @param {string[]} features - Additional features
 * @returns {Object} Directory structure
 */
export function generatePluginStructure(type, features) {
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

  // Add type-specific directories
  switch (type) {
    case 'processor':
      baseStructure.src.processors = {};
      break;
    case 'transformer':
      baseStructure.src.transformers = {};
      break;
    case 'validator':
      baseStructure.src.validators = {};
      break;
  }

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
