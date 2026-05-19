import { readPluginSource } from '../utils.js';

export async function checkPerformance(pluginPath, results) {
  try {
    const { entry, all } = await readPluginSource(pluginPath);

    const hasObjectKeys = /Object\.keys\(files\)/.test(all);
    const hasForIn = /for\s*\(\s*\w+\s+in\s+files\s*\)/.test(all);
    const hasDirectIteration = /files\[.*?\]/.test(all);

    if (hasObjectKeys || hasForIn || hasDirectIteration) {
      results.passed.push('✓ Proper files object iteration detected');
    } else {
      const processesFiles = /files|metalsmith/.test(all);
      if (processesFiles) {
        results.recommendations.push('💡 Use Object.keys(files) or for...in to iterate over files object');
      }
    }

    const hasRegExpInLoop =
      /for\s*\([^}]*\{[^}]*new\s+RegExp|while\s*\([^}]*\{[^}]*new\s+RegExp|forEach\s*\([^}]*\{[^}]*new\s+RegExp/s.test(
        all
      );
    if (hasRegExpInLoop) {
      results.recommendations.push('💡 Pre-compile RegExp patterns outside loops when processing file contents');
    } else {
      const hasRegExp = /new\s+RegExp|\/[^/\n]+\/[gimuy]*/.test(all);
      if (hasRegExp) {
        results.passed.push('✓ RegExp patterns appear optimally placed');
      }
    }

    const hasBufferOperations = /\.contents|Buffer\.from|\.toString\(/.test(all);
    const hasStringConcatenation = /\+\s*['"`]|['"`]\s*\+/.test(all);

    if (hasBufferOperations && hasStringConcatenation) {
      results.recommendations.push(
        '💡 Use Buffer methods instead of string concatenation for file.contents manipulation'
      );
    } else if (hasBufferOperations) {
      results.passed.push('✓ Efficient Buffer handling for file.contents detected');
    }

    const hasFileFiltering = /Object\.keys\(files\)\.filter|\.filter\(|metalsmith\.match\(/.test(all);
    const hasFileProcessing = /files\[.*?\]\.contents|transform|process/.test(all);

    if (hasFileProcessing && hasFileFiltering) {
      results.passed.push('✓ File filtering before processing detected');
    } else if (hasFileProcessing && !hasFileFiltering) {
      results.recommendations.push('💡 Consider filtering files before expensive content transformations');
    }

    const hasDestructuring = /const\s*\{[^}]*contents[^}]*\}\s*=|const\s*\{[^}]*stats[^}]*\}\s*=/.test(all);
    if (hasDestructuring) {
      results.passed.push('✓ Efficient destructuring of file properties detected');
    } else if (hasBufferOperations) {
      results.recommendations.push('💡 Consider destructuring file properties: const { contents, stats } = file');
    }

    const hasAsyncOperations = /await|Promise|async/.test(entry);
    const hasDoneCallback = /done\s*\(\)/.test(entry);

    if (hasAsyncOperations && hasDoneCallback) {
      results.passed.push('✓ Proper async plugin pattern with done() callback');
    } else if (hasAsyncOperations && !hasDoneCallback) {
      results.warnings.push('⚠ Async operations detected but no done() callback - may cause build issues');
    } else if (!hasAsyncOperations && !hasDoneCallback) {
      results.passed.push('✓ Synchronous plugin pattern (no done() needed)');
    }

    const hasObjectCloning = /JSON\.parse\(JSON\.stringify|Object\.assign\(\{\}|\.\.\.files|lodash\.clone/.test(all);
    if (hasObjectCloning) {
      results.recommendations.push('💡 Avoid cloning the entire files object - modify files in place when possible');
    }

    const hasMetadataAccess = /metalsmith\.metadata\(\)|files\[.*?\]\.\w+/.test(all);
    if (hasMetadataAccess) {
      results.passed.push('✓ Proper metadata access patterns detected');
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check performance patterns: ${error.message}`);
  }
}
