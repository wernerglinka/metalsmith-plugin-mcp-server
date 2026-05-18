import { promises as fs } from 'node:fs';
import path from 'node:path';
import { glob } from 'node:fs/promises';

export async function checkJSDoc(pluginPath, results) {
  try {
    const mainFilePath = path.join(pluginPath, 'src/index.js');
    const mainFileContent = await fs.readFile(mainFilePath, 'utf-8');

    const hasTypedef = /@typedef\s+\{[^}]*\}\s+Options/i.test(mainFileContent);
    if (hasTypedef) {
      results.passed.push('✓ JSDoc @typedef for Options found');
    } else {
      results.recommendations.push(
        '💡 Consider adding @typedef for Options type to improve IDE support. See template: templates/plugin/index.js.template'
      );
    }

    const functionMatches = mainFileContent.match(/export\s+default\s+function\s+\w+/g) || [];
    const functionDocs = mainFileContent.match(/\/\*\*[\s\S]*?\*\/\s*export\s+default\s+function/g) || [];

    if (functionMatches.length > 0) {
      if (functionDocs.length >= functionMatches.length) {
        results.passed.push('✓ Main export function has JSDoc documentation');
      } else {
        results.recommendations.push('💡 Add JSDoc documentation to main export function with @param and @returns');
      }
    }

    const hasReturnType = /@returns?\s+\{[^}]*import\(['"]metalsmith['"]\)\.Plugin\}/i.test(mainFileContent);
    if (hasReturnType) {
      results.passed.push('✓ JSDoc return type annotation includes Metalsmith.Plugin type');
    } else {
      results.recommendations.push("💡 Use @returns {import('metalsmith').Plugin} for better IDE support");
    }

    const hasParamDocs = /@param\s+\{[^}]+\}/i.test(mainFileContent);
    if (hasParamDocs) {
      results.passed.push('✓ JSDoc parameter documentation found');
    } else {
      results.recommendations.push('💡 Add @param documentation for function parameters');
    }

    const hasDefineProperty = /Object\.defineProperty\([^,]+,\s*['"]name['"],/.test(mainFileContent);
    if (hasDefineProperty) {
      results.passed.push('✓ Function name set with Object.defineProperty for debugging');
    } else {
      results.recommendations.push(
        '💡 Use Object.defineProperty to set function name for better debugging. See template pattern'
      );
    }

    const hasTwoPhaseComment = /two-phase|factory.*return.*plugin|return.*actual.*plugin/i.test(mainFileContent);
    if (hasTwoPhaseComment) {
      results.passed.push('✓ Two-phase plugin pattern documented');
    } else {
      results.recommendations.push('💡 Document the two-phase plugin pattern in comments for clarity');
    }

    const utilFiles = await Array.fromAsync(glob('src/utils/**/*.js', { cwd: pluginPath }));
    let utilDocsCount = 0;

    for (const utilFile of utilFiles) {
      try {
        const utilContent = await fs.readFile(path.join(pluginPath, utilFile), 'utf-8');
        if (utilContent.includes('/**')) {
          utilDocsCount++;
        }
      } catch {
        // continue
      }
    }

    if (utilFiles.length > 0) {
      if (utilDocsCount >= utilFiles.length * 0.8) {
        results.passed.push('✓ Utility files have good JSDoc coverage');
      } else {
        results.recommendations.push('💡 Add JSDoc documentation to utility functions for better maintainability');
      }
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check JSDoc documentation: ${error.message}`);
  }
}
