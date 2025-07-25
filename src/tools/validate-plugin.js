import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { spawn } from 'child_process';
import chalk from 'chalk';

/**
 * Load validation configuration from file
 * @param {string} pluginPath - Plugin directory path
 * @returns {Promise<Object>} Validation configuration
 */
async function loadValidationConfig(pluginPath) {
  const configPaths = [
    path.join(pluginPath, '.metalsmith-plugin-validation.json'),
    path.join(pluginPath, '.validation.json'),
    path.join(pluginPath, '.validationrc.json')
  ];

  // Default configuration
  const defaultConfig = {
    rules: {
      structure: {
        enabled: true,
        requiredDirs: ['src', 'test'],
        requiredFiles: ['src/index.js', 'README.md', 'package.json'],
        recommendedDirs: ['src/utils', 'src/processors', 'test/fixtures']
      },
      tests: {
        enabled: true,
        coverageThreshold: 80,
        requireFixtures: false
      },
      documentation: {
        enabled: true,
        requiredSections: [],
        recommendedSections: ['Installation', 'Usage', 'Options', 'Examples']
      },
      packageJson: {
        namePrefix: 'metalsmith-', // Set to "" to disable prefix recommendation
        requiredScripts: ['test'],
        recommendedScripts: ['lint', 'format', 'test:coverage']
      }
    },
    recommendations: {
      showCommands: true,
      templateSuggestions: true
    }
  };

  // Try to load user config
  for (const configPath of configPaths) {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const userConfig = JSON.parse(configContent);

      // Deep merge user config with defaults
      return deepMerge(defaultConfig, userConfig);
    } catch {
      // Continue to next config file
    }
  }

  return defaultConfig;
}

/**
 * Deep merge two objects, preserving explicit falsy values
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Validate a Metalsmith plugin against quality standards
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Plugin directory path
 * @param {string[]} args.checks - Checks to perform
 * @returns {Promise<Object>} Tool response
 */
