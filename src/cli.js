#!/usr/bin/env node

/**
 * CLI wrapper for the Metalsmith Plugin MCP Server
 *
 * This provides a command-line interface for using the MCP server tools
 * without requiring an AI assistant setup.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
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
  console.warn('  show-template [type]          Display recommended configuration templates');
  console.warn('  list-templates                List all available templates');
  console.warn('  get-template [name]           Get specific template content (e.g., plugin/CLAUDE.md)');
  console.warn('  install-claude-md [path] [--replace] [--dry-run] Install CLAUDE.md with AI assistant instructions');
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
  console.warn('  npx metalsmith-plugin-mcp-server show-template release-it  # Show .release-it.json template');
  console.warn('  npx metalsmith-plugin-mcp-server list-templates            # Show all available templates');
  console.warn('  npx metalsmith-plugin-mcp-server get-template plugin/CLAUDE.md # Get CLAUDE.md template');
  console.warn('  npx metalsmith-plugin-mcp-server install-claude-md         # Smart merge CLAUDE.md in current dir');
  console.warn('  npx metalsmith-plugin-mcp-server install-claude-md --replace # Replace existing CLAUDE.md');
  console.warn('  npx metalsmith-plugin-mcp-server install-claude-md --dry-run # Preview changes without applying');
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

    // The tool returns a content array, extract the text
    if (result.content && result.content[0] && result.content[0].text) {
      console.warn(result.content[0].text);
    } else {
      console.warn(styles.success('\n✓ Configuration files generated successfully!'));
    }
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
 * Show recommended configuration templates
 * Displays the recommended configuration for various file types
 * @param {string} template - Template type to display
 * @returns {Promise<void>}
 */
async function runShowTemplate(template) {
  // Interactive mode if template is missing
  if (!template) {
    console.warn(styles.header('\nShow configuration template\n'));
    console.warn('Available templates:');
    console.warn('  release-it      - .release-it.json with secure GitHub token handling');
    console.warn('  package-scripts - package.json scripts for secure releases');
    console.warn('  eslint          - eslint.config.js modern flat config');
    console.warn('  prettier        - prettier.config.js formatting rules');
    console.warn('  gitignore       - .gitignore for Metalsmith plugins');
    console.warn('  editorconfig    - .editorconfig for consistent coding style\n');

    template = await prompt('Template type');

    if (!template) {
      console.error(styles.error('\nError: Template type is required'));
      process.exit(1);
    }
  }

  const validTemplates = ['release-it', 'package-scripts', 'eslint', 'prettier', 'gitignore', 'editorconfig'];
  if (!validTemplates.includes(template)) {
    console.error(styles.error(`\nError: Invalid template type. Valid options: ${validTemplates.join(', ')}`));
    process.exit(1);
  }

  try {
    // Import and run the show template tool directly
    const { showTemplateTool } = await import('./tools/show-template.js');
    const result = await showTemplateTool({ template });

    // The tool returns a content array, extract the text
    if (result.content && result.content[0] && result.content[0].text) {
      console.warn(result.content[0].text);
    } else {
      console.warn(styles.error('No template content returned'));
    }
  } catch (error) {
    console.error(styles.error('Error showing template:'), error.message);
    process.exit(1);
  }
}

/**
 * List all available templates
 * Shows all templates that can be retrieved with get-template
 * @returns {Promise<void>}
 */
async function runListTemplates() {
  try {
    // Import and run the list templates tool directly
    const { listTemplatesTool } = await import('./tools/list-templates.js');
    const result = await listTemplatesTool();

    // The tool returns a content array, extract the text
    if (result.content && result.content[0] && result.content[0].text) {
      console.warn(result.content[0].text);
    } else {
      console.error(styles.error('No template list returned'));
    }
  } catch (error) {
    console.error(styles.error('Error listing templates:'), error.message);
    process.exit(1);
  }
}

/**
 * Get specific template content
 * Retrieves the exact content of a specific template file
 * @param {string} template - Template name (e.g., "plugin/CLAUDE.md")
 * @returns {Promise<void>}
 */
