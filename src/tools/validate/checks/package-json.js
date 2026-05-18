import { promises as fs } from 'node:fs';
import path from 'node:path';
import { analyzeClaudeStandards, resolveScriptContent } from '../utils.js';

export async function checkPackageJson(pluginPath, results, config) {
  try {
    const claudeAnalysis = await analyzeClaudeStandards(pluginPath);
    const packageJson = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));

    const requiredFields = ['name', 'version', 'description', 'license'];
    for (const field of requiredFields) {
      if (packageJson[field]) {
        results.passed.push(`✓ package.json has ${field}`);
      } else {
        results.failed.push(`✗ package.json missing ${field}`);
      }
    }

    if (packageJson.main || packageJson.exports) {
      if (packageJson.exports) {
        results.passed.push('✓ package.json has exports field (modern ES modules)');
      } else {
        results.passed.push('✓ package.json has main field');
      }
    } else {
      results.failed.push('✗ package.json missing entry point (main or exports)');
    }

    const namePrefix =
      config?.rules?.packageJson?.namePrefix !== undefined ? config.rules.packageJson.namePrefix : 'metalsmith-';
    if (namePrefix && packageJson.name?.startsWith(namePrefix)) {
      results.passed.push('✓ Plugin name follows convention');
    } else if (namePrefix) {
      results.recommendations.push(
        `💡 Consider using "${namePrefix}" prefix for better discoverability in the Metalsmith ecosystem`
      );
    }

    const recommendedFields = ['repository', 'keywords', 'engines', 'files'];
    for (const field of recommendedFields) {
      if (packageJson[field]) {
        results.passed.push(`✓ package.json has ${field}`);
      } else {
        results.recommendations.push(`💡 Consider adding ${field} to package.json`);
      }
    }

    if (packageJson.type === 'module' || packageJson.exports) {
      results.passed.push('✓ Modern module system configured');
    } else {
      results.recommendations.push('💡 Consider using ES modules (add "type": "module" or use exports field)');
    }

    const requiredScripts = config?.rules?.packageJson?.requiredScripts || ['test'];
    const recommendedScripts = config?.rules?.packageJson?.recommendedScripts || ['lint', 'format', 'test:coverage'];

    for (const script of requiredScripts) {
      if (packageJson.scripts?.[script]) {
        results.passed.push(`✓ Required script "${script}" defined`);
      } else {
        results.failed.push(`✗ Missing required script: ${script}`);
      }
    }

    for (const script of recommendedScripts) {
      if (packageJson.scripts?.[script]) {
        const scriptValue = packageJson.scripts[script];
        const resolvedContent = script.startsWith('release:')
          ? await resolveScriptContent(pluginPath, scriptValue)
          : scriptValue;
        const hasSecureTokenPattern = /GH_TOKEN\s*=\s*["']?\$\(\s*gh\s+auth\s+token\s*\)/.test(resolvedContent);

        if (script.startsWith('release:') && hasSecureTokenPattern) {
          if (claudeAnalysis.exists && claudeAnalysis.approvedTokenPattern === 'npm-script-with-gh-token') {
            results.passed.push(`✓ Script "${script}" uses CLAUDE.md approved pattern (npm script with GH_TOKEN)`);
          } else {
            results.passed.push(`✓ Script "${script}" uses secure GH_TOKEN pattern`);
          }
        } else {
          results.passed.push(`✓ Script "${script}" defined`);
        }
      } else {
        if (script === 'lint') {
          results.recommendations.push(
            `💡 Consider adding script: ${script}. Example: "lint": "biome check --write ."`
          );
        } else if (script === 'format') {
          results.recommendations.push(
            `💡 Consider adding script: ${script}. Example: "format": "biome format --write ."`
          );
        } else if (script === 'test:coverage') {
          results.recommendations.push(
            `💡 Consider adding script: ${script}. Example: "test:coverage": "mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=lcov --test-reporter-destination=coverage/lcov.info 'test/**/*.test.js'"`
          );
        } else if (script.startsWith('release:')) {
          const releaseType = script.split(':')[1];
          if (claudeAnalysis.exists && claudeAnalysis.approvedTokenPattern === 'npm-script-with-gh-token') {
            results.recommendations.push(
              `💡 Consider adding script: ${script}. CLAUDE.md pattern: "${script}": "GH_TOKEN=$(gh auth token) npx release-it ${releaseType} --ci"`
            );
          } else if (claudeAnalysis.exists && claudeAnalysis.approvedReleasePattern === 'shell-script') {
            results.recommendations.push(
              `💡 Consider adding script: ${script}. CLAUDE.md pattern: "${script}": "./scripts/release.sh ${releaseType} --ci"`
            );
          } else {
            results.recommendations.push(
              `💡 Consider adding script: ${script}. Example: "${script}": "./scripts/release.sh ${releaseType} --ci"`
            );
          }
        } else {
          results.recommendations.push(`💡 Consider adding script: ${script}`);
        }
      }
    }

    const legacyDeps = ['mocha', 'chai', 'c8', 'nyc', 'eslint', 'prettier', 'microbundle'];
    const foundLegacy = legacyDeps.filter(
      (dep) => packageJson.devDependencies?.[dep] || packageJson.dependencies?.[dep]
    );
    if (foundLegacy.length > 0) {
      results.recommendations.push(
        `💡 Legacy toolchain detected in dependencies (${foundLegacy.join(', ')}). Consider modernizing to @biomejs/biome (lint + format), the native node:test runner, and ESM-only publishing (drop microbundle, ship src/ directly). See: show-template biome`
      );
    }

    const hasLegacyExportsField =
      typeof packageJson.exports === 'object' &&
      packageJson.exports !== null &&
      (packageJson.exports.require || packageJson.exports.import);
    if (packageJson.main || packageJson.module || hasLegacyExportsField) {
      results.recommendations.push(
        '💡 package.json contains `main`, `module`, or dual `exports.import`/`exports.require` fields. ESM-only plugins should use `"exports": "./src/index.js"` and drop `main`/`module`.'
      );
    }
    try {
      await fs.access(path.join(pluginPath, 'lib'));
      results.recommendations.push(
        '💡 Build artifact directory `lib/` detected. ESM-only plugins publish `src/` directly — remove `lib/` and any `build`/`prepublishOnly` scripts.'
      );
    } catch {
      // No lib/ — good.
    }

    const hasReleaseIt = packageJson.devDependencies?.['release-it'] || packageJson.dependencies?.['release-it'];
    if (hasReleaseIt) {
      results.passed.push('✓ release-it dependency found');

      const hasReleaseScripts = recommendedScripts.some(
        (script) => script.startsWith('release:') && packageJson.scripts?.[script]
      );

      if (hasReleaseScripts) {
        if (claudeAnalysis.exists && claudeAnalysis.approvedReleasePattern === 'shell-script') {
          try {
            await fs.access(path.join(pluginPath, 'scripts/release.sh'));
            results.passed.push('✓ Secure release script found (scripts/release.sh) - matches CLAUDE.md standards');
          } catch {
            results.recommendations.push(
              '💡 CLAUDE.md recommends shell script approach. Create scripts/release.sh for consistency with existing standards.'
            );
          }
        } else if (claudeAnalysis.exists && claudeAnalysis.approvedTokenPattern === 'npm-script-with-gh-token') {
          results.passed.push('✓ Release process follows CLAUDE.md standards (npm script with GH_TOKEN)');
        } else {
          try {
            await fs.access(path.join(pluginPath, 'scripts/release.sh'));
            results.passed.push('✓ Secure release script found (scripts/release.sh)');
          } catch {
            results.recommendations.push(
              '💡 Consider using a secure release script to handle GitHub tokens. Create scripts/release.sh for better security.'
            );
          }
        }

        try {
          const releaseItPath = path.join(pluginPath, '.release-it.json');
          await fs.access(releaseItPath);
          const releaseItConfig = JSON.parse(await fs.readFile(releaseItPath, 'utf-8'));

          if (releaseItConfig.github) {
            const tokenRef = releaseItConfig.github.tokenRef;

            if (claudeAnalysis.exists && claudeAnalysis.approvedTokenPattern === 'npm-script-with-gh-token') {
              if (tokenRef) {
                results.passed.push(
                  `✓ .release-it.json has tokenRef "${tokenRef}" (npm script approach doesn't require this but it's configured)`
                );
              } else {
                results.passed.push(
                  '✓ Token handling follows CLAUDE.md standards (npm script with GH_TOKEN) - no tokenRef needed'
                );
              }
            } else if (tokenRef === 'GH_TOKEN') {
              results.passed.push('✓ .release-it.json uses correct token reference (GH_TOKEN)');
            } else if (tokenRef === 'GITHUB_TOKEN') {
              results.recommendations.push(
                `⚠️  .release-it.json uses "GITHUB_TOKEN" but shell scripts use "GH_TOKEN". Update tokenRef to "GH_TOKEN" in .release-it.json`
              );
            } else if (!tokenRef) {
              if (claudeAnalysis.exists && claudeAnalysis.approvedReleasePattern === 'shell-script') {
                results.recommendations.push(
                  '💡 CLAUDE.md recommends shell script approach. Add "tokenRef": "GH_TOKEN" to github section in .release-it.json for consistency'
                );
              } else {
                results.recommendations.push(
                  '💡 Consider adding "tokenRef": "GH_TOKEN" to github section in .release-it.json for consistent token handling'
                );
              }
            } else {
              results.recommendations.push(
                `⚠️  .release-it.json uses token reference "${tokenRef}". For consistency, consider using "GH_TOKEN"`
              );
            }
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            results.warnings.push(`⚠️  Could not validate .release-it.json token configuration: ${error.message}`);
          }
        }
      }
    } else {
      results.recommendations.push(
        '💡 Consider adding release-it for automated releases. Run: npm install --save-dev release-it'
      );
    }
  } catch (error) {
    results.failed.push(`✗ Error checking package.json: ${error.message}`);
  }
}
