/**
 * List Templates Tool
 *
 * Lists all available templates that can be retrieved with get-template command.
 * This helps Claude instances understand what templates are available without
 * having to guess or create their own versions.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get all available template files
 */
async function getAvailableTemplates() {
  const templatesDir = path.join(__dirname, '../../templates');
  const templates = [];

  // Recursively scan templates directory
  async function scanDirectory(dir, prefix = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, relativePath);
      } else if (entry.name.endsWith('.template')) {
        // Remove .template extension for cleaner display
        const templateName = relativePath.replace(/\.template$/, '');
        templates.push({
          name: templateName,
          path: relativePath,
          category: relativePath.split('/')[0]
        });
      }
    }
  }

  await scanDirectory(templatesDir);
  return templates;
}

/**
 * List Templates Tool Implementation
 */
export async function listTemplatesTool() {
  try {
    const templates = await getAvailableTemplates();

    // Group templates by category
    const grouped = templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {});

    let output = '# Available Templates\n\n';
    output += 'Use `get-template <name>` to retrieve any of these templates:\n\n';

    for (const [category, templateList] of Object.entries(grouped)) {
      output += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

      for (const template of templateList) {
        output += `- **${template.name}** - \`get-template ${template.name}\`\n`;
      }
      output += '\n';
    }

    output += '## Usage Examples\n\n';
    output += '```bash\n';
    output += '# Get the CLAUDE.md template for AI development context\n';
    output += 'get-template plugin/CLAUDE.md\n\n';
    output += '# Get release configuration\n';
    output += 'get-template configs/release-it.json\n\n';
    output += '# Get ESLint configuration\n';
    output += 'get-template configs/eslint.config.js\n';
    output += '```\n\n';
    output += '**Note**: Always use these official templates rather than creating your own versions.\n';

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
          text: `Error listing templates: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
