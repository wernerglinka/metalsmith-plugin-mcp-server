/**
 * Smart-merge an existing CLAUDE.md with the scaffold template, preserving
 * user customizations while ensuring the MCP Server Integration section is
 * present and current.
 *
 * If the existing file has no MCP section, the template's section is
 * inserted after the first `# ` heading (or prepended if the file has no
 * top-level heading).
 *
 * If the existing file already has an MCP section, that section is
 * replaced with the template's version verbatim.
 *
 * Both halves of an MCP section are bounded by the next `## ` heading.
 *
 * @param {string} existingContent - Current CLAUDE.md content (may be empty)
 * @param {string} templateContent - Rendered template content
 * @param {Object} [options]
 * @param {boolean} [options.hasMcpSection] - Whether existingContent
 *   already contains an MCP Server Integration section. If omitted, the
 *   function detects it from existingContent.
 * @returns {string} Merged content
 */
export function smartMergeClaudeMd(existingContent, templateContent, options = {}) {
  const hasMcpSection = options.hasMcpSection ?? existingContent.includes('## MCP Server Integration (CRITICAL)');

  const templateMcpStart = templateContent.indexOf('## MCP Server Integration (CRITICAL)');
  if (templateMcpStart === -1) {
    throw new Error('Template is missing the "## MCP Server Integration (CRITICAL)" section');
  }
  const templateMcpEnd = findSectionEnd(templateContent, templateMcpStart);
  const mcpSection = templateContent.substring(templateMcpStart, templateMcpEnd);

  if (!hasMcpSection) {
    const firstHeadingMatch = existingContent.match(/^# .+$/m);
    if (firstHeadingMatch) {
      const insertPoint = firstHeadingMatch.index + firstHeadingMatch[0].length;
      return `${existingContent.slice(0, insertPoint)}\n\n${mcpSection}\n${existingContent.slice(insertPoint)}`;
    }
    return `${mcpSection}\n\n${existingContent}`;
  }

  const existingMcpStart = existingContent.indexOf('## MCP Server Integration (CRITICAL)');
  const existingMcpEnd = findSectionEnd(existingContent, existingMcpStart);
  return existingContent.slice(0, existingMcpStart) + mcpSection + existingContent.slice(existingMcpEnd);
}

function findSectionEnd(text, sectionStart) {
  const re = /\n## (?!MCP Server Integration)/g;
  re.lastIndex = sectionStart;
  const match = re.exec(text);
  return match ? match.index : text.length;
}
