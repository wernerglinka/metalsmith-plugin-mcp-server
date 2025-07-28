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
        recommendedDirs: ['src/utils', 'src/processors', 'test/fixtures'],
        recommendedFiles: ['.release-it.json']
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
        recommendedScripts: ['lint', 'format', 'test:coverage', 'release:patch', 'release:minor', 'release:major']
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
  const {
    path: pluginPath,
    checks = ['structure', 'tests', 'docs', 'package-json', 'jsdoc', 'performance', 'security'],
    functional = false
  } = args;

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
        case 'jsdoc':
          await checkJSDoc(pluginPath, results, config);
          break;
        case 'performance':
          await checkPerformance(pluginPath, results, config);
          break;
        case 'security':
          await checkSecurity(pluginPath, results, config);
          break;
        case 'integration':
          await checkIntegration(pluginPath, results, config);
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
  const recommendedFiles = config?.rules?.structure?.recommendedFiles || ['.release-it.json'];

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

  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(pluginPath, file);
    try {
      await fs.access(filePath);
      results.passed.push(`✓ File ${file} exists`);
    } catch {
      results.failed.push(`✗ Missing required file: ${file}`);
    }
  }

  // Check recommended files
  for (const file of recommendedFiles) {
    const filePath = path.join(pluginPath, file);
    try {
      await fs.access(filePath);
      results.passed.push(`✓ Recommended file ${file} exists`);
    } catch {
      if (file === '.release-it.json') {
        results.recommendations.push(
          `💡 Consider adding ${file} for automated releases. Run: npx metalsmith-plugin-mcp-server scaffold ${pluginPath} .release-it.json release-config`
        );
      } else {
        results.recommendations.push(`💡 Consider adding recommended file: ${file}`);
      }
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
        } else if (script.startsWith('release:')) {
          const releaseType = script.split(':')[1];
          results.recommendations.push(
            `💡 Consider adding script: ${script}. Example: "${script}": "release-it ${releaseType}"`
          );
        } else {
          results.recommendations.push(`💡 Consider adding script: ${script}`);
        }
      }
    }

    // Check for release-it dependency
    const hasReleaseIt = packageJson.devDependencies?.['release-it'] || packageJson.dependencies?.['release-it'];
    if (hasReleaseIt) {
      results.passed.push('✓ release-it dependency found');
    } else {
      results.recommendations.push(
        '💡 Consider adding release-it for automated releases. Run: npm install --save-dev release-it'
      );
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
 * Check JSDoc documentation quality
 */
async function checkJSDoc(pluginPath, results, config) {
  try {
    const mainFilePath = path.join(pluginPath, 'src/index.js');
    const mainFileContent = await fs.readFile(mainFilePath, 'utf-8');

    // Check for typedef definitions (Options type)
    const hasTypedef = /@typedef\s+\{[^}]*\}\s+Options/i.test(mainFileContent);
    if (hasTypedef) {
      results.passed.push('✓ JSDoc @typedef for Options found');
    } else {
      results.recommendations.push(
        '💡 Consider adding @typedef for Options type to improve IDE support. See template: templates/plugin/index.js.template'
      );
    }

    // Check for proper function documentation
    const functionMatches = mainFileContent.match(/export\s+default\s+function\s+\w+/g) || [];
    const functionDocs = mainFileContent.match(/\/\*\*[\s\S]*?\*\/\s*export\s+default\s+function/g) || [];

    if (functionMatches.length > 0) {
      if (functionDocs.length >= functionMatches.length) {
        results.passed.push('✓ Main export function has JSDoc documentation');
      } else {
        results.recommendations.push('💡 Add JSDoc documentation to main export function with @param and @returns');
      }
    }

    // Check for return type annotations
    const hasReturnType = /@returns?\s+\{[^}]*import\(['"]metalsmith['"]\)\.Plugin\}/i.test(mainFileContent);
    if (hasReturnType) {
      results.passed.push('✓ JSDoc return type annotation includes Metalsmith.Plugin type');
    } else {
      results.recommendations.push("💡 Use @returns {import('metalsmith').Plugin} for better IDE support");
    }

    // Check for parameter documentation
    const hasParamDocs = /@param\s+\{[^}]+\}/i.test(mainFileContent);
    if (hasParamDocs) {
      results.passed.push('✓ JSDoc parameter documentation found');
    } else {
      results.recommendations.push('💡 Add @param documentation for function parameters');
    }

    // Check for Object.defineProperty usage for function names
    const hasDefineProperty = /Object\.defineProperty\([^,]+,\s*['"]name['"],/.test(mainFileContent);
    if (hasDefineProperty) {
      results.passed.push('✓ Function name set with Object.defineProperty for debugging');
    } else {
      results.recommendations.push(
        '💡 Use Object.defineProperty to set function name for better debugging. See template pattern'
      );
    }

    // Check for two-phase pattern documentation
    const hasTwoPhaseComment = /two-phase|factory.*return.*plugin|return.*actual.*plugin/i.test(mainFileContent);
    if (hasTwoPhaseComment) {
      results.passed.push('✓ Two-phase plugin pattern documented');
    } else {
      results.recommendations.push('💡 Document the two-phase plugin pattern in comments for clarity');
    }

    // Check for utility files JSDoc if they exist
    const utilFiles = await glob('src/utils/**/*.js', { cwd: pluginPath });
    let utilDocsCount = 0;

    for (const utilFile of utilFiles) {
      try {
        const utilContent = await fs.readFile(path.join(pluginPath, utilFile), 'utf-8');
        if (utilContent.includes('/**')) {
          utilDocsCount++;
        }
      } catch {
        // Continue
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

/**
 * Check performance optimization patterns
 */
async function checkPerformance(pluginPath, results, config) {
  try {
    const mainFilePath = path.join(pluginPath, 'src/index.js');
    const mainFileContent = await fs.readFile(mainFilePath, 'utf-8');

    // Check for RegExp pre-compilation outside loops
    const hasRegExpInLoop =
      /for\s*\([^}]*\{[^}]*new\s+RegExp|while\s*\([^}]*\{[^}]*new\s+RegExp|forEach\s*\([^}]*\{[^}]*new\s+RegExp/s.test(
        mainFileContent
      );
    if (hasRegExpInLoop) {
      results.recommendations.push('💡 Consider pre-compiling RegExp patterns outside loops for better performance');
    } else {
      // Check if RegExp is used appropriately
      const hasRegExp = /new\s+RegExp|\/[^/\n]+\/[gimuy]*/.test(mainFileContent);
      if (hasRegExp) {
        results.passed.push('✓ RegExp patterns appear to be optimally placed');
      }
    }

    // Check for efficient file filtering before expensive operations
    const hasFileFiltering = /Object\.keys\(files\)\.filter|metalsmith\.match|\.filter\(/.test(mainFileContent);
    const hasExpensiveOperations = /await|Promise|Buffer|readFile|writeFile|transform|process/.test(mainFileContent);

    if (hasExpensiveOperations && hasFileFiltering) {
      results.passed.push('✓ File filtering detected before expensive operations');
    } else if (hasExpensiveOperations && !hasFileFiltering) {
      results.recommendations.push('💡 Consider filtering files before expensive operations to improve performance');
    }

    // Check for Set/Map usage for lookups
    const hasSetOrMap = /new\s+(Set|Map)\(|\.has\(|\.get\(/.test(mainFileContent);
    const hasArrayIncludes = /\.includes\(/.test(mainFileContent);

    if (hasArrayIncludes && !hasSetOrMap) {
      results.recommendations.push(
        '💡 Consider using Set/Map for frequent lookups instead of Array.includes() for better performance'
      );
    } else if (hasSetOrMap) {
      results.passed.push('✓ Efficient Set/Map usage detected for lookups');
    }

    // Check for caching computed values
    const hasCaching = /cache|cached|memoiz|store.*result|const.*=.*compute/.test(mainFileContent);
    const hasComputations = /calculate|compute|process|transform|parse/.test(mainFileContent);

    if (hasComputations && hasCaching) {
      results.passed.push('✓ Computed value caching detected');
    } else if (hasComputations) {
      results.recommendations.push('💡 Consider caching computed values that are reused for better performance');
    }

    // Check for direct property access vs deep lookups
    const hasDeepAccess = /\w+\.\w+\.\w+\.\w+/.test(mainFileContent);
    if (hasDeepAccess) {
      results.recommendations.push(
        '💡 Consider destructuring deeply nested properties for better performance and readability'
      );
    } else {
      const hasDestructuring = /const\s*\{[^}]+\}\s*=/.test(mainFileContent);
      if (hasDestructuring) {
        results.passed.push('✓ Efficient property access patterns detected');
      }
    }

    // Check for batch processing patterns
    const hasBatchProcessing = /batch|chunk|slice\(|Promise\.all/.test(mainFileContent);
    const hasFileIteration = /Object\.keys\(files\)\.forEach|for.*in\s+files/.test(mainFileContent);

    if (hasFileIteration && hasBatchProcessing) {
      results.passed.push('✓ Batch processing patterns detected for file handling');
    } else if (hasFileIteration) {
      results.recommendations.push(
        '💡 Consider batch processing for large file sets. Use Promise.all() with batching for async operations'
      );
    }

    // Check for unnecessary async/await usage
    const unnecessaryAwait =
      /await.*(?:return|resolve)\s*\([^)]*\)|await\s+(?:Promise\.resolve|true|false|null|\d+)/.test(mainFileContent);
    if (unnecessaryAwait) {
      results.recommendations.push('💡 Remove unnecessary await keywords on non-promise values');
    }

    // Check for synchronous operations in done() callback
    const hasSyncInDone = /done\(\)(?!\s*;?\s*}\s*catch)/.test(mainFileContent);
    const hasAsyncOperations = /await|Promise|setTimeout|setImmediate/.test(mainFileContent);

    if (hasAsyncOperations && hasSyncInDone) {
      results.passed.push('✓ Proper done() callback usage for async operations');
    } else if (!hasAsyncOperations && hasSyncInDone) {
      results.passed.push('✓ Direct done() call for synchronous operations');
    }

    // Check for memory-efficient buffer handling
    const hasBufferOperations = /Buffer\.from|\.toString\(|contents/.test(mainFileContent);
    const hasStringConcatenation = /\+\s*['"`]|['"`]\s*\+/.test(mainFileContent);

    if (hasBufferOperations && hasStringConcatenation) {
      results.recommendations.push(
        '💡 Consider using Buffer methods instead of string concatenation for file content manipulation'
      );
    } else if (hasBufferOperations) {
      results.passed.push('✓ Efficient Buffer handling detected');
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check performance patterns: ${error.message}`);
  }
}

/**
 * Check security best practices
 */
async function checkSecurity(pluginPath, results, config) {
  try {
    const mainFilePath = path.join(pluginPath, 'src/index.js');
    const mainFileContent = await fs.readFile(mainFilePath, 'utf-8');

    // Check for dangerous operations
    const dangerousOperations = [
      { pattern: /eval\s*\(/, message: 'eval() usage detected - consider safer alternatives' },
      { pattern: /Function\s*\(/, message: 'Function constructor usage detected - potential security risk' },
      { pattern: /exec\s*\(|spawn\s*\(/, message: 'Shell execution detected - ensure proper input sanitization' },
      {
        pattern: /innerHTML|outerHTML/,
        message: 'innerHTML usage detected - potential XSS risk if handling user content'
      }
    ];

    for (const check of dangerousOperations) {
      if (check.pattern.test(mainFileContent)) {
        results.warnings.push(`⚠ Security concern: ${check.message}`);
      }
    }

    // Check for input sanitization patterns
    const hasInputValidation = /validate|sanitize|escape|clean|trim|normalize/.test(mainFileContent);
    const hasUserInput = /options|config|params|input|user/.test(mainFileContent);

    if (hasUserInput && hasInputValidation) {
      results.passed.push('✓ Input validation/sanitization patterns detected');
    } else if (hasUserInput) {
      results.recommendations.push('💡 Consider adding input validation/sanitization for user-provided options');
    }

    // Check for safe file path handling
    const hasPathOperations = /path\.join|path\.resolve|\.\.\/|\.\.\\/.test(mainFileContent);
    const hasPathSecurity = /path\.normalize|path\.resolve.*cwd|isAbsolute|startsWith/.test(mainFileContent);

    if (hasPathOperations && hasPathSecurity) {
      results.passed.push('✓ Safe file path handling detected');
    } else if (hasPathOperations) {
      results.recommendations.push('💡 Use path.resolve() and validate file paths to prevent directory traversal');
    }

    // Check for sensitive information exposure
    const sensitivePatternsInCode = [
      { pattern: /password|secret|key|token/i, message: 'Potential sensitive information in code' },
      { pattern: /api_key|apikey|api-key/i, message: 'API key references in code' },
      {
        pattern: /process\.env\.\w+.*console\.log|debug.*process\.env/i,
        message: 'Environment variables in debug output'
      }
    ];

    for (const check of sensitivePatternsInCode) {
      if (check.pattern.test(mainFileContent)) {
        results.warnings.push(`⚠ Security concern: ${check.message} - ensure no secrets are logged or exposed`);
      }
    }

    // Check for proper error handling
    const hasErrorHandling = /try\s*\{[\s\S]*catch|\.catch\s*\(/.test(mainFileContent);
    const hasAsyncOperations = /await|Promise|async/.test(mainFileContent);

    if (hasAsyncOperations && hasErrorHandling) {
      results.passed.push('✓ Error handling detected for async operations');
    } else if (hasAsyncOperations) {
      results.recommendations.push('💡 Add proper error handling for async operations to prevent information leakage');
    }

    // Check for buffer overflow protection
    const hasBufferLimits = /maxBuffer|limit|size.*check|length.*validate/.test(mainFileContent);
    const hasBufferOperations = /Buffer\.from|\.toString\(|readFile|writeFile/.test(mainFileContent);

    if (hasBufferOperations && hasBufferLimits) {
      results.passed.push('✓ Buffer size validation detected');
    } else if (hasBufferOperations) {
      results.recommendations.push('💡 Consider adding buffer size limits to prevent memory exhaustion attacks');
    }

    // Check for regex denial of service (ReDoS) patterns
    const regexPatterns = mainFileContent.match(/\/[^/\n]+\/[gimuy]*/g) || [];
    const dangerousRegexPatterns = regexPatterns.filter((pattern) => {
      // Check for common ReDoS patterns: nested quantifiers, alternation with overlap
      return (
        /\(\.\*\)[\*\+]|\(\.\+\)[\*\+]|\|.*\|.*\|/.test(pattern) ||
        /\([^)]*\*[^)]*\)\*|\([^)]*\+[^)]*\)\+/.test(pattern)
      );
    });

    if (dangerousRegexPatterns.length > 0) {
      results.warnings.push('⚠ Potential ReDoS vulnerability in regex patterns - test with long inputs');
    } else if (regexPatterns.length > 0) {
      results.passed.push('✓ Regex patterns appear safe from ReDoS attacks');
    }

    // Check for secure temp file handling
    const hasTempFiles = /tmp|temp|\.tmp\.|\/tmp\//.test(mainFileContent);
    const hasSecureTempHandling = /mkdtemp|createWriteStream.*mode|fs\.open.*mode/.test(mainFileContent);

    if (hasTempFiles && hasSecureTempHandling) {
      results.passed.push('✓ Secure temporary file handling detected');
    } else if (hasTempFiles) {
      results.recommendations.push('💡 Use secure temp file creation with proper permissions (e.g., fs.mkdtemp)');
    }

    // Check for dependency security
    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for known risky dependencies (this is a basic check)
      const riskyDeps = ['eval', 'vm2', 'serialize-javascript'];
      const foundRiskyDeps = Object.keys(allDeps).filter((dep) => riskyDeps.includes(dep));

      if (foundRiskyDeps.length > 0) {
        results.warnings.push(`⚠ Potentially risky dependencies detected: ${foundRiskyDeps.join(', ')}`);
      } else {
        results.passed.push('✓ No obviously risky dependencies detected');
      }

      // Check for outdated dependency patterns
      const hasAuditScript = packageJson.scripts?.audit || packageJson.scripts?.['audit:fix'];
      if (hasAuditScript) {
        results.passed.push('✓ Security audit script defined');
      } else {
        results.recommendations.push('💡 Add "audit": "npm audit" script to package.json for security monitoring');
      }
    } catch {
      // Could not read package.json
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check security patterns: ${error.message}`);
  }
}

/**
 * Check integration with common Metalsmith plugins
 */
async function checkIntegration(pluginPath, results, config) {
  try {
    const mainFilePath = path.join(pluginPath, 'src/index.js');
    const mainFileContent = await fs.readFile(mainFilePath, 'utf-8');

    // Check for metadata compatibility patterns
    const respectsMetadata = /files\[.*?\]\.(?!contents)/g.test(mainFileContent);
    const modifiesMetadata = /files\[.*?\]\.\w+\s*=|Object\.assign\(files\[.*?\]/.test(mainFileContent);

    if (respectsMetadata || modifiesMetadata) {
      results.passed.push('✓ Plugin respects/modifies file metadata appropriately');
    } else {
      results.recommendations.push(
        '💡 Ensure plugin works with file metadata from other plugins (e.g., frontmatter, collections)'
      );
    }

    // Check for metalsmith.metadata() usage
    const usesGlobalMetadata = /metalsmith\.metadata\(\)/.test(mainFileContent);
    if (usesGlobalMetadata) {
      results.passed.push('✓ Plugin accesses global metadata');
    } else {
      results.recommendations.push('💡 Consider using metalsmith.metadata() to access site-wide information');
    }

    // Check for common plugin compatibility patterns
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

    // Check for proper file extension handling
    const hasExtensionLogic = /\.endsWith\(|path\.extname|\.ext\b|\.extension/.test(mainFileContent);
    if (hasExtensionLogic) {
      results.passed.push('✓ Plugin handles file extensions properly');
    } else {
      results.recommendations.push('💡 Consider adding file extension validation for better plugin integration');
    }

    // Check for plugin ordering considerations
    const hasOrderingDocs = await checkForOrderingDocumentation(pluginPath);
    if (hasOrderingDocs) {
      results.passed.push('✓ Plugin documentation includes ordering considerations');
    } else {
      results.recommendations.push('💡 Document plugin ordering requirements in README (before/after other plugins)');
    }

    // Check test files for integration examples
    const testFiles = await glob('test/**/*.{js,cjs,mjs}', { cwd: pluginPath });
    let hasIntegrationTests = false;

    for (const testFile of testFiles) {
      try {
        const testContent = await fs.readFile(path.join(pluginPath, testFile), 'utf-8');
        if (/metalsmith-|@metalsmith\/|layouts|markdown|collections/.test(testContent)) {
          hasIntegrationTests = true;
          break;
        }
      } catch {
        // Continue
      }
    }

    if (hasIntegrationTests) {
      results.passed.push('✓ Integration tests with other plugins detected');
    } else {
      results.recommendations.push('💡 Consider adding integration tests with common Metalsmith plugins');
    }

    // Check for build pipeline examples in README
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

      // Check for common plugin mentions
      const mentionsCommonPlugins = /@metalsmith\/|metalsmith-layouts|metalsmith-markdown|metalsmith-collections/.test(
        readme
      );
      if (mentionsCommonPlugins) {
        results.passed.push('✓ Documentation references common Metalsmith plugins');
      } else {
        results.recommendations.push('💡 Consider mentioning compatibility with common plugins in documentation');
      }
    } catch {
      // Could not read README
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check integration patterns: ${error.message}`);
  }
}

/**
 * Check for plugin ordering documentation
 */
async function checkForOrderingDocumentation(pluginPath) {
  try {
    const readmePath = path.join(pluginPath, 'README.md');
    const readme = await fs.readFile(readmePath, 'utf-8');

    // Look for ordering-related keywords
    const orderingKeywords = /order|before|after|sequence|pipeline|placement|position/i;
    return orderingKeywords.test(readme);
  } catch {
    return false;
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
