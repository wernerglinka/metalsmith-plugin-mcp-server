import { promises as fs } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { sanitizePath } from '../utils/path-security.js';

/**
 * Generate configuration files following enhanced standards
 * @param {Object} args - Tool arguments
 * @param {string} args.outputPath - Output directory
 * @param {string[]} args.configs - Configuration files to generate
 * @returns {Promise<Object>} Tool response
 */
export async function generateConfigsTool(args) {
  const { outputPath: userPath = '.', configs = ['biome', 'editorconfig', 'gitignore'] } = args;

  // Sanitize the output path to prevent traversal attacks
  const outputPath = sanitizePath(userPath, process.cwd());

  const generated = [];
  const errors = [];

  try {
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });

    // Generate requested configs
    for (const config of configs) {
      try {
        switch (config) {
          case 'biome':
            await generateBiomeConfig(outputPath);
            generated.push('biome.json');
            break;

          case 'editorconfig':
            await generateEditorConfig(outputPath);
            generated.push('.editorconfig');
            break;

          case 'gitignore':
            await generateGitignore(outputPath);
            generated.push('.gitignore');
            break;

          case 'release-it':
            await generateReleaseItConfig(outputPath);
            generated.push('.release-it.json');
            break;

          default:
            errors.push(`Unknown config type: ${config}`);
        }
      } catch (error) {
        errors.push(`Failed to generate ${config}: ${error.message}`);
      }
    }

    // Generate report
    const report = [chalk.bold('📝 Configuration Generation Report'), ''];

    if (generated.length > 0) {
      report.push(chalk.green.bold('Generated files:'));
      generated.forEach((file) => report.push(chalk.green(`  ✓ ${file}`)));
    }

    if (errors.length > 0) {
      report.push('');
      report.push(chalk.red.bold('Errors:'));
      errors.forEach((error) => report.push(chalk.red(`  ✗ ${error}`)));
    }

    report.push('');
    report.push('Next steps:');
    report.push('  1. Review the generated configuration files');
    report.push('  2. Adjust settings to match your project needs');
    report.push('  3. Run npm install to add any required dependencies');

    return {
      content: [
        {
          type: 'text',
          text: report.join('\n')
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to generate configs: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Generate Biome config (lint + format in one tool)
 */
async function generateBiomeConfig(outputPath) {
  const configPath = path.join(outputPath, 'biome.json');

  try {
    await fs.access(configPath);
    throw new Error('biome.json already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const config = {
    $schema: 'https://biomejs.dev/schemas/2.4.12/schema.json',
    vcs: {
      enabled: true,
      clientKind: 'git',
      useIgnoreFile: true
    },
    files: {
      ignoreUnknown: false,
      includes: [
        '**',
        '!**/node_modules',
        '!**/coverage',
        '!**/lib',
        '!**/test/fixtures',
        '!**/package-lock.json',
        '!**/CHANGELOG.md'
      ]
    },
    formatter: {
      enabled: true,
      indentStyle: 'space',
      indentWidth: 2,
      lineEnding: 'lf',
      lineWidth: 120
    },
    javascript: {
      formatter: {
        quoteStyle: 'single',
        trailingCommas: 'none',
        semicolons: 'always',
        bracketSpacing: true,
        arrowParentheses: 'always'
      }
    },
    linter: {
      enabled: true,
      rules: {
        recommended: true,
        complexity: {
          useArrowFunction: 'off',
          useOptionalChain: 'off'
        },
        suspicious: {
          noConsole: {
            level: 'error',
            options: { allow: ['warn', 'error'] }
          },
          noDebugger: 'error',
          noDoubleEquals: 'error'
        },
        security: {
          noGlobalEval: 'error'
        },
        style: {
          useConst: 'error',
          useTemplate: 'error',
          useBlockStatements: 'error'
        }
      }
    },
    assist: {
      enabled: true,
      actions: {
        source: {
          organizeImports: 'off'
        }
      }
    },
    overrides: [
      {
        includes: ['test/**/*.js', 'test/**/*.cjs'],
        linter: {
          rules: {
            suspicious: { noConsole: 'off' }
          }
        }
      }
    ]
  };

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * Generate .editorconfig
 */
async function generateEditorConfig(outputPath) {
  const configPath = path.join(outputPath, '.editorconfig');

  try {
    await fs.access(configPath);
    throw new Error('.editorconfig already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const config = `# EditorConfig is awesome: https://EditorConfig.org

# top-most EditorConfig file
root = true

# Unix-style newlines with a newline ending every file
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

# JavaScript/JSON files
[*.{js,cjs,mjs,json}]
indent_style = space
indent_size = 2

# Markdown files
[*.md]
trim_trailing_whitespace = false

# YAML files
[*.{yml,yaml}]
indent_style = space
indent_size = 2

# Package files
[{package.json,biome.json}]
indent_style = space
indent_size = 2

# Makefiles
[Makefile]
indent_style = tab
`;

  await fs.writeFile(configPath, config);
}

/**
 * Generate .gitignore
 */
async function generateGitignore(outputPath) {
  const configPath = path.join(outputPath, '.gitignore');

  try {
    await fs.access(configPath);
    throw new Error('.gitignore already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const config = `# Dependencies
node_modules/

# Build output
dist/
build/
lib/
out/

# Test coverage
coverage/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Environment files
.env
.env.local
.env.*.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Temporary files
tmp/
temp/
.tmp/

# Cache
.cache/

# Test artifacts
test-results/
`;

  await fs.writeFile(configPath, config);
}

/**
 * Generate release-it config
 */
async function generateReleaseItConfig(outputPath) {
  const configPath = path.join(outputPath, '.release-it.json');

  try {
    await fs.access(configPath);
    throw new Error('.release-it.json already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const config = {
    hooks: {
      'before:init': ['npm run lint:check', 'npm test'],
      'after:bump':
        "npx auto-changelog -p --commit-limit false --ignore-commit-pattern '^((dev|chore|ci):|Release)' && git add CHANGELOG.md",
      'after:release': 'echo Successfully released ${name} v${version} to ${repo.repository}.'
    },
    git: {
      commitMessage: 'Release ${version}',
      tagAnnotation: 'Release ${version}'
    },
    npm: {
      publish: false
    },
    github: {
      release: true,
      releaseName: '${name} ${version}',
      tokenRef: 'GH_TOKEN',
      autoGenerate: true
    }
  };

  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
