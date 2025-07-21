import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

/**
 * Validate a Metalsmith plugin against quality standards
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Plugin directory path
 * @param {string[]} args.checks - Checks to perform
 * @returns {Promise<Object>} Tool response
 */
export async function validatePluginTool( args ) {
  const { path: pluginPath, checks = [ 'structure', 'tests', 'docs', 'package-json' ] } = args;

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  try {
    // Verify plugin directory exists
    await fs.access( pluginPath );

    // Run selected checks
    for ( const check of checks ) {
      switch ( check ) {
      case 'structure':
        await checkStructure( pluginPath, results );
        break;
      case 'tests':
        await checkTests( pluginPath, results );
        break;
      case 'docs':
        await checkDocumentation( pluginPath, results );
        break;
      case 'package-json':
        await checkPackageJson( pluginPath, results );
        break;
      case 'eslint':
        await checkEslint( pluginPath, results );
        break;
      case 'coverage':
        await checkCoverage( pluginPath, results );
        break;
      }
    }

    // Generate report
    const report = generateReport( results );

    return {
      content: [
        {
          type: 'text',
          text: report,
        },
      ],
    };
  } catch ( error ) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to validate plugin: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Check plugin directory structure
 */
async function checkStructure( pluginPath, results ) {
  const requiredDirs = [ 'src', 'test' ];
  const requiredFiles = [ 'src/index.js', 'README.md', 'package.json' ];

  // Check directories
  for ( const dir of requiredDirs ) {
    const dirPath = path.join( pluginPath, dir );
    try {
      const stats = await fs.stat( dirPath );
      if ( stats.isDirectory() ) {
        results.passed.push( `✓ Directory ${dir} exists` );
      }
    } catch {
      results.failed.push( `✗ Missing required directory: ${dir}` );
    }
  }

  // Check files
  for ( const file of requiredFiles ) {
    const filePath = path.join( pluginPath, file );
    try {
      await fs.access( filePath );
      results.passed.push( `✓ File ${file} exists` );
    } catch {
      results.failed.push( `✗ Missing required file: ${file}` );
    }
  }

  // Check for recommended structure
  const recommendedDirs = [ 'src/utils', 'src/processors', 'test/fixtures' ];
  for ( const dir of recommendedDirs ) {
    const dirPath = path.join( pluginPath, dir );
    try {
      await fs.stat( dirPath );
      results.passed.push( `✓ Recommended directory ${dir} exists` );
    } catch {
      results.warnings.push( `⚠ Missing recommended directory: ${dir}` );
    }
  }
}

/**
 * Check test setup and coverage
 */
async function checkTests( pluginPath, results ) {
  try {
    // Check for test files
    const testFiles = await glob( 'test/**/*.test.js', { cwd: pluginPath } );

    if ( testFiles.length > 0 ) {
      results.passed.push( `✓ Found ${testFiles.length} test file(s)` );
    } else {
      results.failed.push( '✗ No test files found' );
    }

    // Check for test fixtures
    const fixtureFiles = await glob( 'test/fixtures/**/*', { cwd: pluginPath } );
    if ( fixtureFiles.length > 0 ) {
      results.passed.push( `✓ Test fixtures present (${fixtureFiles.length} files)` );
    } else {
      results.warnings.push( '⚠ No test fixtures found' );
    }

    // Check package.json for test script
    const packageJson = JSON.parse( await fs.readFile( path.join( pluginPath, 'package.json' ), 'utf-8' ) );

    if ( packageJson.scripts?.test ) {
      results.passed.push( '✓ Test script defined in package.json' );
    } else {
      results.failed.push( '✗ No test script in package.json' );
    }

    if ( packageJson.scripts?.['test:coverage'] || packageJson.scripts?.coverage ) {
      results.passed.push( '✓ Coverage script defined' );
    } else {
      results.warnings.push( '⚠ No coverage script defined' );
    }
  } catch ( error ) {
    results.failed.push( `✗ Error checking tests: ${error.message}` );
  }
}

/**
 * Check documentation quality
 */
async function checkDocumentation( pluginPath, results ) {
  try {
    const readmePath = path.join( pluginPath, 'README.md' );
    const readme = await fs.readFile( readmePath, 'utf-8' );

    // Check README sections
    const requiredSections = [
      { pattern: /##?\s+Install/i, name: 'Installation' },
      { pattern: /##?\s+Usage/i, name: 'Usage' },
      { pattern: /##?\s+Options/i, name: 'Options' },
      { pattern: /##?\s+Example/i, name: 'Examples' },
    ];

    for ( const section of requiredSections ) {
      if ( section.pattern.test( readme ) ) {
        results.passed.push( `✓ README includes ${section.name} section` );
      } else {
        results.warnings.push( `⚠ README missing ${section.name} section` );
      }
    }

    // Check for badges
    if ( readme.includes( '![' ) ) {
      results.passed.push( '✓ README includes badges' );
    } else {
      results.warnings.push( '⚠ README has no badges' );
    }

    // Check for code examples
    if ( readme.includes( '```' ) ) {
      results.passed.push( '✓ README includes code examples' );
    } else {
      results.warnings.push( '⚠ README has no code examples' );
    }

    // Check for license file
    try {
      await fs.access( path.join( pluginPath, 'LICENSE' ) );
      results.passed.push( '✓ LICENSE file exists' );
    } catch {
      results.warnings.push( '⚠ No LICENSE file' );
    }
  } catch ( error ) {
    results.failed.push( `✗ Error checking documentation: ${error.message}` );
  }
}

/**
 * Check package.json standards
 */
async function checkPackageJson( pluginPath, results ) {
  try {
    const packageJson = JSON.parse( await fs.readFile( path.join( pluginPath, 'package.json' ), 'utf-8' ) );

    // Required fields
    const requiredFields = [ 'name', 'version', 'description', 'license' ];
    for ( const field of requiredFields ) {
      if ( packageJson[field] ) {
        results.passed.push( `✓ package.json has ${field}` );
      } else {
        results.failed.push( `✗ package.json missing ${field}` );
      }
    }

    // Check for entry point (main or exports)
    if ( packageJson.main || packageJson.exports ) {
      if ( packageJson.exports ) {
        results.passed.push( '✓ package.json has exports field (modern ES modules)' );
      } else {
        results.passed.push( '✓ package.json has main field' );
      }
    } else {
      results.failed.push( '✗ package.json missing entry point (main or exports)' );
    }

    // Check name convention
    if ( packageJson.name?.startsWith( 'metalsmith-' ) ) {
      results.passed.push( '✓ Plugin name follows convention' );
    } else {
      results.failed.push( '✗ Plugin name should start with "metalsmith-"' );
    }

    // Recommended fields
    const recommendedFields = [ 'repository', 'keywords', 'engines', 'files' ];
    for ( const field of recommendedFields ) {
      if ( packageJson[field] ) {
        results.passed.push( `✓ package.json has ${field}` );
      } else {
        results.warnings.push( `⚠ package.json missing recommended field: ${field}` );
      }
    }

    // Check for proper exports
    if ( packageJson.type === 'module' || packageJson.exports ) {
      results.passed.push( '✓ Modern module system configured' );
    } else {
      results.warnings.push( '⚠ Consider using ES modules' );
    }

    // Check scripts
    const recommendedScripts = [ 'lint', 'format', 'test:coverage' ];
    for ( const script of recommendedScripts ) {
      if ( packageJson.scripts?.[script] ) {
        results.passed.push( `✓ Script "${script}" defined` );
      } else {
        results.warnings.push( `⚠ Missing recommended script: ${script}` );
      }
    }
  } catch ( error ) {
    results.failed.push( `✗ Error checking package.json: ${error.message}` );
  }
}

/**
 * Check ESLint configuration
 */
async function checkEslint( pluginPath, results ) {
  const eslintFiles = [ 'eslint.config.js', '.eslintrc.js', '.eslintrc.json' ];
  let found = false;

  for ( const file of eslintFiles ) {
    try {
      await fs.access( path.join( pluginPath, file ) );
      results.passed.push( `✓ ESLint configuration found: ${file}` );
      found = true;
      break;
    } catch {
      // Continue checking
    }
  }

  if ( !found ) {
    results.warnings.push( '⚠ No ESLint configuration found' );
  }

  // Check for modern flat config
  try {
    await fs.access( path.join( pluginPath, 'eslint.config.js' ) );
    results.passed.push( '✓ Using modern ESLint flat config' );
  } catch {
    // Not using flat config
  }
}

/**
 * Check test coverage
 */
async function checkCoverage( pluginPath, results ) {
  try {
    // Check if this is a new plugin (no node_modules = no tests run yet)
    const isNewPlugin = !( await fs
      .access( path.join( pluginPath, 'node_modules' ) )
      .then( () => true )
      .catch( () => false ) );

    // Look for coverage reports
    const coverageFiles = await glob( 'coverage/**/*', { cwd: pluginPath } );

    if ( coverageFiles.length > 0 ) {
      results.passed.push( '✓ Coverage reports found' );

      // Try to read coverage summary
      try {
        const summaryPath = path.join( pluginPath, 'coverage/coverage-summary.json' );
        const summary = JSON.parse( await fs.readFile( summaryPath, 'utf-8' ) );
        const total = summary.total;

        if ( total ) {
          const coverage = total.lines.pct;
          if ( coverage >= 90 ) {
            results.passed.push( `✓ Excellent test coverage: ${coverage}%` );
          } else if ( coverage >= 80 ) {
            results.passed.push( `✓ Good test coverage: ${coverage}%` );
          } else {
            results.warnings.push( `⚠ Low test coverage: ${coverage}%` );
          }
        }
      } catch {
        // Could not read coverage summary
      }
    } else {
      if ( isNewPlugin ) {
        // Don't penalize new plugins - just provide helpful info
        results.passed.push( "ℹ Coverage reports will be generated after running 'npm run test:coverage'" );
      } else {
        // Only warn if tests have likely been run
        results.warnings.push( "⚠ No coverage reports found - run 'npm run test:coverage' to generate" );
      }
    }

    // Check for coverage configuration
    const coverageConfigExists = await Promise.all( [
      fs
        .access( path.join( pluginPath, '.c8rc.json' ) )
        .then( () => true )
        .catch( () => false ),
      fs
        .access( path.join( pluginPath, '.nycrc' ) )
        .then( () => true )
        .catch( () => false ),
      fs
        .access( path.join( pluginPath, '.nycrc.json' ) )
        .then( () => true )
        .catch( () => false ),
    ] ).then( ( results ) => results.some( ( exists ) => exists ) );

    if ( coverageConfigExists ) {
      results.passed.push( '✓ Coverage configuration found' );
    } else {
      results.warnings.push( '⚠ No coverage configuration found (.c8rc.json recommended)' );
    }
  } catch ( error ) {
    results.warnings.push( `⚠ Could not check coverage: ${error.message}` );
  }
}

/**
 * Generate validation report
 */
function generateReport( results ) {
  const lines = [ chalk.bold( '🔍 Plugin Validation Report' ), '' ];

  if ( results.passed.length > 0 ) {
    lines.push( chalk.green.bold( `Passed (${results.passed.length}):` ) );
    results.passed.forEach( ( item ) => lines.push( chalk.green( item ) ) );
    lines.push( '' );
  }

  if ( results.warnings.length > 0 ) {
    lines.push( chalk.yellow.bold( `Warnings (${results.warnings.length}):` ) );
    results.warnings.forEach( ( item ) => lines.push( chalk.yellow( item ) ) );
    lines.push( '' );
  }

  if ( results.failed.length > 0 ) {
    lines.push( chalk.red.bold( `Failed (${results.failed.length}):` ) );
    results.failed.forEach( ( item ) => lines.push( chalk.red( item ) ) );
    lines.push( '' );
  }

  // Summary
  const total = results.passed.length + results.warnings.length + results.failed.length;
  const score = Math.round( ( results.passed.length / total ) * 100 );

  lines.push( chalk.bold( 'Summary:' ) );
  lines.push( `Total checks: ${total}` );
  lines.push( `Quality score: ${score}%` );

  if ( results.failed.length === 0 ) {
    lines.push( chalk.green.bold( '✅ Plugin meets quality standards!' ) );
  } else {
    lines.push( chalk.red.bold( '❌ Plugin needs improvements' ) );
  }

  return lines.join( '\n' );
}
