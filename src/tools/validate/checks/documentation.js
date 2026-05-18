import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function checkDocumentation(pluginPath, results, config) {
  try {
    const readmePath = path.join(pluginPath, 'README.md');
    const readme = await fs.readFile(readmePath, 'utf-8');

    const requiredSections =
      config?.rules?.documentation?.requiredSections?.map((name) => ({
        pattern: new RegExp(`#{1,4}\\s+.*${name}`, 'i'),
        name
      })) || [];

    const recommendedSections = config?.rules?.documentation?.recommendedSections?.map((name) => ({
      pattern: new RegExp(`#{1,4}\\s+.*${name}`, 'i'),
      name
    })) || [
      { pattern: /#{1,4}\s+.*Install/i, name: 'Installation' },
      { pattern: /#{1,4}\s+.*Usage/i, name: 'Usage' },
      { pattern: /#{1,4}\s+.*Options/i, name: 'Options' },
      { pattern: /#{1,4}\s+.*Examples?/i, name: 'Example/Examples' }
    ];

    for (const section of requiredSections) {
      if (section.pattern.test(readme)) {
        results.passed.push(`✓ README includes required ${section.name} section`);
      } else {
        results.failed.push(`✗ README missing required ${section.name} section`);
      }
    }

    for (const section of recommendedSections) {
      if (section.pattern.test(readme)) {
        results.passed.push(`✓ README includes ${section.name} section`);
      } else {
        if (config?.recommendations?.templateSuggestions !== false) {
          results.recommendations.push(
            `💡 Consider adding ${section.name} section to README. See template: templates/plugin/README.md.template`
          );
        } else {
          results.recommendations.push(`💡 Consider adding ${section.name} section to README`);
        }
      }
    }

    if (readme.includes('![')) {
      results.passed.push('✓ README includes badges');
    } else {
      results.recommendations.push(
        '💡 Consider adding badges to README. Common badges: npm version, build status, coverage. See README template'
      );
    }

    if (readme.includes('```')) {
      results.passed.push('✓ README includes code examples');
    } else {
      results.recommendations.push(
        '💡 Consider adding code examples to README. The README template includes examples: templates/plugin/README.md.template'
      );
    }

    try {
      await fs.access(path.join(pluginPath, 'LICENSE'));
      results.passed.push('✓ LICENSE file exists');
    } catch {
      results.recommendations.push(
        `💡 Consider adding a LICENSE file. Generate one with: npx metalsmith-plugin-mcp-server scaffold ${
          pluginPath
        } LICENSE <license-type>`
      );
    }
  } catch (error) {
    results.failed.push(`✗ Error checking documentation: ${error.message}`);
  }
}