async function runGetTemplate(template) {
  // Interactive mode if template is missing
  if (!template) {
    console.warn(styles.header('\nGet template content\n'));
    console.warn('Use "list-templates" to see all available templates.\n');
    console.warn('Examples:');
    console.warn('  plugin/CLAUDE.md        - AI development context');
    console.warn('  configs/release-it.json - Release configuration');
    console.warn('  configs/eslint.config.js- ESLint configuration\n');

    template = await prompt('Template name (e.g., plugin/CLAUDE.md)');

    if (!template) {
      console.error(styles.error('\nError: Template name is required'));
      process.exit(1);
    }
  }

  try {
    // Import and run the get template tool directly
    const { getTemplateTool } = await import('./tools/get-template.js');
    const result = await getTemplateTool({ template });

    // The tool returns a content array, extract the text
    if (result.content && result.content[0] && result.content[0].text) {
      console.warn(result.content[0].text);
    } else {
      console.error(styles.error('No template content returned'));
    }
  } catch (error) {
    console.error(styles.error('Error getting template:'), error.message);
    process.exit(1);
  }
}

/**
 * Install CLAUDE.md template directly into a plugin directory
 * Supports smart merging with existing CLAUDE.md files to preserve project-specific content
 * @param {string} targetPath - Path where to install CLAUDE.md (defaults to current directory)
 * @param {Object} options - Installation options
 * @param {boolean} options.replace - Force full replacement instead of smart merge
 * @param {boolean} options.dryRun - Show what would be changed without making changes
 * @returns {Promise<void>}
 */
async function runInstallClaudeMd(targetPath = '.', options = {}) {
  const { replace = false, dryRun = false } = options;

  try {
    console.warn(
      styles.header(dryRun ? '\nDry run: CLAUDE.md template analysis\n' : '\nInstalling CLAUDE.md template\n')
    );

    // Get the plugin name from package.json if available
    let pluginName = 'your-plugin';
    let pluginDescription = 'A Metalsmith plugin';
    let camelCaseName = 'yourPlugin';

    try {
      const packageJsonPath = path.join(targetPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      if (packageJson.name) {
        pluginName = packageJson.name;
        // Convert kebab-case to camelCase for function names
        camelCaseName = pluginName
          .replace(/^metalsmith-/, '') // Remove metalsmith- prefix
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      }

      if (packageJson.description) {
        pluginDescription = packageJson.description;
      }
    } catch {
      // If no package.json or can't read it, use defaults
      console.warn(styles.warning('Note: Could not read package.json, using default values'));
    }

    const claudemdPath = path.join(targetPath, 'CLAUDE.md');
    let existingContent = null;
    let hasMcpSection = false;

    // Check if CLAUDE.md already exists
    try {
      existingContent = await fs.readFile(claudemdPath, 'utf8');
      hasMcpSection = /## MCP Server Integration|### MCP|Essential MCP Commands/i.test(existingContent);

      console.warn(styles.info(`Found existing CLAUDE.md (${existingContent.length} characters)`));
      console.warn(styles.info(`Has MCP section: ${hasMcpSection ? 'Yes' : 'No'}`));
    } catch {
      // File doesn't exist
      console.warn(styles.info('No existing CLAUDE.md found'));
    }

    // Get the MCP template content
    const { getTemplateTool } = await import('./tools/get-template.js');
    const result = await getTemplateTool({ template: 'plugin/CLAUDE.md' });

    if (!result.content || !result.content[0] || !result.content[0].text) {
      throw new Error('Could not retrieve CLAUDE.md template');
    }

    // Extract just the template content (remove the wrapper text)
    const fullOutput = result.content[0].text;
    // Use more specific regex to match the content section, not internal code blocks
    const contentMatch = fullOutput.match(/## Content\n\n```\n([\s\S]*?)\n```\n\n## Usage Notes/);

    if (!contentMatch) {
      throw new Error('Could not extract template content');
    }

    let templateContent = contentMatch[1];

    // Replace template variables only - leave code blocks untouched
    templateContent = templateContent
      .replace(/\{\{\s*name\s*\}\}/g, pluginName)
      .replace(/\{\{\s*description\s*\}\}/g, pluginDescription)
      .replace(/\{\{\s*camelCaseName\s*\}\}/g, camelCaseName);

    // No conditional processing - this is markdown with code examples, not a nunjucks template

    let finalContent;
    let operation;

    if (!existingContent) {
      // No existing file - create new
      finalContent = templateContent;
      operation = 'create';
    } else if (replace) {
      // Force full replacement
      finalContent = templateContent;
      operation = 'replace';
    } else {
      // Smart merge
      finalContent = smartMergeClaudeMd(existingContent, templateContent, { hasMcpSection });
      operation = 'merge';
    }

    if (dryRun) {
      console.warn(styles.info(`\nOperation: ${operation}`));
      console.warn(styles.info(`Final content length: ${finalContent.length} characters`));

      if (existingContent) {
        console.warn(styles.info(`Original length: ${existingContent.length} characters`));
        console.warn(
          styles.info(
            `Change: ${finalContent.length - existingContent.length > 0 ? '+' : ''}${finalContent.length - existingContent.length} characters`
          )
        );
      }

      console.warn(styles.warning('\nPreview of changes (first 500 characters):'));
      console.warn(styles.info(finalContent.substring(0, 500) + (finalContent.length > 500 ? '...' : '')));
      console.warn(styles.info('\nUse without --dry-run to apply changes'));
      return;
    }

    // Handle existing file confirmation
    if (existingContent && !replace) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const message = hasMcpSection
        ? 'Update existing CLAUDE.md with latest MCP guidance? (Y/n) '
        : 'Add MCP Server integration to existing CLAUDE.md? (Y/n) ';

      const answer = await new Promise((resolve) => {
        rl.question(message, resolve);
      });

      rl.close();

      if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
        console.warn(styles.info('Installation cancelled'));
        return;
      }
    }

    await fs.writeFile(claudemdPath, finalContent, 'utf8');

    const actionWord = operation === 'create' ? 'created' : operation === 'replace' ? 'replaced' : 'updated';
    console.warn(styles.success(`✓ CLAUDE.md ${actionWord} successfully at ${claudemdPath}`));

    if (operation === 'merge') {
      console.warn(styles.info('✓ Preserved existing project-specific content'));
      console.warn(
        styles.info(
          hasMcpSection ? '✓ Updated MCP Server integration section' : '✓ Added MCP Server integration section'
        )
      );
    }

    console.warn(styles.info('\nNext steps:'));
    console.warn(
      '1. Add the MCP server to Claude: claude mcp add metalsmith-plugin npx "metalsmith-plugin-mcp-server@latest" "server"'
    );
    console.warn('2. Ask Claude to review CLAUDE.md for full context');
    console.warn('3. Claude will now have all the instructions to use the MCP server properly\n');
  } catch (error) {
    console.error(styles.error('Error installing CLAUDE.md:'), error.message);
    process.exit(1);
  }
}