export async function validatePluginTool(args) {
  const { path: pluginPath, checks = ['structure', 'tests', 'docs', 'package-json'], functional = false } = args;

  const results = {
    passed: [],
    failed: [],
    warnings: [],
    recommendations: []
  };

  try {
    // Verify plugin directory exists
    await fs.access(pluginPath);

    // Load validation configuration
    const config = await loadValidationConfig(pluginPath);

    // Run selected checks
    for (const check of checks) {
      switch (check) {
        case 'structure':
          if (config.rules.structure.enabled) {
            await checkStructure(pluginPath, results, functional, config);
          }
          break;
        case 'tests':
          if (config.rules.tests.enabled) {
            await checkTests(pluginPath, results, functional, config);
          }
          break;
        case 'docs':
          if (config.rules.documentation.enabled) {
            await checkDocumentation(pluginPath, results, config);
          }
          break;
        case 'package-json':
          if (config.rules.packageJson) {
            await checkPackageJson(pluginPath, results, config);
          }
          break;
        case 'eslint':
          await checkEslint(pluginPath, results);
          break;
        case 'coverage':
          await checkCoverage(pluginPath, results, functional, config);
          break;
      }
    }

    // Generate report
    const report = generateReport(results);

    return {
      content: [
        {
          type: 'text',
          text: report
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to validate plugin: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Check plugin directory structure
 */
async function checkStructure(pluginPath, results, functional = false, config) {
  const requiredDirs = config?.rules?.structure?.requiredDirs || ['src', 'test'];
  const requiredFiles = config?.rules?.structure?.requiredFiles || ['src/index.js', 'README.md', 'package.json'];

  // Check directories
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

  // Check files
  for (const file of requiredFiles) {
    const filePath = path.join(pluginPath, file);
    try {
      await fs.access(filePath);
      results.passed.push(`✓ File ${file} exists`);
    } catch {
      results.failed.push(`✗ Missing required file: ${file}`);
    }
  }

  if (functional) {
    // Intelligent structure analysis
    await analyzeCodeComplexity(pluginPath, results);
  } else {
    // Traditional structure check
    const recommendedDirs = config?.rules?.structure?.recommendedDirs || [
      'src/utils',
      'src/processors',
      'test/fixtures'
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
        } else {
          results.recommendations.push(`💡 Consider adding directory: ${dir}`);
        }
      }
    }
  }
}

/**
 * Analyze code complexity and recommend structure improvements
 */
async function analyzeCodeComplexity(pluginPath, results) {
  try {
    // Always check for test fixtures - this is genuinely useful
    const fixturesPath = path.join(pluginPath, 'test/fixtures');
    try {
      await fs.stat(fixturesPath);
      results.passed.push('✓ Test fixtures directory exists');
    } catch {
      // Only warn if there are actually test files that might need fixtures
      const testFiles = await glob('test/**/*.{js,cjs,mjs}', { cwd: pluginPath });
      if (testFiles.length > 0) {
        results.recommendations.push(
          `💡 Consider adding test/fixtures. Run: npx metalsmith-plugin-mcp-server scaffold ${
            pluginPath
          } test/fixtures/basic/sample.md basic`
        );
      }
    }

    // Analyze main plugin file complexity
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

/**
 * Analyze a file's complexity
 */
function analyzeFileComplexity(content) {
  const lines = content.split('\n').filter((line) => line.trim() && !line.trim().startsWith('//')).length;
  const functions = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length;
  const classes = (content.match(/class\s+\w+/g) || []).length;
  const imports = (content.match(/^import\s+/gm) || []).length;

  // Complexity thresholds
  const needsUtils = lines > 150 || functions > 8 || imports > 10;
  const hasProcessors = content.includes('process') || content.includes('transform') || content.includes('parse');
  const needsProcessors = hasProcessors && functions > 5;

  return {
    lines,
    functions,
    classes,
    imports,
    needsUtils,
    needsProcessors,
    hasProcessors
  };
}

/**
 * Run a command and return result
 */
// eslint-disable-next-line require-await
async function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      timeout: 60000 // 60 second timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        success: false,
        error: 'Command timed out after 60 seconds',
        summary: ''
      });
    }, 60000);

    child.on('exit', (code) => {
      clearTimeout(timeout);
      const success = code === 0;
      let summary = '';

      if (success) {
        // Try to extract test summary from output
        const testPattern = /(\d+)\s+passing|(\d+)\s+tests?\s+passed/i;
        const match = stdout.match(testPattern) || stderr.match(testPattern);
        if (match) {
          summary = `${match[1] || match[2]} tests passed`;
        } else {
          summary = 'completed successfully';
        }
      }

      resolve({
        success,
        error: success ? '' : stderr || stdout || `Command failed with code ${code}`,
        summary,
        output: stdout,
        stderr: stderr
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: error.message,
        summary: ''
      });
    });
  });
}

/**
 * Check test setup and coverage
 */
