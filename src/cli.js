#!/usr/bin/env node

/**
 * CLI wrapper for the Metalsmith Plugin MCP Server
 *
 * This provides a command-line interface for using the MCP server tools
 * without requiring an AI assistant setup.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import chalk from 'chalk';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Chalk styling constants for consistent output formatting
 */
const styles = {
  error: chalk.red,
  success: chalk.green,
  warning: chalk.yellow,
  info: chalk.gray,
  bold: chalk.bold,
  header: chalk.bold
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  features: ['async-processing'],
  license: 'MIT',
  author: '',
  outputPath: '.'
};

/**
 * Read user configuration from .metalsmith-plugin-mcp file
 * Looks in current directory and home directory
 * @returns {Promise<Object>} User configuration merged with defaults
 */
async function readUserConfig() {
  const configFiles = [join(process.cwd(), '.metalsmith-plugin-mcp'), join(homedir(), '.metalsmith-plugin-mcp')];

  let userConfig = {};

  for (const configFile of configFiles) {
    try {
      const content = await fs.readFile(configFile, 'utf8');
      const config = JSON.parse(content);
      userConfig = { ...userConfig, ...config };
    } catch {
      // Config file doesn't exist or is invalid, skip it
    }
  }

  return { ...DEFAULT_CONFIG, ...userConfig };
}

/**
 * Prompt user for input
 * @param {string} question - The question to ask
 * @param {string} [defaultValue] - Default value if user presses enter
 * @returns {Promise<string>} User's input
 */
function prompt(question, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const displayQuestion = defaultValue ? `${question} (${styles.info(defaultValue)}): ` : `${question}: `;

    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

const args = process.argv.slice(2);
const command = args[0];

/**
 * Display help information for the CLI
 * Shows available commands, usage examples, and setup instructions
 * @returns {void}
 */
function showHelp() {
  console.warn(chalk.bold('\nMetalsmith Plugin MCP Server'));
  console.warn(chalk.gray('MCP server for scaffolding and validating high-quality Metalsmith plugins\n'));

  console.warn(chalk.bold('Usage:'));
  console.warn('  npx metalsmith-plugin-mcp-server <command> [options]\n');

  console.warn(chalk.bold('Commands:'));
  console.warn('  help                          Show this help message');
  console.warn('  version                       Show version information');
  console.warn('  server                        Start the MCP server (for AI assistants)');
  console.warn('  config                        Show current configuration and setup');
  console.warn('  scaffold [name] [description] [path] Create a new Metalsmith plugin');
  console.warn('  validate [path] [--functional] Validate an existing plugin');
  console.warn('  configs [path]                Generate configuration files');
  console.warn('  update-deps [path] [--install] [--test] Update dependencies in plugin(s)\n');

  console.warn(chalk.gray('Note: Commands can be run in guided mode by omitting parameters\n'));

  console.warn(chalk.bold('Examples:'));
  console.warn('  npx metalsmith-plugin-mcp-server version                   # Show version');
  console.warn('  npx metalsmith-plugin-mcp-server config                    # Show current setup');
  console.warn('  npx metalsmith-plugin-mcp-server scaffold my-plugin "Processes my files" ./plugins');
  console.warn('  npx metalsmith-plugin-mcp-server scaffold                  # Guided mode');
  console.warn('  npx metalsmith-plugin-mcp-server validate ./metalsmith-existing-plugin');
  console.warn('  npx metalsmith-plugin-mcp-server validate ./ --functional # Run tests & coverage');
  console.warn('  npx metalsmith-plugin-mcp-server configs ./my-plugin');
  console.warn('  npx metalsmith-plugin-mcp-server update-deps ./plugins     # Update all plugins');
  console.warn('  npx metalsmith-plugin-mcp-server update-deps ./my-plugin   # Update single plugin');
  console.warn('  npx metalsmith-plugin-mcp-server update-deps ./ --install --test # Update, install & test\n');

  console.warn(chalk.bold('MCP Server Setup:'));
  console.warn('  For use with Claude Desktop or Claude Code, run:');
  console.warn('  npx metalsmith-plugin-mcp-server server\n');

  console.warn(chalk.gray('For more information, visit:'));
  console.warn(chalk.gray('https://github.com/wernerglinka/metalsmith-plugin-mcp-server\n'));
}

/**
 * Start the MCP server for AI assistant integration
 * Spawns the actual MCP server process and handles its lifecycle
 * @returns {void}
 */
function startServer() {
  // Start the actual MCP server
  const serverPath = join(__dirname, 'index.js');
  const child = spawn('node', [serverPath], {
    stdio: 'inherit'
  });

  child.on('error', (err) => {
    console.error(chalk.red('Failed to start MCP server:'), err);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(chalk.red(`MCP server exited with code ${code}`));
      process.exit(code);
    }
  });
}

