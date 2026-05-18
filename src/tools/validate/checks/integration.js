import { promises as fs } from 'node:fs';
import path from 'node:path';
import { glob } from 'node:fs/promises';

export async function checkIntegration(pluginPath, results) {
  try {
    const mainFilePath = path.join(pluginPath, 'src/index.js');
    const mainFileContent = await fs.readFile(mainFilePath, 'utf-8');

    const respectsMetadata = /files\[.*?\]\.(?!contents)/g.test(mainFileContent);
    const modifiesMetadata = /files\[.*?\]\.\w+\s*=|Object\.assign\(files\[.*?\]/.test(mainFileContent);

    if (respectsMetadata || modifiesMetadata) {
      results.passed.push('✓ Plugin respects/modifies file metadata appropriately');
    } else {
      results.recommendations.push(
        '💡 Ensure plugin works with file metadata from other plugins (e.g., frontmatter, collections)'
      );
    }

    const usesGlobalMetadata = /metalsmith\.metadata\(\)/.test(mainFileContent);
    if (usesGlobalMetadata) {
      results.passed.push('✓ Plugin accesses global metadata');
    } else {
      results.recommendations.push('💡 Consider using metalsmith.metadata() to access site-wide information');
    }

    const commonPluginPatterns = [
      { name: 'layouts', pattern: /layout|template/, check: 'layout property handling' },
      { name: 'collections', pattern: /collection|group/, check: 'collection membership' },
      { name: 'markdown', pattern: /\.md|markdown/, check: 'markdown file processing' },
      { name: 'frontmatter', pattern: /frontmatter|yaml|title|date/, check: 'frontmatter data usage' }
    ];

    for (const plugin of commonPluginPatterns) {
      if (plugin.pattern.test(mainFileContent)) {
        results.passed.push(`✓ Plugin appears compatible with ${plugin.name} (${plugin.check})`);
      }
    }

    const hasExtensionLogic = /\.endsWith\(|path\.extname|\.ext\b|\.extension/.test(mainFileContent);
    if (hasExtensionLogic) {
      results.passed.push('✓ Plugin handles file extensions properly');
    } else {
      results.recommendations.push('💡 Consider adding file extension validation for better plugin integration');
    }

    const hasOrderingDocs = await checkForOrderingDocumentation(pluginPath);
    if (hasOrderingDocs) {
      results.passed.push('✓ Plugin documentation includes ordering considerations');
    } else {
      results.recommendations.push('💡 Document plugin ordering requirements in README (before/after other plugins)');
    }

    const testFiles = await Array.fromAsync(glob('test/**/*.{js,cjs,mjs}', { cwd: pluginPath }));
    let hasIntegrationTests = false;

    for (const testFile of testFiles) {
      try {
        const testContent = await fs.readFile(path.join(pluginPath, testFile), 'utf-8');
        if (/metalsmith-|@metalsmith\/|layouts|markdown|collections/.test(testContent)) {
          hasIntegrationTests = true;
          break;
        }
      } catch {
        // continue
      }
    }

    if (hasIntegrationTests) {
      results.passed.push('✓ Integration tests with other plugins detected');
    } else {
      results.recommendations.push('💡 Consider adding integration tests with common Metalsmith plugins');
    }

    try {
      const readmePath = path.join(pluginPath, 'README.md');
      const readme = await fs.readFile(readmePath, 'utf-8');

      const hasPipelineExample = /\.use\([^)]*\)[\s\S]*\.use\([^)]*\)/.test(readme);
      if (hasPipelineExample) {
        results.passed.push('✓ README includes plugin pipeline examples');
      } else {
        results.recommendations.push(
          '💡 Add complete Metalsmith pipeline examples to README showing integration with other plugins'
        );
      }

      const mentionsCommonPlugins = /@metalsmith\/|metalsmith-layouts|metalsmith-markdown|metalsmith-collections/.test(
        readme
      );
      if (mentionsCommonPlugins) {
        results.passed.push('✓ Documentation references common Metalsmith plugins');
      } else {
        results.recommendations.push('💡 Consider mentioning compatibility with common plugins in documentation');
      }
    } catch {
      // could not read README
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check integration patterns: ${error.message}`);
  }
}

async function checkForOrderingDocumentation(pluginPath) {
  try {
    const readme = await fs.readFile(path.join(pluginPath, 'README.md'), 'utf-8');
    return /order|before|after|sequence|pipeline|placement|position/i.test(readme);
  } catch {
    return false;
  }
}
