import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nunjucks from 'nunjucks';
import { sanitizePath } from '../utils/path-security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MCP tool wrapper for install-claude-md functionality
 * Uses the existing CLI logic but returns MCP-formatted responses
 */
export async function installClaudeMdTool(args) {
  try {
    const { path: userPath = '.', replace = false, dryRun = false } = args;

    // Sanitize the target path to prevent traversal attacks
    const targetPath = sanitizePath(userPath, process.cwd());

    // Get plugin info from package.json if available
    let pluginName = 'your-plugin';
    let pluginDescription = 'A Metalsmith plugin';
    let camelCaseName = 'yourPlugin';

    try {
      const packageJsonPath = path.join(targetPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      if (packageJson.name) {
        pluginName = packageJson.name;
        camelCaseName = pluginName
          .replace(/^metalsmith-/, '') // Remove metalsmith- prefix
          .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
          .replace(/^([a-z])/, (match, letter) => letter.toLowerCase());
      }

      if (packageJson.description) {
        pluginDescription = packageJson.description;
      }
    } catch {
      // No package.json found, use defaults
    }

    // Detect features from dependencies
    const features = [];
    try {
      const packageJsonPath = path.join(targetPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const allDeps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };

      if (allDeps['worker_threads'] || pluginName.includes('worker')) {
        features.push('background-processing');
      }

      // Default to async-processing for modern plugins
      if (!features.length) {
        features.push('async-processing');
      }
    } catch {
      features.push('async-processing');
    }

    // Get the CLAUDE.md template
    const templatePath = path.join(__dirname, '../../templates/plugin/CLAUDE.md.template');
    const templateContent = await fs.readFile(templatePath, 'utf8');

    // Configure Nunjucks
    const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(__dirname, '../../templates')), {
      autoescape: false,
      throwOnUndefined: false
    });

    // Template variables
    const templateVars = {
      name: pluginName,
      description: pluginDescription,
      camelCaseName: camelCaseName,
      features: features,
      hasAsyncProcessing: features.includes('async-processing'),
      hasBackgroundProcessing: features.includes('background-processing'),
      hasMetadataGeneration: features.includes('metadata-generation')
    };

    // Render the template
    const newContent = env.renderString(templateContent, templateVars);

    const claudeFilePath = path.join(targetPath, 'CLAUDE.md');

    // Check if CLAUDE.md already exists
    let existingContent = '';
    let fileExists = false;
    try {
      existingContent = await fs.readFile(claudeFilePath, 'utf8');
      fileExists = true;
    } catch {
      // File doesn't exist
    }

    if (dryRun) {
      // Dry run mode - just show what would happen
      let preview = '';
      if (fileExists && !replace) {
        const mergedContent = smartMergeClaudeMd(existingContent, newContent, {
          hasMcpSection: existingContent.includes('## MCP Server Integration (CRITICAL)')
        });
        preview = `**Dry Run Preview**: Smart merge mode\n\n**Changes that would be made:**\n- Update plugin name references to: ${pluginName}\n- Ensure MCP Server Integration section is present\n- Preserve existing customizations\n\n**Merged content preview:**\n\`\`\`\n${mergedContent.substring(0, 500)}...\n\`\`\``;
      } else {
        const mode = fileExists ? 'Complete replacement' : 'New file creation';
        preview = `**Dry Run Preview**: ${mode}\n\n**File that would be created:**\n\`\`\`\n${newContent.substring(0, 500)}...\n\`\`\``;
      }

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Dry Run: CLAUDE.md Installation Preview

**Plugin**: ${pluginName}
**Description**: ${pluginDescription}
**Features**: ${features.join(', ') || 'none'}
**Target**: ${path.resolve(claudeFilePath)}

${preview}

To apply these changes, run the command without --dry-run flag.`
          }
        ]
      };
    }

    if (fileExists && !replace) {
      // Smart merge mode
      const hasMcpSection = existingContent.includes('## MCP Server Integration (CRITICAL)');
      const mergedContent = smartMergeClaudeMd(existingContent, newContent, { hasMcpSection });

      await fs.writeFile(claudeFilePath, mergedContent, 'utf8');

      return {
        content: [
          {
            type: 'text',
            text: `✅ CLAUDE.md updated successfully with smart merge!

**Plugin**: ${pluginName}
**Description**: ${pluginDescription}
**Features**: ${features.join(', ') || 'none'}
**Mode**: Smart merge (preserved existing customizations)

**What was updated:**
- Ensured MCP Server Integration section is present
- Updated plugin name references
- Preserved your existing customizations
- Added any missing critical sections

**File location**: ${path.resolve(claudeFilePath)}

You can now use: \`npx metalsmith-plugin-mcp-server install-claude-md\` from Claude to add CLAUDE.md files elegantly to any existing plugin project.`
          }
        ]
      };
    } else {
      // New file or replace mode
      await fs.writeFile(claudeFilePath, newContent, 'utf8');

      const mode = fileExists ? 'replaced' : 'created';

      return {
        content: [
          {
            type: 'text',
            text: `✅ CLAUDE.md ${mode} successfully!

**Plugin**: ${pluginName}
**Description**: ${pluginDescription}
**Features**: ${features.join(', ') || 'none'}
**Mode**: ${fileExists ? 'Complete replacement' : 'New file creation'}

**File location**: ${path.resolve(claudeFilePath)}

This CLAUDE.md file provides essential context for AI assistants working on your Metalsmith plugin. It includes:
- MCP server integration instructions  
- Development workflow commands
- Plugin-specific architecture notes
- Quality standards and testing guidelines

You can now ask AI assistants to "check the MCP server for recommendations" and they'll use the proper tools.`
          }
        ]
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error installing CLAUDE.md: ${error.message}\n\nStack trace:\n${error.stack}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Smart merge function (extracted from existing CLI code)
 * Preserves user customizations while ensuring essential MCP sections exist
 */
function smartMergeClaudeMd(existingContent, templateContent, options = {}) {
  const { hasMcpSection = false } = options;

  // If no MCP section exists, add the entire MCP section from template
  if (!hasMcpSection) {
    // Find the MCP section in the template
    const mcpSectionStart = templateContent.indexOf('## MCP Server Integration (CRITICAL)');
    if (mcpSectionStart === -1) {
      return existingContent; // No MCP section in template, return as-is
    }

    // Find the end of the MCP section (next ## heading or end of file)
    const nextSectionRegex = /\n## (?!MCP Server Integration)/g;
    nextSectionRegex.lastIndex = mcpSectionStart;
    const nextSectionMatch = nextSectionRegex.exec(templateContent);
    const mcpSectionEnd = nextSectionMatch ? nextSectionMatch.index : templateContent.length;

    const mcpSection = templateContent.substring(mcpSectionStart, mcpSectionEnd);

    // Insert MCP section after the first heading or at the beginning
    const firstHeadingMatch = existingContent.match(/^# .+$/m);
    if (firstHeadingMatch) {
      const insertPoint = firstHeadingMatch.index + firstHeadingMatch[0].length;
      return `${existingContent.slice(0, insertPoint)}\n\n${mcpSection}\n${existingContent.slice(insertPoint)}`;
    } else {
      return `${mcpSection}\n\n${existingContent}`;
    }
  } else {
    // MCP section exists - replace it with the new version
    const existingMcpStart = existingContent.indexOf('## MCP Server Integration (CRITICAL)');
    const nextSectionRegex = /\n## (?!MCP Server Integration)/g;
    nextSectionRegex.lastIndex = existingMcpStart;
    const nextSectionMatch = nextSectionRegex.exec(existingContent);
    const existingMcpEnd = nextSectionMatch ? nextSectionMatch.index : existingContent.length;

    // Get new MCP section from template
    const templateMcpStart = templateContent.indexOf('## MCP Server Integration (CRITICAL)');
    const templateMcpNextSectionRegex = /\n## (?!MCP Server Integration)/g;
    templateMcpNextSectionRegex.lastIndex = templateMcpStart;
    const templateMcpNextSectionMatch = templateMcpNextSectionRegex.exec(templateContent);
    const templateMcpEnd = templateMcpNextSectionMatch ? templateMcpNextSectionMatch.index : templateContent.length;

    const newMcpSection = templateContent.substring(templateMcpStart, templateMcpEnd);

    // Replace the existing MCP section with the new one
    return existingContent.slice(0, existingMcpStart) + newMcpSection + existingContent.slice(existingMcpEnd);
  }
}