/**
 * Scaffold a new Metalsmith plugin
 * Creates a complete plugin structure with all necessary files and configurations
 * @param {string} name - The name of the plugin (exact name as provided by user)
 * @param {string} description - What the plugin does (required)
 * @param {string} [outputPath] - The directory where the plugin will be created (uses config default if not provided)
 * @returns {Promise<void>}
 */
async function runScaffold(name, description, outputPath) {
  // Interactive mode if parameters are missing
  if (!name) {
    console.warn(styles.header('\nScaffold a new Metalsmith plugin\n'));
    name = await prompt('Plugin name');

    if (!name) {
      console.error(styles.error('\nError: Plugin name is required'));
      process.exit(1);
    }
  }

  if (!description) {
    description = await prompt('Plugin description');

    if (!description) {
      console.error(styles.error('\nError: Plugin description is required'));
      process.exit(1);
    }
  }

  // Load user configuration
  const config = await readUserConfig();

  if (!outputPath) {
    const defaultPath = config.outputPath || '.';
    outputPath = await prompt('Output path', defaultPath);
  }

  try {
    // Import and run the scaffold tool directly
    const { pluginScaffoldTool } = await import('./tools/plugin-scaffold.js');
    const result = await pluginScaffoldTool({
      name,
      description,
      outputPath,
      features: config.features,
      author: config.author,
      license: config.license
    });

    // The tool returns a content array, extract the text
    if (result.content && result.content[0] && result.content[0].text) {
      console.warn(result.content[0].text);
    } else {
      console.warn(styles.success('\n✓ Plugin scaffolded successfully!'));
    }
  } catch (error) {
    console.error(styles.error('Error scaffolding plugin:'), error.message);
    process.exit(1);
  }
}

/**
 * Validate an existing Metalsmith plugin
 * Checks the plugin against quality standards including structure, tests, docs, and configuration
 * @param {string} path - Path to the plugin directory to validate
 * @returns {Promise<void>}
 */
async function runValidate(path, functional = false) {
  // Interactive mode if path is missing
  if (!path) {
    console.warn(styles.header('\nValidate a Metalsmith plugin\n'));
    path = await prompt('Plugin path', '.');

    if (!path) {
      console.error(styles.error('\nError: Plugin path is required'));
      process.exit(1);
    }
  }

  try {
    // Import and run the validate tool directly
    const { validatePluginTool } = await import('./tools/validate-plugin.js');
    const result = await validatePluginTool({
      path,
      checks: ['structure', 'tests', 'docs', 'package-json', 'eslint', 'coverage'],
      functional
    });

    // The tool returns a content array, extract the text
    if (result.content && result.content[0] && result.content[0].text) {
      console.warn(result.content[0].text);
    } else {
      console.warn(styles.error('No validation results returned'));
    }
  } catch (error) {
    console.error(chalk.red('Error validating plugin:'), error.message);
    process.exit(1);
  }
}

/**
 * Generate configuration files for a Metalsmith plugin
 * Creates ESLint, Prettier, EditorConfig, .gitignore, and release-it configuration files
 * @param {string} outputPath - The directory where config files will be generated
 * @returns {Promise<void>}
 */
