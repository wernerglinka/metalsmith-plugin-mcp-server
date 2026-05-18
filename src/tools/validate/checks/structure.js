import { promises as fs } from 'node:fs';
import path from 'node:path';
import { glob } from 'node:fs/promises';

export async function checkStructure(pluginPath, results, functional = false, config) {
  const requiredDirs = config?.rules?.structure?.requiredDirs || ['src', 'test'];
  const requiredFiles = config?.rules?.structure?.requiredFiles || ['src/index.js', 'README.md', 'package.json'];
  const recommendedFiles = config?.rules?.structure?.recommendedFiles || ['.release-it.json', 'CLAUDE.md'];

  for (const dir of requiredDirs) {
    const dirPath = path.join(pluginPath, dir);
    try {
      const stats = await fs.stat(dirPath);
      if (stats.isDirectory()) {
        results.passed.push(`✓ Directory ${dir} exists`);
      }
    } catch {
      results.failed.push(`✗ Missing required directory: ${dir}`);
    }
  }

  for (const file of requiredFiles) {
    const filePath = path.join(pluginPath, file);
    try {
      await fs.access(filePath);
      results.passed.push(`✓ File ${file} exists`);
    } catch {
      results.failed.push(`✗ Missing required file: ${file}`);
    }
  }

  for (const file of recommendedFiles) {
    const filePath = path.join(pluginPath, file);
    try {
      await fs.access(filePath);
      results.passed.push(`✓ Recommended file ${file} exists`);
    } catch {
      if (file === '.release-it.json') {
        results.recommendations.push(
          `💡 Consider adding ${file} for automated releases. Use: get-template configs/release-it.json`
        );
      } else if (file === 'CLAUDE.md') {
        results.recommendations.push(
          `💡 Consider adding ${file} for AI development context. Use: get-template plugin/CLAUDE.md`
        );
      } else if (file === '.github/workflows/test.yml') {
        results.recommendations.push(
          `💡 Consider adding ${file} for CI/CD automation. Use: get-template workflows/test.yml`
        );
      } else if (file === '.github/workflows/test-matrix.yml') {
        results.recommendations.push(
          `💡 Consider adding ${file} to verify against multiple Node.js versions on PR. Use: get-template workflows/test-matrix.yml`
        );
      } else if (file === '.github/workflows/claude-code.yml') {
        results.recommendations.push(
          `💡 Consider adding ${file} for AI code review. Use: get-template workflows/claude-code.yml`
        );
      } else if (file === '.github/dependabot.yml') {
        results.recommendations.push(
          `💡 Consider adding ${file} for automated weekly dependency updates. Use: get-template github/dependabot.yml`
        );
      } else if (file === 'scripts/release.sh') {
        results.recommendations.push(
          `💡 Consider adding ${file} for manual release control. Use: get-template plugin/scripts/release.sh`
        );
      } else {
        results.recommendations.push(`💡 Consider adding recommended file: ${file}`);
      }
    }
  }

  if (functional) {
    await analyzeCodeComplexity(pluginPath, results);
  } else {
    const recommendedDirs = config?.rules?.structure?.recommendedDirs || [
      'src/utils',
      'src/processors',
      'test/fixtures',
      '.github/workflows',
      'scripts'
    ];
    for (const dir of recommendedDirs) {
      const dirPath = path.join(pluginPath, dir);
      try {
        await fs.stat(dirPath);
        results.passed.push(`✓ Recommended directory ${dir} exists`);
      } catch {
        if (dir === 'test/fixtures') {
          results.recommendations.push(
            `💡 Consider adding ${dir}. Run: npx metalsmith-plugin-mcp-server scaffold ${pluginPath} test/fixtures/basic/sample.md basic`
          );
        } else if (dir === '.github/workflows') {
          results.recommendations.push(
            `💡 Consider adding ${dir} for CI/CD automation. Add GitHub workflow files for automated testing and coverage.`
          );
        } else if (dir === 'scripts') {
          results.recommendations.push(
            `💡 Consider adding ${dir} for release automation. Add release.sh for manual release control.`
          );
        } else {
          results.recommendations.push(`💡 Consider adding directory: ${dir}`);
        }
      }
    }
  }
}

async function analyzeCodeComplexity(pluginPath, results) {
  try {
    const fixturesPath = path.join(pluginPath, 'test/fixtures');
    try {
      await fs.stat(fixturesPath);
      results.passed.push('✓ Test fixtures directory exists');
    } catch {
      const testFiles = await Array.fromAsync(glob('test/**/*.{js,cjs,mjs}', { cwd: pluginPath }));
      if (testFiles.length > 0) {
        results.recommendations.push(
          `💡 Consider adding test/fixtures. Run: npx metalsmith-plugin-mcp-server scaffold ${
            pluginPath
          } test/fixtures/basic/sample.md basic`
        );
      }
    }

    const mainFilePath = path.join(pluginPath, 'src/index.js');
    try {
      const mainFileContent = await fs.readFile(mainFilePath, 'utf-8');
      const analysis = analyzeFileComplexity(mainFileContent);

      if (analysis.needsUtils) {
        results.recommendations.push(
          `💡 Main file is complex (${analysis.lines} lines, ${analysis.functions} functions) - consider splitting utilities into src/utils/`
        );
      } else {
        results.passed.push(
          `✓ Main file complexity is appropriate (${analysis.lines} lines, ${analysis.functions} functions)`
        );
      }

      if (analysis.needsProcessors) {
        results.recommendations.push(
          '💡 Multiple processing functions detected - consider organizing into src/processors/'
        );
      } else if (analysis.hasProcessors) {
        results.passed.push('✓ Processing logic is well-organized');
      }
    } catch {
      results.warnings.push('⚠ Could not analyze main file complexity');
    }
  } catch (error) {
    results.warnings.push(`⚠ Error during complexity analysis: ${error.message}`);
  }
}

function analyzeFileComplexity(content) {
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = stripped.split('\n').filter((line) => line.trim() && !line.trim().startsWith('//')).length;
  const functions = (stripped.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length;
  const classes = (stripped.match(/class\s+\w+/g) || []).length;
  const imports = (stripped.match(/^import\s+/gm) || []).length;

  const needsUtils = lines > 150 || functions > 8 || imports > 10;
  const hasProcessors = stripped.includes('process') || stripped.includes('transform') || stripped.includes('parse');
  const needsProcessors = hasProcessors && functions > 5;

  return { lines, functions, classes, imports, needsUtils, needsProcessors, hasProcessors };
}