async function checkTests(pluginPath, results, functional = false) {
  try {
    // Check for test files with various patterns
    const testPatterns = [
      'test/**/*.test.js',
      'test/**/*.test.cjs',
      'test/**/*.test.mjs',
      'test/**/index.js',
      'test/**/index.cjs',
      'test/**/index.mjs',
      'test/**/*.spec.js',
      'test/**/*.spec.cjs',
      'test/**/*.spec.mjs'
    ];

    let allTestFiles = [];
    for (const pattern of testPatterns) {
      const files = await glob(pattern, { cwd: pluginPath });
      allTestFiles.push(...files);
    }

    // Remove duplicates
    allTestFiles = [...new Set(allTestFiles)];

    if (allTestFiles.length > 0) {
      results.passed.push(`✓ Found ${allTestFiles.length} test file(s)`);
    } else {
      results.failed.push('✗ No test files found');
    }

    // Check for test fixtures
    const fixtureFiles = await glob('test/fixtures/**/*', { cwd: pluginPath });
    if (fixtureFiles.length > 0) {
      results.passed.push(`✓ Test fixtures present (${fixtureFiles.length} files)`);
    } else {
      results.recommendations.push(
        `💡 Consider adding test fixtures. Run: npx metalsmith-plugin-mcp-server scaffold ${
          pluginPath
        } test/fixtures/basic/sample.md basic`
      );
    }

    // Check package.json for test script
    const packageJson = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));

    if (packageJson.scripts?.test) {
      if (functional) {
        // Run the actual tests
        const testResult = await runCommand('npm', ['test'], pluginPath);
        if (testResult.success) {
          results.passed.push(`✓ Tests run successfully (${testResult.summary})`);
        } else {
          results.failed.push(`✗ Tests failed: ${testResult.error}`);
        }
      } else {
        results.passed.push('✓ Test script defined in package.json');
      }
    } else {
      results.failed.push('✗ No test script in package.json');
    }

    if (packageJson.scripts?.['test:coverage'] || packageJson.scripts?.coverage) {
      if (functional) {
        // Run the coverage command
        const coverageResult = await runCommand(
          'npm',
          ['run', packageJson.scripts?.['test:coverage'] ? 'test:coverage' : 'coverage'],
          pluginPath
        );
        if (coverageResult.success) {
          // Try to extract coverage percentage with multiple patterns
          const output = `${coverageResult.output}\n${coverageResult.stderr}`;
          let percentage = 'unknown';

          // Pattern 1: Table format (e.g., "| 91.28 |" for lines column)
          const tablePattern = /Lines\s*\|\s*(\d+(?:\.\d+)?)\s*\|/i;
          let match = output.match(tablePattern);

          if (!match) {
            // Pattern 2: Summary format (e.g., "Lines : 91.28%")
            const summaryPattern = /Lines\s*:\s*(\d+(?:\.\d+)?)%/i;
            match = output.match(summaryPattern);
          }

          if (!match) {
            // Pattern 3: Simple format (e.g., "91.28% lines covered")
            const simplePattern = /(\d+(?:\.\d+)?)%\s+lines/i;
            match = output.match(simplePattern);
          }

          if (!match) {
            // Pattern 4: Alternative format (e.g., "All files | 91.28 |" looking for lines column)
            const allFilesPattern = /All files\s*\|[^|]*\|[^|]*\|[^|]*\|\s*(\d+(?:\.\d+)?)\s*\|/i;
            match = output.match(allFilesPattern);
          }

          if (match) {
            percentage = match[1];
          }

          results.passed.push(`✓ Coverage generated successfully (${percentage}% lines covered)`);
        } else {
          results.failed.push(`✗ Coverage generation failed: ${coverageResult.error}`);
        }
      } else {
        results.passed.push('✓ Coverage script defined');
      }
    } else {
      results.recommendations.push('💡 Consider adding a coverage script (e.g., test:coverage) to track code coverage');
    }
  } catch (error) {
    results.failed.push(`✗ Error checking tests: ${error.message}`);
  }
}

/**
 * Check documentation quality
 */
