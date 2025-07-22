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
    } catch (error) {
      // Config file doesn't exist or is invalid, skip it
    }
  }

  return { ...DEFAULT_CONFIG, ...userConfig };
}

const args = process.argv.slice(2);
const command = args[0];

/**
 * Display help information for the CLI
 * Shows available commands, usage examples, and setup instructions
 * @returns {void}
 */
function showHelp() {
  console.log(chalk.bold('\nMetalsmith Plugin MCP Server'));
  console.log(chalk.gray('MCP server for scaffolding and validating high-quality Metalsmith plugins\n'));

  console.log(chalk.bold('Usage:'));
  console.log('  npx metalsmith-plugin-mcp-server <command> [options]\n');

  console.log(chalk.bold('Commands:'));
  console.log('  help                          Show this help message');
  console.log('  server                        Start the MCP server (for AI assistants)');
  console.log('  scaffold <name> <description> [path] Create a new Metalsmith plugin');
  console.log('  validate <path>               Validate an existing plugin');
  console.log('  configs <path>                Generate configuration files\n');

  console.log(chalk.bold('Examples:'));
  console.log('  npx metalsmith-plugin-mcp-server scaffold my-plugin "Processes my files" ./plugins');
  console.log('  npx metalsmith-plugin-mcp-server validate ./metalsmith-existing-plugin');
  console.log('  npx metalsmith-plugin-mcp-server configs ./my-plugin\n');

  console.log(chalk.bold('MCP Server Setup:'));
  console.log('  For use with Claude Desktop or Claude Code, run:');
  console.log('  npx metalsmith-plugin-mcp-server server\n');

  console.log(chalk.gray('For more information, visit:'));
  console.log(chalk.gray('https://github.com/wernerglinka/metalsmith-plugin-mcp-server\n'));
}

/**
 * Start the MCP server for AI assistant integration
 * Spawns the actual MCP server process and handles its lifecycle
 * @returns {void}
 */
function startServer() {
  console.log(chalk.green('Starting MCP server...'));
  console.log(chalk.gray('Configure your AI assistant to connect to this server.\n'));

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
  if (!name) {
    console.error(styles.error('Error: Plugin name is required'));
    console.log('Usage: npx metalsmith-plugin-mcp-server scaffold <name> <description> [path]');
    process.exit(1);
  }

  if (!description) {
    console.error(styles.error('Error: Plugin description is required'));
    console.log('Usage: npx metalsmith-plugin-mcp-server scaffold <name> <description> [path]');
    console.log('Example: npx metalsmith-plugin-mcp-server scaffold my-plugin "Processes my content"');
    process.exit(1);
  }

  // Load user configuration
  const config = await readUserConfig();
  outputPath = outputPath || config.outputPath;

  console.log(styles.success(`Scaffolding plugin: ${name}`));
  console.log(styles.info(`Description: ${description}`));
  console.log(styles.info(`Output path: ${outputPath}\n`));

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

    console.log(styles.success('\n✓ Plugin scaffolded successfully!'));
    console.log(styles.info(`Location: ${result.path}`));
    console.log('\nNext steps:');
    console.log(`  cd ${result.path}`);
    console.log('  npm install');
    console.log('  npm test\n');
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
  if (!path) {
    console.error(chalk.red('Error: Plugin path is required'));
    console.log('Usage: npx metalsmith-plugin-mcp-server validate <path>');
    process.exit(1);
  }

  console.log(chalk.green(`Validating plugin: ${path}\n`));

  try {
    // Import and run the validate tool directly
    const { validatePluginTool } = await import('./tools/validate-plugin.js');
    const result = await validatePluginTool({
      path,
      checks: ['structure', 'tests', 'docs', 'package-json', 'eslint', 'coverage']
    });

    console.log(chalk.bold('Validation Results:\n'));

    if (result.errors.length === 0) {
      console.log(chalk.green('✓ All checks passed!'));
    } else {
      console.log(chalk.red(`✗ ${result.errors.length} issues found:\n`));
      result.errors.forEach((error, index) => {
        console.log(chalk.red(`${index + 1}. ${error}`));
      });
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠ ${result.warnings.length} warnings:\n`));
      result.warnings.forEach((warning, index) => {
        console.log(chalk.yellow(`${index + 1}. ${warning}`));
      });
    }

    console.log();
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
  if (!outputPath) {
    console.error(chalk.red('Error: Output path is required'));
    console.log('Usage: npx metalsmith-plugin-mcp-server configs <path>');
    process.exit(1);
  }

  console.log(chalk.green(`Generating configs in: ${outputPath}\n`));

  try {
    // Import and run the generate configs tool directly
    const { generateConfigsTool } = await import('./tools/generate-configs.js');
    const result = await generateConfigsTool({
      outputPath,
      configs: ['eslint', 'prettier', 'editorconfig', 'gitignore', 'release-it']
    });

    console.log(chalk.green('✓ Configuration files generated:'));
    result.files.forEach((file) => {
      console.log(chalk.gray(`  - ${file}`));
    });
    console.log();
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