/**
 * Smart merge existing CLAUDE.md content with MCP template
 * Preserves project-specific content while adding/updating MCP guidance
 * @param {string} existingContent - Current CLAUDE.md content
 * @param {string} templateContent - New template content
 * @param {Object} context - Merge context information
 * @returns {string} Merged content
 */
function smartMergeClaudeMd(existingContent, templateContent, context = {}) {
  const { hasMcpSection } = context;

  // Extract the MCP section from template
  // Match everything from "## MCP Server Integration" until the next ## heading or end of content
  const mcpSectionMatch = templateContent.match(/(## MCP Server Integration \(CRITICAL\)[\s\S]*?)(?=\n## |$)/);
  const mcpSection = mcpSectionMatch ? mcpSectionMatch[1] : '';

  if (!mcpSection) {
    throw new Error('Could not extract MCP section from template');
  }

  let mergedContent;

  if (hasMcpSection) {
    // Replace existing MCP section with updated one
    mergedContent = existingContent.replace(/(## MCP Server Integration[\s\S]*?)(?=\n## |$)/i, `${mcpSection}\n`);
  } else {
    // Add MCP section after the project overview (or at the beginning)
    const overviewMatch = existingContent.match(/(## Project Overview[\s\S]*?)(?=\n## |$)/i);

    if (overviewMatch) {
      // Insert after Project Overview
      mergedContent = existingContent.replace(/(## Project Overview[\s\S]*?)(\n## )/, `$1\n\n${mcpSection}\n$2`);
    } else {
      // Insert at the beginning after the title
      const titleMatch = existingContent.match(/^(# [^\n]*\n)/);
      if (titleMatch) {
        mergedContent = existingContent.replace(/^(# [^\n]*\n)/, `$1\n${mcpSection}\n\n`);
      } else {
        // Just prepend
        mergedContent = `${mcpSection}\n\n${existingContent}`;
      }
    }
  }

  return mergedContent;
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

  case 'show-template':
    runShowTemplate(args[1]);
    break;

  case 'list-templates':
    runListTemplates();
    break;

  case 'get-template':
    runGetTemplate(args[1]);
    break;

  case 'install-claude-md':
    {
      const targetPath = args[1];
      const replace = args.includes('--replace');
      const dryRun = args.includes('--dry-run');
      runInstallClaudeMd(targetPath, { replace, dryRun });
    }
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