async function checkDocumentation(pluginPath, results, config) {
  try {
    const readmePath = path.join(pluginPath, 'README.md');
    const readme = await fs.readFile(readmePath, 'utf-8');

    // Check README sections
    const requiredSections =
      config?.rules?.documentation?.requiredSections?.map((name) => ({
        pattern: new RegExp(`##?\\s+${name}`, 'i'),
        name
      })) || [];

    const recommendedSections = config?.rules?.documentation?.recommendedSections?.map((name) => ({
      pattern: new RegExp(`##?\\s+${name}`, 'i'),
      name
    })) || [
      { pattern: /##?\s+Install/i, name: 'Installation' },
      { pattern: /##?\s+Usage/i, name: 'Usage' },
      { pattern: /##?\s+Options/i, name: 'Options' },
      { pattern: /##?\s+Example/i, name: 'Examples' }
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

    // Check for badges
    if (readme.includes('![')) {
      results.passed.push('✓ README includes badges');
    } else {
      results.recommendations.push(
        '💡 Consider adding badges to README. Common badges: npm version, build status, coverage. See README template'
      );
    }

    // Check for code examples
    if (readme.includes('```')) {
      results.passed.push('✓ README includes code examples');
    } else {
      results.recommendations.push(
        '💡 Consider adding code examples to README. The README template includes examples: templates/plugin/README.md.template'
      );
    }

    // Check for license file
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

/**
 * Check package.json standards
 */
async function checkPackageJson(pluginPath, results, config) {
  try {
    const packageJson = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));

    // Required fields
    const requiredFields = ['name', 'version', 'description', 'license'];
    for (const field of requiredFields) {
      if (packageJson[field]) {
        results.passed.push(`✓ package.json has ${field}`);
      } else {
        results.failed.push(`✗ package.json missing ${field}`);
      }
    }

    // Check for entry point (main or exports)
    if (packageJson.main || packageJson.exports) {
      if (packageJson.exports) {
        results.passed.push('✓ package.json has exports field (modern ES modules)');
      } else {
        results.passed.push('✓ package.json has main field');
      }
    } else {
      results.failed.push('✗ package.json missing entry point (main or exports)');
    }

    // Check name convention
    const namePrefix =
      config?.rules?.packageJson?.namePrefix !== undefined ? config.rules.packageJson.namePrefix : 'metalsmith-';
    if (namePrefix && packageJson.name?.startsWith(namePrefix)) {
      results.passed.push('✓ Plugin name follows convention');
    } else if (namePrefix) {
      results.recommendations.push(
        `💡 Consider using "${namePrefix}" prefix for better discoverability in the Metalsmith ecosystem`
      );
    }

    // Recommended fields
    const recommendedFields = ['repository', 'keywords', 'engines', 'files'];
    for (const field of recommendedFields) {
      if (packageJson[field]) {
        results.passed.push(`✓ package.json has ${field}`);
      } else {
        results.recommendations.push(`💡 Consider adding ${field} to package.json`);
      }
    }

    // Check for proper exports
    if (packageJson.type === 'module' || packageJson.exports) {
      results.passed.push('✓ Modern module system configured');
    } else {
      results.recommendations.push('💡 Consider using ES modules (add "type": "module" or use exports field)');
    }

    // Check scripts
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
        results.passed.push(`✓ Script "${script}" defined`);
      } else {
        if (script === 'lint') {
          results.recommendations.push(`💡 Consider adding script: ${script}. Example: "lint": "eslint src test"`);
        } else if (script === 'format') {
          results.recommendations.push(
            `💡 Consider adding script: ${script}. Example: "format": "prettier --write src test"`
          );
        } else if (script === 'test:coverage') {
          results.recommendations.push(`💡 Consider adding script: ${script}. Example: "test:coverage": "c8 npm test"`);
        } else {
          results.recommendations.push(`💡 Consider adding script: ${script}`);
        }
      }
    }
  } catch (error) {
    results.failed.push(`✗ Error checking package.json: ${error.message}`);
  }
}

/**
 * Check ESLint configuration
 */
async function checkEslint(pluginPath, results) {
  const eslintFiles = ['eslint.config.js', '.eslintrc.js', '.eslintrc.json'];
  let found = false;

  for (const file of eslintFiles) {
    try {
      await fs.access(path.join(pluginPath, file));
      results.passed.push(`✓ ESLint configuration found: ${file}`);
      found = true;
      break;
    } catch {
      // Continue checking
    }
  }

  if (!found) {
    results.recommendations.push(
      `💡 Consider adding ESLint configuration. Generate with: npx metalsmith-plugin-mcp-server scaffold ${
        pluginPath
      } eslint.config.js eslint`
    );
  }

  // Check for modern flat config
  try {
    await fs.access(path.join(pluginPath, 'eslint.config.js'));
    results.passed.push('✓ Using modern ESLint flat config');
  } catch {
    // Not using flat config
  }
}

/**
 * Check test coverage
 */
// eslint-disable-next-line no-unused-vars
async function checkCoverage(pluginPath, results, functional = false, config) {
  try {
    // Check if this is a new plugin (no node_modules = no tests run yet)
    const isNewPlugin = !(await fs
      .access(path.join(pluginPath, 'node_modules'))
      .then(() => true)
      .catch(() => false));

    // Look for coverage reports
    const coverageFiles = await glob('coverage/**/*', { cwd: pluginPath });

    if (coverageFiles.length > 0) {
      results.passed.push('✓ Coverage reports found');

      // Try to read coverage summary
      try {
        const summaryPath = path.join(pluginPath, 'coverage/coverage-summary.json');
        const summary = JSON.parse(await fs.readFile(summaryPath, 'utf-8'));
        const total = summary.total;

        if (total) {
          const coverage = total.lines.pct;
          const threshold = config?.rules?.tests?.coverageThreshold || 80;

          if (coverage >= 90) {
            results.passed.push(`✓ Excellent test coverage: ${coverage}%`);
          } else if (coverage >= threshold) {
            results.passed.push(`✓ Good test coverage: ${coverage}%`);
          } else {
            results.warnings.push(`⚠ Low test coverage: ${coverage}% (threshold: ${threshold}%)`);
          }
        }
      } catch {
        // Could not read coverage summary
      }
    } else {
      if (isNewPlugin) {
        // Don't penalize new plugins - just provide helpful info
        results.passed.push("ℹ Coverage reports will be generated after running 'npm run test:coverage'");
      } else {
        // Only warn if tests have likely been run
        results.recommendations.push("💡 No coverage reports found - run 'npm run test:coverage' to generate");
      }
    }

    // Check for coverage configuration
    const coverageConfigExists = await Promise.all([
      fs
        .access(path.join(pluginPath, '.c8rc.json'))
        .then(() => true)
        .catch(() => false),
      fs
        .access(path.join(pluginPath, '.nycrc'))
        .then(() => true)
        .catch(() => false),
      fs
        .access(path.join(pluginPath, '.nycrc.json'))
        .then(() => true)
        .catch(() => false)
    ]).then((results) => results.some((exists) => exists));

    if (coverageConfigExists) {
      results.passed.push('✓ Coverage configuration found');
    } else {
      results.recommendations.push(
        '💡 Consider adding coverage configuration. Create .c8rc.json with coverage thresholds'
      );
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check coverage: ${error.message}`);
  }
}

/**
 * Generate validation report
 */
function generateReport(results) {
  const lines = [chalk.bold('🔍 Plugin Validation Report'), ''];

  if (results.passed.length > 0) {
    lines.push(chalk.green.bold(`Passed (${results.passed.length}):`));
    results.passed.forEach((item) => lines.push(chalk.green(item)));
    lines.push('');
  }

  if (results.warnings.length > 0) {
    lines.push(chalk.yellow.bold(`Warnings (${results.warnings.length}):`));
    results.warnings.forEach((item) => lines.push(chalk.yellow(item)));
    lines.push('');
  }

  if (results.recommendations.length > 0) {
    lines.push(chalk.blue.bold(`Recommendations (${results.recommendations.length}):`));
    results.recommendations.forEach((item) => lines.push(chalk.blue(item)));
    lines.push('');
  }

  if (results.failed.length > 0) {
    lines.push(chalk.red.bold(`Failed (${results.failed.length}):`));
    results.failed.forEach((item) => lines.push(chalk.red(item)));
    lines.push('');
  }

  // Summary
  const total =
    results.passed.length + results.warnings.length + results.failed.length + results.recommendations.length;
  const score = Math.round((results.passed.length / total) * 100);

  lines.push(chalk.bold('Summary:'));
  lines.push(`Total checks: ${total}`);
  lines.push(`Quality score: ${score}%`);

  if (results.failed.length === 0) {
    lines.push(chalk.green.bold('✅ Plugin meets quality standards!'));
  } else {
    lines.push(chalk.red.bold('❌ Plugin needs improvements'));
  }

  return lines.join('\n');
}
