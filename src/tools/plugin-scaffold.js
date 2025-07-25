/**
 * Plugin Scaffold Tool
 *
 * This tool generates a complete Metalsmith plugin structure with enhanced standards.
 * It creates everything needed for a professional plugin:
 * - Source code structure with proper organization
 * - Comprehensive test setup with fixtures
 * - Production-ready documentation
 * - Modern configuration files (ESLint, Prettier, etc.)
 * - Package.json with all necessary metadata
 *
 * The generated plugins follow patterns from high-quality plugins like
 * metalsmith-optimize-images, ensuring consistency and maintainability.
 */

import { promises as fs } from 'fs'; // File system operations (async/await style)
import path from 'path'; // Path manipulation utilities
import { fileURLToPath } from 'url'; // Convert import.meta.url to file path
import validateNpmPackageName from 'validate-npm-package-name'; // Validate npm package names
import chalk from 'chalk'; // Colored terminal output

// Our utility functions for template processing
import { copyTemplate } from '../utils/template.js';
import { generatePluginStructure } from '../utils/structure.js';

// Get the directory containing this file (needed for finding templates)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Scaffold a new Metalsmith plugin with enhanced standards
 *
 * This is the main function that Claude calls when using the plugin-scaffold tool.
 * It validates inputs, creates the directory structure, and generates all files.
 *
 * @param {Object} args - Tool arguments from Claude
 * @param {string} args.name - Plugin name (exact name as provided by user)
 * @param {string} args.description - Required description of what the plugin does
 * @param {string[]} [args.features=[]] - Additional features to include
 * @param {string} [args.outputPath='.'] - Output directory path
 * @param {string} [args.author='Your Name'] - Plugin author
 * @param {string} [args.license='MIT'] - Plugin license
 * @returns {Promise<Object>} MCP tool response object
 */
