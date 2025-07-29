import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import chalk from 'chalk';

/**
 * Update dependencies using npm's built-in commands
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Plugin directory path or parent directory
 * @param {boolean} args.major - Include major version updates
 * @param {boolean} args.interactive - Run in interactive mode
 * @param {boolean} args.dryRun - Show what would be updated without making changes
 * @param {boolean} args.install - Auto-install updates after applying them
 * @param {boolean} args.test - Run tests after installing updates
 * @returns {Promise<Object>} Tool response
 */
export async function updateDepsTool(args) {
  const {
    path: targetPath = '.',
    major = false,
    interactive = false,
    dryRun = false,
    install = false,
    test = false
  } = args;

  const results = [];

  try {
    // Determine if we're processing a single plugin or multiple plugins
    const plugins = await findPlugins(targetPath);

    if (plugins.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: chalk.yellow(`No plugins found to update in: ${targetPath}`)
          }
        ]
      };
    }

    // Process each plugin
    for (const pluginPath of plugins) {
      const result = await updatePluginDeps(pluginPath, { major, interactive, dryRun });
      results.push(result);

      // Auto-install if requested and updates were successful
      if (install && result.success && result.hasUpdates && !dryRun) {
        const installResult = await runNpmInstall(pluginPath);
        result.installResult = installResult;

        // Run tests if requested and install was successful
        if (test && installResult.success) {
          const testResult = await runTests(pluginPath);
          result.testResult = testResult;
        }
      }
    }

    // Generate report
    const report = generateUpdateReport(results);

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
          text: `Failed to update dependencies: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Find plugin directories to process
 */
async function findPlugins(targetPath) {
  const plugins = [];

  try {
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      // Check if this directory has a package.json (single plugin)
      try {
        await fs.access(path.join(targetPath, 'package.json'));

        // Check if it's a metalsmith plugin or any plugin with package.json
        const packageJson = JSON.parse(await fs.readFile(path.join(targetPath, 'package.json'), 'utf-8'));
        if (packageJson.name) {
          // If user explicitly targets a directory with package.json, treat it as a single plugin
          // regardless of whether it follows metalsmith naming conventions
          plugins.push(targetPath);
          // IMPORTANT: Return early here - don't look for subdirectories
          return plugins;
        } else {
          // No name in package.json, look for subdirectories
          const subdirs = await findPluginSubdirectories(targetPath);
          plugins.push(...subdirs);
        }
      } catch {
        // No package.json, look for plugin subdirectories
        const subdirs = await findPluginSubdirectories(targetPath);
        plugins.push(...subdirs);
      }
    }
  } catch {
    throw new Error(`Cannot access path: ${targetPath}`);
  }

  return plugins;
}

/**
 * Find plugin subdirectories in a parent directory
 */
async function findPluginSubdirectories(parentPath) {
  const plugins = [];

  // Directories to exclude from plugin search
  const excludedDirs = ['node_modules', '.git', 'coverage', 'dist', 'build', 'lib', '.next', '.nuxt', 'tmp', 'temp'];

  try {
    const entries = await fs.readdir(parentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !excludedDirs.includes(entry.name) && !entry.name.startsWith('.')) {
        const pluginPath = path.join(parentPath, entry.name);

        try {
          // Check if it has a package.json
          await fs.access(path.join(pluginPath, 'package.json'));

          // Check if it has a package.json with a name and looks like a metalsmith plugin
          const packageJson = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));
          if (packageJson.name && packageJson.name.startsWith('metalsmith-')) {
            plugins.push(pluginPath);
          }
        } catch {
          // Skip directories without package.json or that aren't metalsmith plugins
        }
      }
    }
  } catch {
    throw new Error(`Cannot read directory: ${parentPath}`);
  }

  return plugins;
}

/**
 * Get outdated dependencies using npm outdated
 */
// eslint-disable-next-line require-await
async function getOutdatedDeps(pluginPath) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['outdated', '--json'], {
      cwd: pluginPath,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      // npm outdated returns exit code 1 when there are outdated deps
      // This is expected behavior, not an error
      if (code === 0 || code === 1) {
        try {
          const outdated = stdout ? JSON.parse(stdout) : {};
          resolve({
            success: true,
            outdated,
            error: null
          });
        } catch (error) {
          resolve({
            success: false,
            outdated: {},
            error: `Failed to parse npm outdated output: ${error.message}`
          });
        }
      } else {
        resolve({
          success: false,
          outdated: {},
          error: stderr || 'Failed to check outdated dependencies'
        });
      }
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        outdated: {},
        error: error.message
      });
    });
  });
}

/**
 * Update dependencies for a single plugin
 */
async function updatePluginDeps(pluginPath, options) {
  const { major, dryRun } = options;
  const pluginName = path.basename(pluginPath);

  try {
    // First, check what's outdated
    const outdatedResult = await getOutdatedDeps(pluginPath);

    if (!outdatedResult.success) {
      return {
        plugin: pluginName,
        path: pluginPath,
        success: false,
        output: '',
        error: outdatedResult.error,
        hasUpdates: false
      };
    }

    const outdated = outdatedResult.outdated;
    const deps = Object.keys(outdated);

    if (deps.length === 0) {
      return {
        plugin: pluginName,
        path: pluginPath,
        success: true,
        output: 'All dependencies are up to date',
        error: '',
        hasUpdates: false
      };
    }

    // Filter dependencies based on major flag
    const depsToUpdate = [];
    const updateInfo = [];

    for (const dep of deps) {
      const info = outdated[dep];
      const current = info.current;
      const wanted = info.wanted;
      const latest = info.latest;

      // Determine if this is a major update
      const currentMajor = current ? parseInt(current.split('.')[0]) : 0;
      const latestMajor = latest ? parseInt(latest.split('.')[0]) : 0;
      const isMajor = latestMajor > currentMajor;

      if (major || !isMajor) {
        const targetVersion = major ? latest : wanted;
        if (targetVersion && targetVersion !== current) {
          depsToUpdate.push(`${dep}@${targetVersion}`);
          updateInfo.push(`${dep}: ${current} → ${targetVersion}${isMajor ? ' (major)' : ''}`);
        }
      } else if (wanted !== current) {
        // For non-major updates when major flag is false
        depsToUpdate.push(`${dep}@${wanted}`);
        updateInfo.push(`${dep}: ${current} → ${wanted}`);
      }
    }

    if (depsToUpdate.length === 0) {
      return {
        plugin: pluginName,
        path: pluginPath,
        success: true,
        output: major ? 'All dependencies are up to date' : 'No minor/patch updates available',
        error: '',
        hasUpdates: false
      };
    }

    // If dry run, just report what would be updated
    if (dryRun) {
      return {
        plugin: pluginName,
        path: pluginPath,
        success: true,
        output: updateInfo.join('\n'),
        error: '',
        hasUpdates: true,
        dryRun: true
      };
    }

    // Actually update the dependencies
    const updateResult = await runNpmUpdate(pluginPath, depsToUpdate);

    return {
      plugin: pluginName,
      path: pluginPath,
      success: updateResult.success,
      output: updateInfo.join('\n'),
      error: updateResult.error,
      hasUpdates: updateResult.success
    };
  } catch (error) {
    return {
      plugin: pluginName,
      path: pluginPath,
      success: false,
      output: '',
      error: error.message,
      hasUpdates: false
    };
  }
}

/**
 * Run npm update for specific packages
 */
// eslint-disable-next-line require-await
async function runNpmUpdate(pluginPath, packages) {
  return new Promise((resolve) => {
    const args = ['install', ...packages, '--save-exact'];

    const child = spawn('npm', args, {
      cwd: pluginPath,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr
      });
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        output: '',
        error: error.message
      });
    });
  });
}

/**
 * Run npm install in a plugin directory
 */
// eslint-disable-next-line require-await
async function runNpmInstall(pluginPath) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['install'], {
      cwd: pluginPath,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr
      });
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        output: '',
        error: error.message
      });
    });
  });
}

/**
 * Run tests in a plugin directory
 */
// eslint-disable-next-line require-await
async function runTests(pluginPath) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['test'], {
      cwd: pluginPath,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr
      });
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        output: '',
        error: error.message
      });
    });
  });
}

/**
 * Generate update report
 */
function generateUpdateReport(results) {
  const lines = [chalk.bold('📦 Dependency Update Report'), ''];

  const failed = results.filter((r) => !r.success);
  const withUpdates = results.filter((r) => r.hasUpdates);
  const noUpdates = results.filter((r) => r.success && !r.hasUpdates);

  // Summary
  lines.push(chalk.bold('Summary:'));
  lines.push(`Total plugins processed: ${results.length}`);
  lines.push(`Plugins with updates: ${withUpdates.length}`);
  lines.push(`Plugins up-to-date: ${noUpdates.length}`);
  lines.push(`Failed: ${failed.length}`);
  lines.push('');

  // Plugins with updates
  if (withUpdates.length > 0) {
    lines.push(chalk.green.bold(`✅ Plugins with updates (${withUpdates.length}):`));
    withUpdates.forEach((result) => {
      lines.push(chalk.green(`  ${result.plugin}:`));

      // Display the updates
      const updateLines = result.output.split('\n');
      updateLines.forEach((line) => {
        if (line.trim()) {
          lines.push(`    ${line.trim()}`);
        }
      });

      if (result.dryRun) {
        lines.push(chalk.yellow('    (dry run - no changes made)'));
      }

      // Show install results if available
      if (result.installResult) {
        if (result.installResult.success) {
          lines.push(chalk.green('    ✓ Dependencies installed successfully'));
        } else {
          lines.push(chalk.red('    ✗ Failed to install dependencies'));
          if (result.installResult.error) {
            lines.push(chalk.red(`      ${result.installResult.error}`));
          }
        }
      }

      // Show test results if available
      if (result.testResult) {
        if (result.testResult.success) {
          lines.push(chalk.green('    ✓ Tests passed'));
        } else {
          lines.push(chalk.red('    ✗ Tests failed'));
          if (result.testResult.error) {
            lines.push(chalk.red(`      ${result.testResult.error}`));
          }
        }
      }

      lines.push('');
    });
  }

  // Plugins that are up-to-date
  if (noUpdates.length > 0) {
    lines.push(chalk.blue.bold(`ℹ️  Up-to-date plugins (${noUpdates.length}):`));
    noUpdates.forEach((result) => {
      lines.push(chalk.blue(`  ✓ ${result.plugin}`));
    });
    lines.push('');
  }

  // Failed plugins
  if (failed.length > 0) {
    lines.push(chalk.red.bold(`❌ Failed plugins (${failed.length}):`));
    failed.forEach((result) => {
      lines.push(chalk.red(`  ✗ ${result.plugin}: ${result.error}`));
    });
    lines.push('');
  }

  // Next steps
  if (withUpdates.length > 0) {
    const hasAutoInstall = results.some((r) => r.installResult);
    const hasAutoTest = results.some((r) => r.testResult);
    const hasDryRun = results.some((r) => r.dryRun);

    if (!hasAutoInstall || !hasAutoTest || hasDryRun) {
      lines.push(chalk.bold('Next steps:'));

      if (hasDryRun) {
        lines.push('• Run without --dry-run to apply updates');
      } else {
        lines.push('• Review the updates above');

        if (!hasAutoInstall) {
          lines.push('• Run `npm install` in plugins that were updated');
        }

        if (!hasAutoTest) {
          lines.push('• Run tests in updated plugins to ensure compatibility');
        }

        lines.push('• Check for any breaking changes in major version updates');
      }
    }
  }

  return lines.join('\n');
}
