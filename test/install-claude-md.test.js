import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import os from 'os';

// Import the smartMergeClaudeMd function from cli.js
import { readFile } from 'fs/promises';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// We need to extract the smartMergeClaudeMd function from cli.js for testing
// Since it's not exported, we'll test it through a different approach
async function getSmartMergeFunction() {
  const cliPath = join(__dirname, '..', 'src', 'cli.js');
  const cliContent = await readFile(cliPath, 'utf8');

  // Extract the function using regex
  const funcMatch = cliContent.match(/function smartMergeClaudeMd\([\s\S]*?\n\}\n/);
  if (!funcMatch) {
    throw new Error('Could not extract smartMergeClaudeMd function');
  }

  // Create a module that exports this function
  const moduleContent = `${funcMatch[0]}\nexport { smartMergeClaudeMd };`;

  // Write to a temporary file and import it
  const tempFile = join(os.tmpdir(), `smartMerge-${Date.now()}.mjs`);
  await fs.writeFile(tempFile, moduleContent);

  const module = await import(tempFile);
  await fs.unlink(tempFile); // Clean up

  return module.smartMergeClaudeMd;
}

describe('install-claude-md functionality', function () {
  let smartMergeClaudeMd;
  let tempDir;

  before(async function () {
    smartMergeClaudeMd = await getSmartMergeFunction();
    tempDir = join(os.tmpdir(), `mcp-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  after(async function () {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should correctly merge MCP section with existing content', function () {
    // Template content with full MCP section
    const templateContent = `# Plugin Name - Development Context

## Project Overview

This is a Metalsmith plugin.

## MCP Server Integration (CRITICAL)

**IMPORTANT**: This plugin was created with \`metalsmith-plugin-mcp-server\`.

### Essential MCP Commands

\`\`\`bash
# List all available templates
list-templates

# Get specific template content
get-template plugin/CLAUDE.md
\`\`\`

### CRITICAL RULES for AI Assistants

1. **ALWAYS use MCP server templates verbatim**
2. **NEVER improvise**

## Quick Commands

Some other section content.`;

    // Existing content without MCP section
    const existingContent = `# Metalsmith Sectioned Blog Pagination - Development Guide

This plugin generates paginated blog landing pages.

## Quick Commands

\`\`\`bash
# Development
npm test
\`\`\`

## Plugin Overview

This plugin creates blog pagination metadata.`;

    const result = smartMergeClaudeMd(existingContent, templateContent, { hasMcpSection: false });

    // Verify the MCP section was added
    expect(result).to.include('## MCP Server Integration (CRITICAL)');
    expect(result).to.include('### Essential MCP Commands');
    expect(result).to.include('### CRITICAL RULES for AI Assistants');
    expect(result).to.include('list-templates');

    // Verify existing content is preserved
    expect(result).to.include('Metalsmith Sectioned Blog Pagination - Development Guide');
    expect(result).to.include('This plugin generates paginated blog landing pages');
    expect(result).to.include('## Plugin Overview');
  });

  it('should update existing MCP section correctly', function () {
    const templateContent = `# Plugin Name

## MCP Server Integration (CRITICAL)

**IMPORTANT**: Updated MCP content.

### Essential MCP Commands

New commands here.

### CRITICAL RULES for AI Assistants

New rules here.

## Other Section

Other content.`;

    const existingContent = `# My Plugin

## MCP Server Integration (CRITICAL)

Old MCP content.

## Quick Commands

My quick commands.`;

    const result = smartMergeClaudeMd(existingContent, templateContent, { hasMcpSection: true });

    // Verify MCP section was replaced with new content
    expect(result).to.include('**IMPORTANT**: Updated MCP content');
    expect(result).to.include('### Essential MCP Commands');
    expect(result).to.include('New commands here');
    expect(result).to.not.include('Old MCP content');

    // Verify other sections are preserved
    expect(result).to.include('## Quick Commands');
    expect(result).to.include('My quick commands');
  });

  it('should handle complete MCP section with all subsections', function () {
    // This tests that all MCP subsections are properly included in the merge
    const templateContent = `# {{ name }} - Development Context

## Project Overview

This is a Metalsmith plugin.

## MCP Server Integration (CRITICAL)

**IMPORTANT**: This plugin was created with \`metalsmith-plugin-mcp-server\`. When working on this plugin, AI assistants (Claude) MUST use the MCP server tools rather than creating their own implementations.

### Essential MCP Commands

\`\`\`bash
# List all available templates
list-templates

# Get specific template content (use these exactly as provided)
get-template plugin/CLAUDE.md
get-template configs/release-it.json
get-template configs/eslint.config.js

# Validate plugin and get actionable recommendations
validate .

# Generate configuration files
configs .
\`\`\`

### CRITICAL RULES for AI Assistants

1. **ALWAYS use MCP server templates verbatim** - Never create simplified versions
2. **ALWAYS use \`list-templates\` first** to see what's available

## Quick Commands

Other commands here.`;

    const beforeContent = `# Metalsmith Sectioned Blog Pagination - Development Guide

This plugin generates paginated blog landing pages for Metalsmith sites using a modular page building paradigm.

## Quick Commands

\`\`\`bash
# Development
npm test           # Run all tests
npm run coverage   # Generate coverage report
\`\`\`

## Plugin Overview

This plugin creates blog pagination metadata that works with sectioned/modular page builders.`;

    const result = smartMergeClaudeMd(beforeContent, templateContent, { hasMcpSection: false });

    // The entire MCP section should be present
    expect(result).to.include('## MCP Server Integration (CRITICAL)');
    expect(result).to.include('### Essential MCP Commands');
    expect(result).to.include('list-templates');
    expect(result).to.include('get-template plugin/CLAUDE.md');
    expect(result).to.include('### CRITICAL RULES for AI Assistants');
    expect(result).to.include('**ALWAYS use MCP server templates verbatim**');

    // Original content should still be there
    expect(result).to.include('Metalsmith Sectioned Blog Pagination - Development Guide');
    expect(result).to.include('npm test           # Run all tests');
  });
});
