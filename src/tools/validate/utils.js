import { promises as fs } from 'node:fs';
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { sanitizePath } from '../../utils/path-security.js';

const DEFAULT_CONFIG = {
  rules: {
    structure: {
      enabled: true,
      requiredDirs: ['src', 'test'],
      requiredFiles: ['src/index.js', 'README.md', 'package.json'],
      recommendedDirs: ['src/utils', 'src/processors', 'test/fixtures', '.github/workflows', 'scripts'],
      recommendedFiles: [
        '.release-it.json',
        'CLAUDE.md',
        '.github/workflows/test.yml',
        '.github/workflows/test-matrix.yml',
        '.github/workflows/claude-code.yml',
        '.github/dependabot.yml',
        'scripts/release.sh'
      ]
    },
    tests: { enabled: true, coverageThreshold: 80, requireFixtures: false },
    documentation: {
      enabled: true,
      requiredSections: [],
      recommendedSections: ['Installation', 'Usage', 'Options', 'Examples']
    },
    packageJson: {
      namePrefix: 'metalsmith-',
      requiredScripts: ['test'],
      recommendedScripts: ['lint', 'format', 'test:coverage', 'release:patch', 'release:minor', 'release:major']
    }
  },
  recommendations: { showCommands: true, templateSuggestions: true }
};

export async function loadValidationConfig(pluginPath) {
  const configPaths = [
    path.join(pluginPath, '.metalsmith-plugin-validation.json'),
    path.join(pluginPath, '.validation.json'),
    path.join(pluginPath, '.validationrc.json')
  ];

  for (const configPath of configPaths) {
    try {
      const userConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      return deepMerge(DEFAULT_CONFIG, userConfig);
    } catch {
      // try next path
    }
  }

  return DEFAULT_CONFIG;
}

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

export async function analyzeClaudeStandards(pluginPath) {
  const claudePath = path.join(pluginPath, 'CLAUDE.md');

  try {
    const claudeContent = await fs.readFile(claudePath, 'utf-8');
    const analysis = {
      exists: true,
      hasReleasePatterns: false,
      hasTokenPatterns: false,
      approvedReleasePattern: null,
      approvedTokenPattern: null
    };

    if (
      claudeContent.includes('npm run release:') &&
      claudeContent.includes('GH_TOKEN=$(gh auth token)') &&
      !claudeContent.includes('Update to:') &&
      !claudeContent.includes('./scripts/release.sh')
    ) {
      analysis.hasReleasePatterns = true;
      analysis.hasTokenPatterns = true;
      analysis.approvedReleasePattern = 'npm-script-with-gh-token';
      analysis.approvedTokenPattern = 'npm-script-with-gh-token';
    } else if (
      claudeContent.includes('./scripts/release.sh') &&
      (claudeContent.includes('export GH_TOKEN="$(gh auth token)"') ||
        claudeContent.includes('export GH_TOKEN=$(gh auth token)'))
    ) {
      analysis.hasReleasePatterns = true;
      analysis.hasTokenPatterns = true;
      analysis.approvedReleasePattern = 'shell-script';
      analysis.approvedTokenPattern = 'shell-script';
    } else if (
      claudeContent.includes('GH_TOKEN=$(gh auth token)') &&
      !claudeContent.includes('exposes GitHub token') &&
      !claudeContent.includes('Update to:')
    ) {
      analysis.hasTokenPatterns = true;
      analysis.approvedTokenPattern = 'npm-script-with-gh-token';
    }

    return analysis;
  } catch {
    return {
      exists: false,
      hasReleasePatterns: false,
      hasTokenPatterns: false,
      approvedReleasePattern: null,
      approvedTokenPattern: null
    };
  }
}

/**
 * Read the plugin's JavaScript source for content-pattern checks.
 *
 * Returns the entry-file content and the concatenated content of every
 * `src/**\/*.js` file. Use `entry` for checks that target the default
 * export itself (factory pattern, function signature, JSDoc on the
 * exported function). Use `all` for checks that look for the presence
 * or absence of code patterns anywhere in the plugin — iteration
 * style, native-method usage, metadata handling — where the pattern
 * legitimately lives in a module imported by the entry file.
 *
 * The entry file appears in `all` as well; that's a harmless
 * duplication that keeps the regex semantics unchanged for plugins
 * that aren't modular.
 */
export async function readPluginSource(pluginPath) {
  const entryPath = path.join(pluginPath, 'src/index.js');
  let entry = '';
  try {
    entry = await fs.readFile(entryPath, 'utf-8');
  } catch {
    // entry missing — structure check reports this separately
  }

  let srcFiles = [];
  try {
    srcFiles = await Array.fromAsync(glob('src/**/*.js', { cwd: pluginPath }));
  } catch {
    // no src/ directory
  }

  const parts = await Promise.all(
    srcFiles.map(async (file) => {
      try {
        return await fs.readFile(path.join(pluginPath, file), 'utf-8');
      } catch {
        return '';
      }
    })
  );

  return { entry, all: parts.join('\n') };
}

export async function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: 'pipe', timeout: 60000 });
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
      resolve({ success: false, error: 'Command timed out after 60 seconds', summary: '' });
    }, 60000);

    child.on('exit', (code) => {
      clearTimeout(timeout);
      const success = code === 0;
      let summary = '';
      if (success) {
        const testPattern = /(\d+)\s+passing|(\d+)\s+tests?\s+passed/i;
        const match = stdout.match(testPattern) || stderr.match(testPattern);
        summary = match ? `${match[1] || match[2]} tests passed` : 'completed successfully';
      }
      resolve({
        success,
        error: success ? '' : stderr || stdout || `Command failed with code ${code}`,
        summary,
        output: stdout,
        stderr
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ success: false, error: error.message, summary: '' });
    });
  });
}

/**
 * Resolve a package.json script to its effective shell content. If the script
 * invokes a shell script in the repo (e.g. `./scripts/test.sh`,
 * `bash scripts/test.sh`), read and return that file so downstream checks can
 * inspect the actual commands. Returns the original script otherwise.
 */
export async function resolveScriptContent(pluginPath, script) {
  if (!script) {
    return '';
  }
  const match = script.match(/(?:^|\s)(?:bash\s+|sh\s+)?(?:\.\/)?(scripts\/[\w.-]+\.sh)\b/);
  if (!match) {
    return script;
  }
  try {
    const scriptFile = sanitizePath(match[1], pluginPath);
    return await fs.readFile(scriptFile, 'utf-8');
  } catch {
    return script;
  }
}
