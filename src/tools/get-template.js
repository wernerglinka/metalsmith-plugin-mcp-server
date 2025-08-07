/**
 * Get Template Tool
 *
 * Retrieves the content of a specific template file.
 * This allows Claude to get the exact template content without having to
 * scaffold entire plugins or guess at template structure.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeTemplateName } from '../utils/path-security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get Template Tool Implementation
 */
export async function getTemplateTool(args) {
  try {
    const { template: templateName } = args;

    if (!templateName) {
      throw new Error('Template name is required');
    }

    // Sanitize template name to prevent path traversal
    const sanitizedTemplateName = sanitizeTemplateName(templateName);

    // Build path to template file
    const templatesDir = path.join(__dirname, '../../templates');
    const templatePath = path.join(templatesDir, `${sanitizedTemplateName}.template`);

    // Check if template exists
    try {
      await fs.access(templatePath);
    } catch {
      // List available templates to help user
      const templates = [];
      async function scanForTemplates(dir, prefix = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

          if (entry.isDirectory()) {
            await scanForTemplates(fullPath, relativePath);
          } else if (entry.name.endsWith('.template')) {
            templates.push(relativePath.replace(/\.template$/, ''));
          }
        }
      }

      await scanForTemplates(templatesDir);

      throw new Error(
        `Template "${templateName}" not found. Available templates:\n${templates.map((t) => `  - ${t}`).join('\n')}\n\nUsage: get-template <template-name>`
      );
    }

    // Read template content
    const content = await fs.readFile(templatePath, 'utf8');

    let output = `# Template: ${templateName}\n\n`;
    output += `**Path**: \`templates/${templateName}.template\`\n\n`;
    output += '## Content\n\n';
    output += '```\n';
    output += content;
    output += '\n```\n\n';
    output += '## Usage Notes\n\n';
    output += '- Copy this content exactly as shown\n';
    output += '- Replace any placeholder variables (e.g., {{pluginName}}) as needed\n';
    output += '- Do not modify the structure or create simplified versions\n';
    output += '- This is the official template - use it verbatim\n';

    return {
      content: [
        {
          type: 'text',
          text: output
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting template: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
