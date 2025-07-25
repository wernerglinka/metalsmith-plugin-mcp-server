import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

/**
 * Update dependencies using npm-check-updates
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
    // Check if ncu is available
    await checkNcuAvailable();

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
 * Check if npm-check-updates is available
 */
async function checkNcuAvailable() {
  return new Promise((resolve, reject) => {
    const child = spawn('ncu', ['--version'], { stdio: 'pipe' });

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(
          new Error(
            'npm-check-updates (ncu) is not installed. Please install it with: npm install -g npm-check-updates'
          )
        );
      } else {
        reject(error);
      }
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('npm-check-updates is not working properly'));
      }
    });
  });
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
  } catch (error) {
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
  } catch (error) {
    throw new Error(`Cannot read directory: ${parentPath}`);
  }

  return plugins;
}

/**
 * Update dependencies for a single plugin
 */
async function updatePluginDeps(pluginPath, options) {
  const { major, interactive, dryRun } = options;

  return new Promise((resolve) => {
    const args = [];

    // Build ncu command arguments
    if (!major) {
      args.push('--target', 'minor');
    }

    if (interactive) {
      args.push('--interactive');
    }

    if (!dryRun) {
      args.push('--upgrade');
    }

    // Add format for better output
    args.push('--format', 'group');

    // Add timeout to prevent hanging
    args.push('--timeout', '30000');

    const child = spawn('ncu', args, {
      cwd: pluginPath,
      stdio: 'pipe'
    });

    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      const pluginName = path.basename(pluginPath);
      child.kill('SIGTERM');
      resolve({
        plugin: pluginName,
        path: pluginPath,
        success: false,
        output: '',
        error: 'Command timed out after 60 seconds',
        hasUpdates: false
      });
    }, 60000);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      const pluginName = path.basename(pluginPath);

      resolve({
        plugin: pluginName,
        path: pluginPath,
        success: code === 0,
        output: stdout,
        error: stderr,
        hasUpdates: stdout.includes('upgraded') || stdout.includes('→')
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      const pluginName = path.basename(pluginPath);

      resolve({
        plugin: pluginName,
        path: pluginPath,
        success: false,
        output: '',
        error: error.message,
        hasUpdates: false
      });
    });
  });
}

/**
 * Run npm install in a plugin directory
 */
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

  const successful = results.filter((r) => r.success);
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
      // Parse and display the updates
      const updateLines = result.output.split('\n').filter((line) => line.includes('→') || line.trim().startsWith('✓'));
      updateLines.forEach((line) => {
        if (line.trim()) {
          lines.push(`    ${line.trim()}`);
        }
      });

      // Show install results if available
      if (result.installResult) {
        if (result.installResult.success) {
          lines.push(chalk.green('    ✓ Dependencies installed successfully'));
        } else {
          lines.push(chalk.red('    ✗ Failed to install dependencies'));
          lines.push(chalk.red(`      ${result.installResult.error}`));
        }
      }

      // Show test results if available
      if (result.testResult) {
        if (result.testResult.success) {
          lines.push(chalk.green('    ✓ Tests passed'));
        } else {
          lines.push(chalk.red('    ✗ Tests failed'));
          lines.push(chalk.red(`      ${result.testResult.error}`));
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

    if (!hasAutoInstall || !hasAutoTest) {
      lines.push(chalk.bold('Next steps:'));
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

  return lines.join('\n');
}