async function runGenerateConfigs(outputPath) {
  // Interactive mode if path is missing
  if (!outputPath) {
    console.warn(styles.header('\nGenerate configuration files\n'));
    outputPath = await prompt('Output path', '.');

    if (!outputPath) {
      console.error(styles.error('\nError: Output path is required'));
      process.exit(1);
    }
  }

  try {
    // Import and run the generate configs tool directly
    const { generateConfigsTool } = await import('./tools/generate-configs.js');
    const result = await generateConfigsTool({
      outputPath,
      configs: ['eslint', 'prettier', 'editorconfig', 'gitignore', 'release-it']
    });

    console.warn(chalk.green('✓ Configuration files generated:'));
    result.files.forEach((file) => {
      console.warn(chalk.gray(`  - ${file}`));
    });
    console.warn();
  } catch (error) {
    console.error(chalk.red('Error generating configs:'), error.message);
    process.exit(1);
  }
}

/**
 * Show version information
 * Displays the current version of the metalsmith-plugin-mcp-server
 * @returns {Promise<void>}
 */
async function showVersion() {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    console.warn(styles.header(`\n${packageJson.name}`));
    console.warn(styles.info(`Version: ${packageJson.version}`));
    console.warn(styles.info(`Description: ${packageJson.description}`));
    console.warn();
  } catch (error) {
    console.error(styles.error('Error reading version information:'), error.message);
    process.exit(1);
  }
}

/**
 * Show current configuration and setup
 * Displays the current .metalsmith-plugin-mcp configuration with explanations
 * @returns {Promise<void>}
 */
async function showConfig() {
  console.warn(styles.header('\nMetalsmith Plugin MCP Server Configuration\n'));

  // Find config files and their sources
  const configFiles = [
    { path: join(process.cwd(), '.metalsmith-plugin-mcp'), label: 'Local (current directory)' },
    { path: join(homedir(), '.metalsmith-plugin-mcp'), label: 'Global (home directory)' }
  ];

  const foundConfigs = [];
  let mergedConfig = { ...DEFAULT_CONFIG };

  for (const configFile of configFiles) {
    try {
      const content = await fs.readFile(configFile.path, 'utf8');
      const config = JSON.parse(content);
      foundConfigs.push({ ...configFile, config, content });
      mergedConfig = { ...mergedConfig, ...config };
    } catch {
      // Config file doesn't exist or is invalid
    }
  }

  // Show configuration sources
  console.warn(styles.bold('Configuration Sources:'));
  if (foundConfigs.length === 0) {
    console.warn(styles.info('  No configuration files found - using defaults\n'));
  } else {
    foundConfigs.forEach((found) => {
      console.warn(styles.success(`  ✓ ${found.label}: ${found.path}`));
    });
    console.warn();
  }

  // Show effective configuration
  console.warn(styles.bold('Current Configuration:'));
  console.warn(`  Output Path: ${styles.info(mergedConfig.outputPath)}`);
  console.warn(`  License: ${styles.info(mergedConfig.license)}`);
  console.warn(`  Author: ${styles.info(mergedConfig.author || 'Not set - will prompt or use git config')}`);

  if (mergedConfig.features && mergedConfig.features.length > 0) {
    console.warn(`  Features: ${styles.info(mergedConfig.features.join(', '))}`);
  } else {
    console.warn(`  Features: ${styles.info('None (override default)')}`);
  }
  console.warn();

  // Show feature explanations
  if (mergedConfig.features && mergedConfig.features.length > 0) {
    console.warn(styles.bold('Feature Explanations:'));
    mergedConfig.features.forEach((feature) => {
      switch (feature) {
        case 'async-processing':
          console.warn('  • async-processing: Adds batch processing and async capabilities');
          break;
        case 'background-processing':
          console.warn('  • background-processing: Adds worker thread support for concurrent processing');
          break;
        case 'metadata-generation':
          console.warn('  • metadata-generation: Adds metadata extraction and generation features');
          break;
        default:
          console.warn(`  • ${feature}: ${styles.warning('Unknown feature - may cause errors')}`);
      }
    });
    console.warn();
  }

  // Show how configuration affects scaffolding
  console.warn(styles.bold('How This Affects Plugin Creation:'));
  console.warn(`  • New plugins will be created in: ${styles.info(mergedConfig.outputPath)}`);
  console.warn(`  • Default license will be: ${styles.info(mergedConfig.license)}`);
  if (mergedConfig.author) {
    console.warn(`  • Author will be set to: ${styles.info(mergedConfig.author)}`);
  } else {
    console.warn('  • Author will be detected from git config or prompted');
  }
  if (mergedConfig.features && mergedConfig.features.length > 0) {
    console.warn(`  • Features will be automatically included: ${styles.info(mergedConfig.features.join(', '))}`);
  } else {
    console.warn('  • No features will be included (overrides default async-processing)');
  }
  console.warn();

  // Show example configuration file
  console.warn(styles.bold('Example Configuration File:'));
  console.warn(styles.info('Create .metalsmith-plugin-mcp in your project root or home directory:'));
  console.warn();
  console.warn(
    chalk.gray(
      JSON.stringify(
        {
          license: 'MIT',
          author: 'Your Name <your.email@example.com>',
          outputPath: './plugins',
          features: ['async-processing', 'metadata-generation']
        },
        null,
        2
      )
    )
  );
  console.warn();

  // Show config file locations checked
  console.warn(styles.bold('Configuration File Search Order:'));
  console.warn(styles.info('  1. .metalsmith-plugin-mcp (current directory)'));
  console.warn(styles.info('  2. .metalsmith-plugin-mcp (home directory)'));
  console.warn(styles.info('  Later files override earlier ones\n'));

  console.warn(styles.bold('Valid Features:'));
  console.warn(styles.info('  • async-processing: Adds batch processing and async capabilities'));
  console.warn(styles.info('  • background-processing: Adds worker thread support for concurrent processing'));
  console.warn(styles.info('  • metadata-generation: Adds metadata extraction and generation features\n'));

  console.warn(styles.bold('Valid Licenses:'));
  console.warn(styles.info('  MIT, Apache-2.0, ISC, BSD-3-Clause, UNLICENSED\n'));
}

