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
  type: 'processor',
  features: [],
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
  console.warn('  server                        Start the MCP server (for AI assistants)');
  console.warn('  scaffold [name] [description] [path] Create a new Metalsmith plugin');
  console.warn('  validate [path]               Validate an existing plugin');
  console.warn('  configs [path]                Generate configuration files\n');

  console.warn(chalk.gray('Note: Commands can be run in guided mode by omitting parameters\n'));

  console.warn(chalk.bold('Examples:'));
  console.warn('  npx metalsmith-plugin-mcp-server scaffold my-plugin "Processes my files" ./plugins');
  console.warn('  npx metalsmith-plugin-mcp-server scaffold                  # Guided mode');
  console.warn('  npx metalsmith-plugin-mcp-server validate ./metalsmith-existing-plugin');
  console.warn('  npx metalsmith-plugin-mcp-server configs ./my-plugin\n');

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
      type: config.type,
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
async function runValidate(path) {
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
      checks: ['structure', 'tests', 'docs', 'package-json', 'eslint', 'coverage']
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

// Main CLI logic
switch (command) {
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;

  case 'server':
    startServer();
    break;

  case 'scaffold':
    runScaffold(args[1], args[2], args[3]);
    break;

  case 'validate':
    runValidate(args[1]);
    break;

  case 'configs':
    runGenerateConfigs(args[1]);
    break;

  default:
    console.error(styles.error(`Unknown command: ${command}\n`));
    showHelp();
    process.exit(1);
}
