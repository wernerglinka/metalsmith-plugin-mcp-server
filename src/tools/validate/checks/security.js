import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readPluginSource } from '../utils.js';

export async function checkSecurity(pluginPath, results) {
  try {
    const { all } = await readPluginSource(pluginPath);

    const dangerousOperations = [
      { pattern: /eval\s*\(/, message: 'eval() usage detected - avoid dynamic code execution in build tools' },
      { pattern: /Function\s*\(/, message: 'Function constructor usage - potential code injection risk' },
      {
        pattern: /vm\.runInNewContext|vm\.runInThisContext/,
        message: 'VM context execution detected - use with caution'
      }
    ];

    for (const check of dangerousOperations) {
      if (check.pattern.test(all)) {
        results.warnings.push(`⚠ Security concern: ${check.message}`);
      }
    }

    const hasShellExecution = /exec\s*\(|spawn\s*\(|execSync|spawnSync/.test(all);
    if (hasShellExecution) {
      const hasInputValidation = /validate|sanitize|escape|shell-escape|shell-quote/.test(all);
      if (hasInputValidation) {
        results.passed.push('✓ Shell execution with input validation detected');
      } else {
        results.warnings.push(
          '⚠ Shell execution without input validation - sanitize user options before shell commands'
        );
      }
    }

    const sensitivePatternsInCode = [
      {
        pattern: /password\s*[:=]\s*['"][^'"]+['"]|secret\s*[:=]\s*['"][^'"]+['"]/,
        message: 'Hardcoded secrets detected'
      },
      { pattern: /api_?key\s*[:=]\s*['"][^'"]+['"]/, message: 'Hardcoded API keys detected' },
      { pattern: /token\s*[:=]\s*['"][^'"]{20,}['"]/, message: 'Hardcoded tokens detected' }
    ];

    for (const check of sensitivePatternsInCode) {
      if (check.pattern.test(all)) {
        results.warnings.push(`⚠ Security concern: ${check.message} - use environment variables instead`);
      }
    }

    const hasErrorHandling = /try\s*\{[\s\S]*catch|\.catch\s*\(/.test(all);
    const hasAsyncOperations = /await|Promise|async/.test(all);
    const hasFileOperations = /files\[.*?\]\.contents|Buffer|transform/.test(all);

    if (hasFileOperations && hasErrorHandling) {
      results.passed.push('✓ Error handling detected for file operations');
    } else if (hasFileOperations) {
      results.recommendations.push('💡 Add error handling for file transformations to prevent build failures');
    }

    if (hasAsyncOperations && hasErrorHandling) {
      results.passed.push('✓ Error handling detected for async operations');
    } else if (hasAsyncOperations) {
      results.recommendations.push('💡 Add error handling for async operations to prevent build failures');
    }

    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const hasAuditScript = packageJson.scripts?.audit || packageJson.scripts?.['audit:fix'];
      if (hasAuditScript) {
        results.passed.push('✓ Security audit script defined for dependency monitoring');
      } else {
        results.recommendations.push('💡 Add "audit": "npm audit" script for dependency security monitoring');
      }

      const hasPinnedVersions = Object.values(allDeps).some(
        (version) => typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version)
      );
      if (hasPinnedVersions) {
        results.passed.push('✓ Some dependencies use pinned versions');
      } else {
        results.recommendations.push('💡 Consider pinning critical dependency versions for build reproducibility');
      }
    } catch {
      // could not read package.json
    }

    const hasEnvLogging = /console\.log.*process\.env|debug.*process\.env|log.*process\.env/.test(all);
    if (hasEnvLogging) {
      results.warnings.push('⚠ Environment variables in logging - avoid exposing secrets in build logs');
    }

    const hasContentValidation = /contents.*length|Buffer.*isBuffer|typeof.*contents/.test(all);
    const hasContentAccess = /\.contents/.test(all);

    if (hasContentAccess && hasContentValidation) {
      results.passed.push('✓ File content validation detected');
    } else if (hasContentAccess) {
      results.recommendations.push('💡 Validate file.contents before processing to prevent crashes on malformed files');
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check security patterns: ${error.message}`);
  }
}