/**
 * Update dependencies in Metalsmith plugin(s)
 * Uses npm-check-updates to check and update dependencies
 * @param {string} path - Path to plugin directory or parent directory containing plugins
 * @param {boolean} install - Auto-install updates after applying them
 * @param {boolean} test - Run tests after installing updates
 * @returns {Promise<void>}
 */
async function runUpdateDeps(path, install = false, test = false) {
  // Interactive mode if path is missing
  if (!path) {
    console.warn(styles.header('\nUpdate plugin dependencies\n'));

    const choice = await prompt('Update (A)ll plugins in current directory or specific (P)lugin?', 'A');

    if (choice.toLowerCase() === 'a' || choice.toLowerCase() === 'all') {
      path = '.';
    } else {
      path = await prompt('Plugin path', '.');

      if (!path) {
        console.error(styles.error('\nError: Plugin path is required'));
        process.exit(1);
      }
    }
  }

  try {
    // Import and run the update deps tool directly
    const { updateDepsTool } = await import('./tools/update-deps.js');
    const result = await updateDepsTool({
      path,
      major: false, // Only minor/patch updates by default
      interactive: false,
      dryRun: false,
      install,
      test
    });

    // The tool returns a content array, extract the text
    if (result.content && result.content[0] && result.content[0].text) {
      console.warn(result.content[0].text);
    } else {
      console.warn(styles.error('No update results returned'));
    }
  } catch (error) {
    console.error(chalk.red('Error updating dependencies:'), error.message);
    process.exit(1);
  }
}

// Main CLI logic
switch (command) {
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;

  case 'version':
  case '--version':
  case '-v':
    showVersion();
    break;

  case 'server':
    startServer();
    break;

  case 'config':
    showConfig();
    break;

  case 'scaffold':
    runScaffold(args[1], args[2], args[3]);
    break;

  case 'validate':
    {
      const path = args[1];
      const functional = args.includes('--functional');
      runValidate(path, functional);
    }
    break;

  case 'configs':
    runGenerateConfigs(args[1]);
    break;

  case 'update-deps':
    {
      const path = args[1];
      const install = args.includes('--install');
      const test = args.includes('--test');
      runUpdateDeps(path, install, test);
    }
    break;

  default:
    console.error(styles.error(`Unknown command: ${command}\n`));
    showHelp();
    process.exit(1);
}