export async function pluginScaffoldTool(args) {
  // Extract arguments with defaults (ES6 destructuring with default values)
  const {
    name,
    features = ['async-processing'],
    outputPath = '.',
    license = 'MIT',
    description,
    author = 'Your Name'
  } = args;

  // Validate required parameters
  if (!name) {
    return {
      content: [
        {
          type: 'text',
          text: 'Plugin name is required'
        }
      ],
      isError: true
    };
  }

  if (!description || description.trim() === '') {
    return {
      content: [
        {
          type: 'text',
          text: 'Plugin description is required. Please provide a meaningful description of what the plugin does.'
        }
      ],
      isError: true
    };
  }

  // Validate features
  const validFeatures = ['async-processing', 'background-processing', 'metadata-generation'];
  const invalidFeatures = features.filter((feature) => !validFeatures.includes(feature));

  if (invalidFeatures.length > 0) {
    return {
      content: [
        {
          type: 'text',
          text: `Invalid features: ${invalidFeatures.join(', ')}\n\nValid features are:\n- async-processing: Adds batch processing and async capabilities\n- background-processing: Adds worker thread support for concurrent processing\n- metadata-generation: Adds metadata extraction and generation features\n\nExample: ["async-processing", "metadata-generation"]`
        }
      ],
      isError: true
    };
  }

  // Validate plugin name using npm's official validation
  const validation = validateNpmPackageName(name);
  if (!validation.validForNewPackages) {
    // Combine errors and warnings into a single array
    const errors = [...(validation.errors || []), ...(validation.warnings || [])];

    // Return an MCP error response
    return {
      content: [
        {
          type: 'text',
          text: `Invalid plugin name "${name}":\n${errors.join('\n')}`
        }
      ],
      isError: true // This tells Claude the operation failed
    };
  }

  // Warn if name doesn't follow Metalsmith convention, but don't enforce it
  let conventionWarning = '';
  if (!name.startsWith('metalsmith-')) {
    conventionWarning = `⚠️  Warning: Plugin name '${name}' doesn't follow the 'metalsmith-*' naming convention. Consider renaming to 'metalsmith-${name.replace(/^metalsmith-?/, '')}' for better discoverability.\n\n`;
  }

  // Construct the full path where the plugin will be created
  const pluginPath = path.join(outputPath, name);

  try {
    // Check if directory already exists to avoid overwriting existing work
    try {
      await fs.access(pluginPath); // This throws if path doesn't exist

      // If we get here, the directory exists - that's an error
      return {
        content: [
          {
            type: 'text',
            text: `Directory ${pluginPath} already exists. Please remove it or choose a different name.`
          }
        ],
        isError: true
      };
    } catch {
      // Directory doesn't exist, which is what we want - proceed with creation
    }

    // Create the main plugin directory (recursive: true creates parent dirs if needed)
    await fs.mkdir(pluginPath, { recursive: true });

    // Generate directory structure based on plugin features
    // This creates the subdirectories like src/, test/, src/utils/, etc.
    const structure = generatePluginStructure(features);
    await createDirectoryStructure(pluginPath, structure);

    // Prepare template data for rendering
    // These variables will be substituted into template files using {{variableName}} syntax
    const templateData = {
      pluginName: name, // Full plugin name
      pluginNameShort: name.replace('metalsmith-', ''), // Short name without metalsmith prefix
      features, // Array of selected features
      functionName: toCamelCase(name.replace('metalsmith-', '')), // camelCase function name
      className: toPascalCase(name.replace('metalsmith-', '')), // PascalCase class name
      description: description.trim(),
      year: new Date().getFullYear(), // Current year for copyright
      license, // Use the license as-is
      author, // Use provided author or default

      // Feature flags for conditional template rendering
      hasAsyncProcessing: features.includes('async-processing'),
      hasBackgroundProcessing: features.includes('background-processing'),
      hasMetadataGeneration: features.includes('metadata-generation'),

      // Helper functions for templates
      camelCase: toCamelCase
    };

    /*
     * The plugin generation process involves several steps:
     * 1. Copy and render template files (package.json, README.md, src/index.js, etc.)
     * 2. Generate configuration files (ESLint, Prettier, .gitignore, etc.)
     * 3. Initialize a git repository with an initial commit
     * 4. Generate a directory tree for display to the user
     */

    // Copy and render all template files with our data
    await copyTemplates(pluginPath, templateData);

    // Copy license file if requested
    if (license !== 'UNLICENSED') {
      await copyLicenseFile(pluginPath, license, templateData);
    } else {
      // Add a warning comment about UNLICENSED
      console.warn(chalk.yellow("\n⚠️  Note: UNLICENSED means 'All Rights Reserved'"));
      console.warn(chalk.yellow('   No one can use, copy, or distribute your code without explicit permission.'));
      console.warn(chalk.yellow('   Consider using an open source license like MIT for Metalsmith plugins.\n'));
    }

    // Generate modern configuration files (ESLint flat config, etc.)
    await generateConfigs(pluginPath);

    // Initialize git repository and make initial commit
    await initGitRepo(pluginPath);

    return {
      content: [
        {
          type: 'text',
          text: [
            conventionWarning,
            chalk.green(`✓ Successfully created ${name}`),
            '',
            `Plugin created at: ${path.resolve(pluginPath)}`,
            `Relative path: ${path.relative(process.cwd(), pluginPath)}`,
            `Working directory: ${process.cwd()}`,
            '',
            'Plugin structure created with the following key files:',
            '- src/index.js (main plugin file)',
            '- test/index.test.js (test suite)',
            '- package.json (package configuration)',
            '- README.md (documentation)',
            '- eslint.config.js (linting rules)',
            '',
            'Next steps:',
            `  cd ${path.relative(process.cwd(), pluginPath)}`,
            '  npm install',
            '  npm run build    # Build ESM and CJS versions',
            '  npm test         # Run tests for both module formats',
            '  npm run lint',
            '',
            'Available scripts:',
            '  npm run build    - Build ESM and CJS versions',
            '  npm test         - Run both ESM and CJS tests',
            '  npm run test:esm - Run ESM tests only',
            '  npm run test:cjs - Run CJS tests only',
            '  npm run coverage - Run tests with coverage',
            '  npm run lint     - Lint code',
            '  npm run format   - Format code',
            '  npm run release  - Create a new release',
            '',
            'Development workflow:',
            '  1. Make your changes in src/index.js',
            '  2. Add tests in test/index.test.js',
            '  3. Run npm run build to create lib/ files',
            '  4. Run npm test to verify functionality',
            '  5. Run npm run lint to check code style',
            '',
            'Note: Remember to run "npm run build" before testing or publishing!',
            '',
            'Happy coding! 🚀'
          ].join('\n')
        }
      ]
    };
  } catch (error) {
    // Clean up on error
    try {
      await fs.rm(pluginPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    return {
      content: [
        {
          type: 'text',
          text: `Failed to scaffold plugin: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Create directory structure recursively
 */
async function createDirectoryStructure(basePath, structure) {
  for (const [name, content] of Object.entries(structure)) {
    const fullPath = path.join(basePath, name);

    if (typeof content === 'object' && content !== null) {
      await fs.mkdir(fullPath, { recursive: true });
      await createDirectoryStructure(fullPath, content);
    }
  }
}

/**
 * Copy and render template files
 */
async function copyTemplates(pluginPath, data) {
  const templatesDir = path.join(__dirname, '../../templates/plugin');

  // Copy common templates
  await copyTemplate(path.join(templatesDir, 'package.json.template'), path.join(pluginPath, 'package.json'), data);

  await copyTemplate(path.join(templatesDir, 'README.md.template'), path.join(pluginPath, 'README.md'), data);

  await copyTemplate(path.join(templatesDir, 'index.js.template'), path.join(pluginPath, 'src/index.js'), data);

  // Copy utility files
  await copyTemplate(
    path.join(templatesDir, 'utils/config.js.template'),
    path.join(pluginPath, 'src/utils/config.js'),
    data
  );

  // Copy test templates
  await copyTemplate(
    path.join(templatesDir, 'index.test.js.template'),
    path.join(pluginPath, 'test/index.test.js'),
    data
  );
  await copyTemplate(
    path.join(templatesDir, 'cjs.test.cjs.template'),
    path.join(pluginPath, 'test/cjs.test.cjs'),
    data
  );

  // Copy test fixtures
  await copyTestFixtures(templatesDir, pluginPath, data);
}

/**
 * Copy test fixture files
 */
async function copyTestFixtures(templatesDir, targetDir, data) {
  const fixturesDir = path.join(templatesDir, 'fixtures');

  try {
    const fixtureCategories = await fs.readdir(fixturesDir);

    for (const category of fixtureCategories) {
      const categoryPath = path.join(fixturesDir, category);
      const stats = await fs.stat(categoryPath);

      if (stats.isDirectory()) {
        const targetCategoryPath = path.join(targetDir, 'test/fixtures', category);
        await fs.mkdir(targetCategoryPath, { recursive: true });

        // Copy files from this fixture category
        const files = await fs.readdir(categoryPath);
        for (const file of files) {
          const sourcePath = path.join(categoryPath, file);
          const targetPath = path.join(targetCategoryPath, file.replace('.template', ''));

          if (file.endsWith('.template')) {
            await copyTemplate(sourcePath, targetPath, data);
          } else {
            await fs.copyFile(sourcePath, targetPath);
          }
        }
      }
    }
  } catch (error) {
    // Fixtures are optional, don't fail if they don't exist
    console.error('Warning: Could not copy test fixtures:', error.message);
  }
}

/**
 * Copy license file with template rendering
 */
async function copyLicenseFile(pluginPath, license, data) {
  const licensesDir = path.join(__dirname, '../../templates/licenses');
  const licenseTemplate = path.join(licensesDir, `${license}.template`);
  const targetPath = path.join(pluginPath, 'LICENSE');

  try {
    await copyTemplate(licenseTemplate, targetPath, data);
  } catch (error) {
    console.error(`Warning: Could not copy ${license} license template:`, error.message);
  }
}

/**
 * Generate configuration files
 */
async function generateConfigs(pluginPath) {
  const configsDir = path.join(__dirname, '../../templates/configs');

  // Copy configuration files
  const configs = [
    ['eslint.config.js.template', 'eslint.config.js'],
    ['prettier.config.js.template', 'prettier.config.js'],
    ['.editorconfig.template', '.editorconfig'],
    ['.gitignore.template', '.gitignore'],
    ['release-it.json.template', '.release-it.json'],
    ['.c8rc.json.template', '.c8rc.json']
  ];

  for (const [source, target] of configs) {
    await fs.copyFile(path.join(configsDir, source), path.join(pluginPath, target));
  }
}

/**
 * Initialize git repository
 */
async function initGitRepo(pluginPath) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    await execAsync('git init', { cwd: pluginPath });
    await execAsync('git add .', { cwd: pluginPath });
    await execAsync('git commit -m "Initial commit"', { cwd: pluginPath });
  } catch (error) {
    // Git init is optional, don't fail if it doesn't work
    console.error('Failed to initialize git repository:', error.message);
  }
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str) {
  return str
    .split('-')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str) {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}
