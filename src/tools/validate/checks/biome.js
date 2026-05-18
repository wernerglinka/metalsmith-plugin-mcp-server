import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function checkBiome(pluginPath, results) {
  try {
    await fs.access(path.join(pluginPath, 'biome.json'));
    results.passed.push('✓ Biome configuration found (biome.json)');
  } catch {
    const legacyFiles = [
      'eslint.config.js',
      '.eslintrc.js',
      '.eslintrc.json',
      'prettier.config.js',
      '.prettierrc',
      '.prettierrc.json'
    ];
    const legacy = [];
    for (const file of legacyFiles) {
      try {
        await fs.access(path.join(pluginPath, file));
        legacy.push(file);
      } catch {
        // not present
      }
    }

    if (legacy.length > 0) {
      results.recommendations.push(
        `💡 Legacy lint/format config detected (${legacy.join(', ')}). Consider migrating to Biome. Generate with: npx metalsmith-plugin-mcp-server configs . --configs biome`
      );
    } else {
      results.recommendations.push(
        '💡 Consider adding a Biome configuration for lint + format. Generate with: npx metalsmith-plugin-mcp-server configs . --configs biome'
      );
    }
  }
}
