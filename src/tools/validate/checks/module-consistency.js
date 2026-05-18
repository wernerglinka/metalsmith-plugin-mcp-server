import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Check that README examples use ESM (the scaffold is ESM-only). Flags
 * `require()`, `module.exports`, `exports.`, `__dirname`, `__filename`
 * anywhere in README code blocks so users never copy-paste broken CJS.
 */
export async function checkModuleConsistency(pluginPath, results) {
  try {
    const readmePath = path.join(pluginPath, 'README.md');

    try {
      const readme = await fs.readFile(readmePath, 'utf-8');
      const codeBlocks = readme.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/g) || [];

      const cjsHits = new Set();
      let hasESMPatterns = false;

      for (const block of codeBlocks) {
        const content = block.replace(/```(?:javascript|js)?\n|\n```/g, '');

        if (/\brequire\s*\(/.test(content)) {
          cjsHits.add('require()');
        }
        if (/module\.exports|(^|\s)exports\./.test(content)) {
          cjsHits.add('module.exports/exports.*');
        }
        if (/\b__dirname\b/.test(content)) {
          cjsHits.add('__dirname');
        }
        if (/\b__filename\b/.test(content)) {
          cjsHits.add('__filename');
        }
        if (/import\s+.*from|export\s+.*from|export\s+default|export\s+\{/.test(content)) {
          hasESMPatterns = true;
        }
      }

      if (cjsHits.size > 0) {
        const tokens = Array.from(cjsHits).join(', ');
        results.failed.push(`✗ README code blocks contain CommonJS syntax (${tokens}) — scaffold is ESM-only`);
        results.recommendations.push(
          '💡 Rewrite README examples in ESM: replace `require()` with `import`, `module.exports` with `export`, and `__dirname` with `import.meta.dirname`'
        );
      } else if (hasESMPatterns) {
        results.passed.push('✓ README examples use ESM syntax');
      }

      try {
        const packageJson = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));
        const isESM = packageJson.type === 'module';
        if (!isESM) {
          results.failed.push('✗ package.json is missing "type": "module" — scaffold is ESM-only');
          results.recommendations.push('💡 Add `"type": "module"` to package.json and remove any CJS build output');
        }
      } catch {
        // package.json read failure surfaced elsewhere
      }
    } catch {
      results.warnings.push('⚠ Could not read README.md to check module consistency');
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check module consistency: ${error.message}`);
  }
}
