import chalk from 'chalk';

/**
 * Show recommended configuration templates
 * @param {Object} args - Tool arguments
 * @param {string} args.template - Template to display
 * @returns {Object} Tool response
 */
export function showTemplateTool(args) {
  const { template } = args;

  try {
    const templateContent = getTemplate(template);

    const report = [
      chalk.bold(`📋 ${template} Template`),
      '',
      chalk.gray('Copy this configuration to your project:'),
      '',
      templateContent,
      '',
      chalk.yellow('💡 Usage Notes:'),
      ...getUsageNotes(template)
    ];

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
          text: `Failed to show template: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Get template content for the specified template type
 */
function getTemplate(template) {
  switch (template) {
    case 'release-it':
      return getReleaseItTemplate();

    case 'package-scripts':
      return getPackageScriptsTemplate();

    case 'biome':
      return getBiomeTemplate();

    case 'gitignore':
      return getGitignoreTemplate();

    case 'editorconfig':
      return getEditorconfigTemplate();

    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

/**
 * Get usage notes for the specified template
 */
function getUsageNotes(template) {
  switch (template) {
    case 'release-it':
      return [
        '  • Uses GH_TOKEN environment variable for GitHub authentication',
        '  • Requires GitHub CLI (gh) to be installed and authenticated',
        '  • Use with secure release scripts that export GH_TOKEN="$(gh auth token)"',
        '  • The tokenRef: "GH_TOKEN" matches the environment variable name'
      ];

    case 'package-scripts':
      return [
        '  • Tests run via the native node:test runner (no mocha/chai required)',
        '  • Coverage uses --experimental-test-coverage (Node >= 22)',
        '  • Lint + format handled by a single tool: @biomejs/biome',
        '  • Release script handles GitHub token securely via gh CLI',
        '  • --ci flag bypasses interactive prompts for automated releases'
      ];

    case 'biome':
      return [
        '  • Single tool replaces both ESLint and Prettier',
        '  • Run `npx biome check --write .` to lint + format in one pass',
        '  • Run `npx biome format .` for format-only checks',
        '  • Respects .gitignore via vcs.useIgnoreFile'
      ];

    case 'gitignore':
      return [
        '  • Covers Node.js, IDE, OS-specific, and build artifacts',
        '  • Includes test coverage and log file patterns',
        '  • Excludes environment files and temporary directories',
        '  • Optimized for Metalsmith plugin development workflow'
      ];

    case 'editorconfig':
      return [
        '  • Ensures consistent coding style across different editors',
        '  • Uses 2-space indentation for JavaScript and JSON files',
        '  • Enforces Unix line endings and UTF-8 encoding',
        '  • Special handling for Markdown and YAML files'
      ];

    default:
      return ['  • No specific usage notes available'];
  }
}

/**
 * Get .release-it.json template with proper token handling
 */
function getReleaseItTemplate() {
  const config = {
    git: {
      commitMessage: 'chore: release v${version}',
      requireCleanWorkingDir: true,
      requireBranch: 'main',
      tag: true,
      tagName: 'v${version}',
      push: true
    },
    github: {
      release: true,
      releaseName: 'v${version}',
      draft: false,
      autoGenerate: true,
      tokenRef: 'GH_TOKEN'
    },
    npm: {
      publish: true,
      publishPath: '.'
    },
    hooks: {
      'before:init': ['gh auth status', 'npm test', 'npm run lint:check'],
      'after:release': 'echo "✅ Successfully released ${name} v${version}"'
    }
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Get package.json scripts template with native test runner and biome
 */
function getPackageScriptsTemplate() {
  const scripts = {
    build:
      'microbundle --entry src/index.js --output lib/index.js --target node -f esm,cjs --strict --generateTypes=false',
    test: "node --test --test-timeout=15000 'test/**/*.test.js' 'test/**/*.test.cjs'",
    'test:esm': "node --test --test-timeout=15000 'test/**/*.test.js'",
    'test:cjs': "npm run build && node --test --test-timeout=15000 'test/**/*.test.cjs'",
    coverage:
      "mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=lcov --test-reporter-destination=coverage/lcov.info --test-timeout=15000 'test/**/*.test.js' 'test/**/*.test.cjs'",
    lint: 'biome check --write .',
    'lint:check': 'biome check .',
    format: 'biome format --write .',
    'format:check': 'biome format .',
    'release:patch': './scripts/release.sh patch --ci',
    'release:minor': './scripts/release.sh minor --ci',
    'release:major': './scripts/release.sh major --ci',
    'release:check': 'npm run lint:check && npm run build && release-it --dry-run'
  };

  return `Add these scripts to your package.json:

${JSON.stringify({ scripts }, null, 2)}

And create ./scripts/release.sh:

#!/bin/bash
export GH_TOKEN="$(gh auth token)"
npx release-it $1 $2`;
}

/**
 * Get Biome config template
 */
function getBiomeTemplate() {
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
    overrides: [
      {
        includes: ['test/**/*.js', 'test/**/*.cjs'],
        linter: { rules: { suspicious: { noConsole: 'off' } } }
      }
    ]
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Get .gitignore template
 */
function getGitignoreTemplate() {
  return `# Dependencies
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
test-results/`;
}

/**
 * Get .editorconfig template
 */
function getEditorconfigTemplate() {
  return `# EditorConfig is awesome: https://EditorConfig.org

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
indent_style = tab`;
}
