import { promises as fs } from 'node:fs';
import { sanitizePath } from '../utils/path-security.js';
import { loadValidationConfig } from './validate/utils.js';
import { generateReport } from './validate/report.js';
import { checkStructure } from './validate/checks/structure.js';
import { checkTests } from './validate/checks/tests.js';
import { checkDocumentation } from './validate/checks/documentation.js';
import { checkPackageJson } from './validate/checks/package-json.js';
import { checkBiome } from './validate/checks/biome.js';
import { checkCoverage } from './validate/checks/coverage.js';
import { checkJSDoc } from './validate/checks/jsdoc.js';
import { checkPerformance } from './validate/checks/performance.js';
import { checkSecurity } from './validate/checks/security.js';
import { checkIntegration } from './validate/checks/integration.js';
import { checkMetalsmithPatterns } from './validate/checks/metalsmith-patterns.js';
import { checkMarketingLanguage } from './validate/checks/marketing-language.js';
import { checkModuleConsistency } from './validate/checks/module-consistency.js';
import { checkHardcodedValues } from './validate/checks/hardcoded-values.js';
import { checkPerformancePatterns } from './validate/checks/performance-patterns.js';
import { checkI18nReadiness } from './validate/checks/i18n-readiness.js';
import { checkReleaseNotes } from './validate/checks/release-notes.js';
import { checkTheoryDoc } from './validate/checks/theory-doc.js';

const DEFAULT_CHECKS = [
  'structure',
  'tests',
  'docs',
  'package-json',
  'release-notes',
  'jsdoc',
  'performance',
  'security',
  'metalsmith-patterns',
  'marketing-language',
  'module-consistency',
  'hardcoded-values',
  'performance-patterns',
  'i18n-readiness',
  'theory-doc'
];

const CHECK_DISPATCH = {
  structure: (pluginPath, results, functional, config) =>
    config.rules.structure.enabled ? checkStructure(pluginPath, results, functional, config) : null,
  tests: (pluginPath, results, functional, config) =>
    config.rules.tests.enabled ? checkTests(pluginPath, results, functional, config) : null,
  docs: (pluginPath, results, _functional, config) =>
    config.rules.documentation.enabled ? checkDocumentation(pluginPath, results, config) : null,
  'package-json': (pluginPath, results, _functional, config) =>
    config.rules.packageJson ? checkPackageJson(pluginPath, results, config) : null,
  'release-notes': (pluginPath, results) => checkReleaseNotes(pluginPath, results),
  biome: (pluginPath, results) => checkBiome(pluginPath, results),
  coverage: (pluginPath, results, functional, config) => checkCoverage(pluginPath, results, functional, config),
  jsdoc: (pluginPath, results) => checkJSDoc(pluginPath, results),
  performance: (pluginPath, results) => checkPerformance(pluginPath, results),
  security: (pluginPath, results) => checkSecurity(pluginPath, results),
  integration: (pluginPath, results) => checkIntegration(pluginPath, results),
  'metalsmith-patterns': (pluginPath, results) => checkMetalsmithPatterns(pluginPath, results),
  'marketing-language': (pluginPath, results) => checkMarketingLanguage(pluginPath, results),
  'module-consistency': (pluginPath, results) => checkModuleConsistency(pluginPath, results),
  'hardcoded-values': (pluginPath, results) => checkHardcodedValues(pluginPath, results),
  'performance-patterns': (pluginPath, results) => checkPerformancePatterns(pluginPath, results),
  'i18n-readiness': (pluginPath, results) => checkI18nReadiness(pluginPath, results),
  'theory-doc': (pluginPath, results) => checkTheoryDoc(pluginPath, results)
};

/**
 * Validate a Metalsmith plugin against quality standards.
 *
 * Each check is implemented in src/tools/validate/checks/<name>.js. Adding
 * a new check means: add a file in that directory exporting a `check*`
 * function, register it in CHECK_DISPATCH above, and add the name to the
 * MCP enum in src/index.js (and DEFAULT_CHECKS here if it should run by
 * default).
 *
 * @param {Object} args
 * @param {string} args.path - Plugin directory
 * @param {string[]} [args.checks] - Specific checks to run (defaults to
 *   DEFAULT_CHECKS)
 * @param {boolean} [args.functional=false] - Run functional checks
 *   (executes test/coverage commands rather than just inspecting config)
 * @returns {Promise<Object>} MCP tool response
 */
export async function validatePluginTool(args) {
  const { path: userPath, checks = DEFAULT_CHECKS, functional = false } = args;

  const results = { passed: [], failed: [], warnings: [], recommendations: [] };

  try {
    const pluginPath = sanitizePath(userPath || '.', process.cwd());
    await fs.access(pluginPath);
    const config = await loadValidationConfig(pluginPath);

    for (const check of checks) {
      const handler = CHECK_DISPATCH[check];
      if (handler) {
        await handler(pluginPath, results, functional, config);
      }
    }

    return { content: [{ type: 'text', text: generateReport(results) }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Failed to validate plugin: ${error.message}` }],
      isError: true
    };
  }
}
