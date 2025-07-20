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

import { promises as fs } from "fs"; // File system operations (async/await style)
import path from "path"; // Path manipulation utilities
import { fileURLToPath } from "url"; // Convert import.meta.url to file path
import validateNpmPackageName from "validate-npm-package-name"; // Validate npm package names
import chalk from "chalk"; // Colored terminal output

// Our utility functions for template processing
import { copyTemplate } from "../utils/template.js";
import { generatePluginStructure } from "../utils/structure.js";

// Get the directory containing this file (needed for finding templates)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Scaffold a new Metalsmith plugin with enhanced standards
 *
 * This is the main function that Claude calls when using the plugin-scaffold tool.
 * It validates inputs, creates the directory structure, and generates all files.
 *
 * @param {Object} args - Tool arguments from Claude
 * @param {string} args.name - Plugin name (must start with 'metalsmith-')
 * @param {string} args.type - Plugin type (processor, transformer, validator)
 * @param {string[]} args.features - Additional features to include
 * @param {string} args.outputPath - Output directory path
 * @returns {Promise<Object>} MCP tool response object
 */
export async function pluginScaffoldTool(args) {
  // Extract arguments with defaults (ES6 destructuring with default values)
  const { name, type = "processor", features = [], outputPath = ".", license = "MIT" } = args;

  // Validate plugin name using npm's official validation
  const validation = validateNpmPackageName(name);
  if (!validation.validForNewPackages) {
    // Combine errors and warnings into a single array
    const errors = [
      ...(validation.errors || []),
      ...(validation.warnings || []),
    ];

    // Return an MCP error response
    return {
      content: [
        {
          type: "text",
          text: `Invalid plugin name "${name}":\n${errors.join("\n")}`,
        },
      ],
      isError: true, // This tells Claude the operation failed
    };
  }

  // Ensure name follows Metalsmith convention (all plugins should start with 'metalsmith-')
  if (!name.startsWith("metalsmith-")) {
    return {
      content: [
        {
          type: "text",
          text: 'Plugin name must start with "metalsmith-"',
        },
      ],
      isError: true,
    };
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
            type: "text",
            text: `Directory ${pluginPath} already exists. Please remove it or choose a different name.`,
          },
        ],
        isError: true,
      };
    } catch {
      // Directory doesn't exist, which is what we want - proceed with creation
    }

    // Create the main plugin directory (recursive: true creates parent dirs if needed)
    await fs.mkdir(pluginPath, { recursive: true });

    // Generate directory structure based on plugin type and features
    // This creates the subdirectories like src/, test/, src/utils/, etc.
    const structure = generatePluginStructure(type, features);
    await createDirectoryStructure(pluginPath, structure);

    // Prepare template data for rendering
    // These variables will be substituted into template files using {{variableName}} syntax
    const templateData = {
      pluginName: name, // Full plugin name
      pluginType: type, // processor/transformer/validator
      features, // Array of selected features
      functionName: toCamelCase(name.replace("metalsmith-", "")), // camelCase function name
      className: toPascalCase(name.replace("metalsmith-", "")), // PascalCase class name
      description: `A Metalsmith plugin for ${name.replace("metalsmith-", "").replace(/-/g, " ")}`,
      year: new Date().getFullYear(), // Current year for copyright
      license, // Use the license as-is
      author: "Your Name", // Default author, can be customized later

      // Feature flags for conditional template rendering
      hasAsyncProcessing: features.includes("async-processing"),
      hasBackgroundProcessing: features.includes("background-processing"),
      hasMetadataGeneration: features.includes("metadata-generation"),
    };

    /*
     * The plugin generation process involves several steps:
     * 1. Copy and render template files (package.json, README.md, src/index.js, etc.)
     * 2. Generate configuration files (ESLint, Prettier, .gitignore, etc.)
     * 3. Initialize a git repository with an initial commit
     * 4. Generate a directory tree for display to the user
     */

    // Copy and render all template files with our data
    await copyTemplates(pluginPath, type, templateData);

    // Copy license file if requested
    if (license !== "UNLICENSED") {
      await copyLicenseFile(pluginPath, license, templateData);
    } else {
      // Add a warning comment about UNLICENSED
      console.log(chalk.yellow("\n⚠️  Note: UNLICENSED means 'All Rights Reserved'"));
      console.log(chalk.yellow("   No one can use, copy, or distribute your code without explicit permission."));
      console.log(chalk.yellow("   Consider using an open source license like MIT for Metalsmith plugins.\n"));
    }

    // Generate modern configuration files (ESLint flat config, etc.)
    await generateConfigs(pluginPath);

    // Initialize git repository and make initial commit
    await initGitRepo(pluginPath);

    return {
      content: [
        {
          type: "text",
          text: [
            chalk.green(`✓ Successfully created ${name}`),
            "",
            "Plugin structure:",
            await getDirectoryTree(pluginPath),
            "",
            "Next steps:",
            `  cd ${name}`,
            "  npm install",
            "  npm test",
            "  npm run lint",
            "",
            "Available scripts:",
            "  npm test         - Run tests",
            "  npm run coverage - Run tests with coverage",
            "  npm run lint     - Lint code",
            "  npm run format   - Format code",
            "  npm run release  - Create a new release",
            "",
            "Development workflow:",
            "  1. Make your changes in src/index.js",
            "  2. Add tests in test/index.test.js",
            "  3. Run npm test to verify functionality",
            "  4. Run npm run lint to check code style",
            "  5. Run npm run format to auto-format code",
            "",
            "Happy coding! 🚀",
          ].join("\n"),
        },
      ],
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
          type: "text",
          text: `Failed to scaffold plugin: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Create directory structure recursively
 */
async function createDirectoryStructure(basePath, structure) {
  for (const [name, content] of Object.entries(structure)) {
    const fullPath = path.join(basePath, name);

    if (typeof content === "object" && content !== null) {
      await fs.mkdir(fullPath, { recursive: true });
      await createDirectoryStructure(fullPath, content);
    }
  }
}

/**
 * Copy and render template files
 */
async function copyTemplates(pluginPath, type, data) {
  const templatesDir = path.join(__dirname, "../../templates/plugin");

  // Copy common templates
  await copyTemplate(
    path.join(templatesDir, "package.json.template"),
    path.join(pluginPath, "package.json"),
    data,
  );

  await copyTemplate(
    path.join(templatesDir, "README.md.template"),
    path.join(pluginPath, "README.md"),
    data,
  );

  await copyTemplate(
    path.join(templatesDir, "index.js.template"),
    path.join(pluginPath, "src/index.js"),
    data,
  );

  // Copy type-specific templates
  const typeTemplatesDir = path.join(templatesDir, "types", type);
  if (await fs.stat(typeTemplatesDir).catch(() => false)) {
    await copyTypeSpecificTemplates(typeTemplatesDir, pluginPath, data);
  }

  // Copy test templates
  await copyTemplate(
    path.join(templatesDir, "test.js.template"),
    path.join(pluginPath, "test/index.test.js"),
    data,
  );

  // Copy test fixtures
  await copyTestFixtures(templatesDir, pluginPath, data);
}

/**
 * Copy type-specific template files
 */
async function copyTypeSpecificTemplates(sourceDir, targetDir, data) {
  const files = await fs.readdir(sourceDir);

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(
      targetDir,
      "src",
      file.replace(".template", ""),
    );

    await copyTemplate(sourcePath, targetPath, data);
  }
}

/**
 * Copy test fixture files
 */
async function copyTestFixtures(templatesDir, targetDir, data) {
  const fixturesDir = path.join(templatesDir, "fixtures");

  try {
    const fixtureCategories = await fs.readdir(fixturesDir);

    for (const category of fixtureCategories) {
      const categoryPath = path.join(fixturesDir, category);
      const stats = await fs.stat(categoryPath);

      if (stats.isDirectory()) {
        const targetCategoryPath = path.join(
          targetDir,
          "test/fixtures",
          category,
        );
        await fs.mkdir(targetCategoryPath, { recursive: true });

        // Copy files from this fixture category
        const files = await fs.readdir(categoryPath);
        for (const file of files) {
          const sourcePath = path.join(categoryPath, file);
          const targetPath = path.join(
            targetCategoryPath,
            file.replace(".template", ""),
          );

          if (file.endsWith(".template")) {
            await copyTemplate(sourcePath, targetPath, data);
          } else {
            await fs.copyFile(sourcePath, targetPath);
          }
        }
      }
    }
  } catch (error) {
    // Fixtures are optional, don't fail if they don't exist
    console.error("Warning: Could not copy test fixtures:", error.message);
  }
}

/**
 * Copy license file with template rendering
 */
async function copyLicenseFile(pluginPath, license, data) {
  const licensesDir = path.join(__dirname, "../../templates/licenses");
  const licenseTemplate = path.join(licensesDir, `${license}.template`);
  const targetPath = path.join(pluginPath, "LICENSE");
  
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
  const configsDir = path.join(__dirname, "../../templates/configs");

  // Copy configuration files
  const configs = [
    ["eslint.config.js.template", "eslint.config.js"],
    ["prettier.config.js.template", "prettier.config.js"],
    [".editorconfig.template", ".editorconfig"],
    [".gitignore.template", ".gitignore"],
    ["release-it.json.template", ".release-it.json"],
  ];

  for (const [source, target] of configs) {
    await fs.copyFile(
      path.join(configsDir, source),
      path.join(pluginPath, target),
    );
  }
}

/**
 * Initialize git repository
 */
async function initGitRepo(pluginPath) {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  try {
    await execAsync("git init", { cwd: pluginPath });
    await execAsync("git add .", { cwd: pluginPath });
    await execAsync('git commit -m "Initial commit"', { cwd: pluginPath });
  } catch (error) {
    // Git init is optional, don't fail if it doesn't work
    console.error("Failed to initialize git repository:", error.message);
  }
}

/**
 * Get directory tree for display
 */
async function getDirectoryTree(dirPath, prefix = "") {
  const items = await fs.readdir(dirPath);
  const tree = [];

  for (const [index, item] of items.entries()) {
    const itemPath = path.join(dirPath, item);
    const stats = await fs.stat(itemPath);
    const isLast = index === items.length - 1;
    const connector = isLast ? "└── " : "├── ";

    tree.push(prefix + connector + item);

    if (stats.isDirectory() && !["node_modules", ".git"].includes(item)) {
      const subTree = await getDirectoryTree(
        itemPath,
        prefix + (isLast ? "    " : "│   "),
      );
      tree.push(...subTree);
    }
  }

  return tree.join("\n");
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str) {
  return str
    .split("-")
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join("");
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str) {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}
