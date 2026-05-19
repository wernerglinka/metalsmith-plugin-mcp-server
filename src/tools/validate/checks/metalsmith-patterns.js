import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readPluginSource } from '../utils.js';

export async function checkMetalsmithPatterns(pluginPath, results) {
  try {
    const { entry, all } = await readPluginSource(pluginPath);

    const hasFactoryPattern = /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*return\s+function/s.test(entry);
    const hasDirectExport = /export\s+default\s+function\s+\w+\s*\(\s*files\s*,\s*metalsmith\s*(?:,\s*done\s*)?\)/.test(
      entry
    );

    if (hasFactoryPattern) {
      results.passed.push('✓ Proper two-phase plugin factory pattern detected');
    } else if (hasDirectExport) {
      results.recommendations.push(
        '💡 Consider using factory pattern: export default function(options) { return function(files, metalsmith, done) {...} }'
      );
    }

    const hasCorrectSignature = /function\s*\(\s*files\s*,\s*metalsmith\s*(?:,\s*done\s*)?\)/.test(entry);
    if (hasCorrectSignature) {
      results.passed.push('✓ Correct Metalsmith plugin function signature detected');
    } else {
      results.warnings.push('⚠ Plugin function should accept (files, metalsmith, done) parameters');
    }

    const manipulatesFiles = /files\[.*?\]\s*=|delete\s+files\[|Object\.assign\(files\[/.test(all);
    const readsFiles = /files\[.*?\](?!\s*=)|Object\.keys\(files\)/.test(all);

    if (manipulatesFiles || readsFiles) {
      results.passed.push('✓ Plugin properly interacts with files object');
    } else {
      results.warnings.push('⚠ Plugin should interact with the files object to transform content');
    }

    const preservesMetadata = /Object\.assign\(.*file.*,|\.\.\.file|file\.\w+\s*=/.test(all);
    const accessesMetadata = /file\.\w+(?!contents)/.test(all);

    if (preservesMetadata || accessesMetadata) {
      results.passed.push('✓ Plugin works with file metadata');
    } else {
      results.recommendations.push('💡 Consider preserving or enhancing file metadata for better plugin integration');
    }

    const processesContents = /\.contents|Buffer\.from|\.toString\(/.test(all);
    if (processesContents) {
      const hasBufferCheck = /Buffer\.isBuffer|instanceof\s+Buffer/.test(all);
      if (hasBufferCheck) {
        results.passed.push('✓ Proper Buffer validation for file.contents');
      } else {
        results.recommendations.push('💡 Validate file.contents is a Buffer before processing');
      }
    }

    const usesGlobalMetadata = /metalsmith\.metadata\(\)/.test(all);
    if (usesGlobalMetadata) {
      results.passed.push('✓ Plugin accesses global metadata');
    }

    const hasFileFiltering = /Object\.keys\(files\)\.filter|\.filter\(|metalsmith\.match\(/.test(all);
    const hasFilePattern = /\.\w+$|endsWith\(|extname\(/.test(all);

    if (hasFileFiltering && hasFilePattern) {
      results.passed.push('✓ Plugin filters files by type/pattern');
    } else if (!hasFileFiltering && processesContents) {
      results.recommendations.push('💡 Consider filtering files by extension/pattern before processing');
    }

    const respectsLayout = /layout/.test(all);
    const respectsCollections = /collection/.test(all);
    const respectsDrafts = /draft/.test(all);

    const conventionCount = [respectsLayout, respectsCollections, respectsDrafts].filter(Boolean).length;
    if (conventionCount > 0) {
      results.passed.push(`✓ Plugin respects ${conventionCount} common Metalsmith convention(s)`);
    }

    const hasOptionsValidation = /options\s*=\s*\{[\s\S]*\}|Object\.assign\(.*options|\.\.\.options/.test(all);
    if (hasOptionsValidation) {
      results.passed.push('✓ Plugin handles options properly');
    } else {
      results.recommendations.push('💡 Add default options handling: options = { ...defaults, ...options }');
    }

    const hasNameProperty = /Object\.defineProperty\([^,]+,\s*['"]name['"]/.test(entry);
    if (hasNameProperty) {
      results.passed.push('✓ Plugin function name set for debugging');
    } else {
      results.recommendations.push(
        '💡 Set function name for better debugging: Object.defineProperty(plugin, "name", { value: "pluginName" })'
      );
    }

    const returnsMetalsmith = /return\s+metalsmith/.test(entry);
    const isMiddleware = hasFactoryPattern || hasDirectExport;

    if (!isMiddleware && !returnsMetalsmith) {
      results.recommendations.push('💡 Non-plugin functions should return metalsmith instance for chainability');
    }

    await checkNativeMethodUsage(all, pluginPath, results);

    const hasAsyncOperations = /await|Promise|async/.test(entry);
    const hasDoneCallback = /done\s*\(/.test(entry);
    const hasErrorPropagation = /done\s*\(\s*err\s*\)|\.catch\s*\(\s*done\s*\)/.test(entry);

    if (hasAsyncOperations && hasDoneCallback) {
      if (hasErrorPropagation) {
        results.passed.push('✓ Proper error propagation in async plugin');
      } else {
        results.warnings.push('⚠ Async plugin should propagate errors via done(err)');
      }
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check Metalsmith patterns: ${error.message}`);
  }
}

async function checkNativeMethodUsage(sourceContent, pluginPath, results) {
  try {
    const packageJsonPath = path.join(pluginPath, 'package.json');
    let packageJson = {};
    try {
      packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    } catch {
      // no package.json
    }

    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const usesDebugPackage = /require\s*\(\s*['"]debug['"]|import.*from\s+['"]debug['"]/m.test(sourceContent);
    const usesMetalsmithDebug = /metalsmith\.debug\(/m.test(sourceContent);
    const hasDebugDependency = allDependencies?.debug;

    if (usesDebugPackage || hasDebugDependency) {
      if (usesMetalsmithDebug) {
        results.passed.push('✓ Using metalsmith.debug() instead of debug package');
        if (hasDebugDependency) {
          results.recommendations.push(
            "💡 Remove debug dependency from package.json since you're using metalsmith.debug()"
          );
        }
      } else {
        results.recommendations.push(
          '💡 Use metalsmith.debug() instead of debug package. Replace debug() calls with metalsmith.debug()'
        );
      }
    } else if (usesMetalsmithDebug) {
      results.passed.push('✓ Using metalsmith.debug() for debugging');
    }

    const usesMinimatch = /require\s*\(\s*['"]minimatch['"]|import.*from\s+['"]minimatch['"]/m.test(sourceContent);
    const usesMetalsmithMatch = /metalsmith\.match\(/m.test(sourceContent);
    const hasMinimatchDependency = allDependencies?.minimatch;

    if (usesMinimatch || hasMinimatchDependency) {
      if (usesMetalsmithMatch) {
        results.passed.push('✓ Using metalsmith.match() instead of minimatch package');
        if (hasMinimatchDependency) {
          results.recommendations.push(
            "💡 Remove minimatch dependency from package.json since you're using metalsmith.match()"
          );
        }
      } else {
        results.recommendations.push(
          '💡 Use metalsmith.match() instead of minimatch package for file pattern matching'
        );
      }
    } else if (usesMetalsmithMatch) {
      results.passed.push('✓ Using metalsmith.match() for pattern matching');
    }

    const usesMetalsmithEnv = /metalsmith\.env\(/m.test(sourceContent);
    const usesProcessEnv = /process\.env\./m.test(sourceContent);

    if (usesMetalsmithEnv) {
      results.passed.push('✓ Using metalsmith.env() for environment variables');
    } else if (usesProcessEnv) {
      results.recommendations.push(
        '💡 Consider using metalsmith.env() instead of process.env for accessing environment variables'
      );
    }

    const usesPath = /require\s*\(\s*['"]path['"]|import.*from\s+['"]path['"]/m.test(sourceContent);
    const usesMetalsmithPath = /metalsmith\.path\(/m.test(sourceContent);

    if (usesPath && !usesMetalsmithPath) {
      const hasPathJoins = /path\.join/m.test(sourceContent);
      if (hasPathJoins) {
        results.recommendations.push(
          '💡 Consider using metalsmith.path() for consistent path handling across different systems'
        );
      }
    } else if (usesMetalsmithPath) {
      results.passed.push('✓ Using metalsmith.path() for path handling');
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check native method usage: ${error.message}`);
  }
}
