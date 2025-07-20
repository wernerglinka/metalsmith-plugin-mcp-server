/**
 * Template File Processing Utilities
 *
 * These functions handle copying and rendering template files during plugin generation.
 * Template files contain placeholders like {{pluginName}} that get replaced with actual values.
 *
 * The process:
 * 1. Read a .template file from the templates directory
 * 2. Replace placeholders with real data
 * 3. Write the rendered content to the target location
 */

import { promises as fs } from "fs"; // File system operations
import path from "path"; // Path manipulation
import { render } from "./render.js"; // Our template rendering functions

/**
 * Copy a template file and render it with data
 *
 * This is the core function for processing individual template files.
 * It reads a template, renders it with provided data, and writes the result.
 *
 * @param {string} sourcePath - Source template path (e.g., 'package.json.template')
 * @param {string} targetPath - Target file path (e.g., 'package.json')
 * @param {Object} data - Template data for variable substitution
 */
export async function copyTemplate(sourcePath, targetPath, data) {
  // Ensure the target directory exists before writing the file
  // recursive: true creates parent directories if they don't exist
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  // Read the template file content as UTF-8 text
  const template = await fs.readFile(sourcePath, "utf-8");

  // Replace all placeholders with actual values
  const rendered = render(template, data);

  // Write the rendered content to the target location
  await fs.writeFile(targetPath, rendered);
}

/**
 * Copy multiple templates from a directory
 * @param {string} sourceDir - Source directory
 * @param {string} targetDir - Target directory
 * @param {Object} data - Template data
 * @param {Object} options - Options
 * @param {boolean} options.recursive - Copy recursively
 */
export async function copyTemplateDirectory(
  sourceDir,
  targetDir,
  data,
  options = {},
) {
  const { recursive = false } = options;

  const items = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const item of items) {
    const sourcePath = path.join(sourceDir, item.name);
    const targetName = item.name.replace(".template", "");
    const targetPath = path.join(targetDir, targetName);

    if (item.isDirectory() && recursive) {
      await copyTemplateDirectory(sourcePath, targetPath, data, options);
    } else if (item.isFile() && item.name.endsWith(".template")) {
      await copyTemplate(sourcePath, targetPath, data);
    }
  }
}
