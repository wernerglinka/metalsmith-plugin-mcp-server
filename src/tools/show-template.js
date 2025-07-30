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

    case 'eslint':
      return getEslintTemplate();

    case 'prettier':
      return getPrettierTemplate();

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
        '  • Use with secure release scripts that export GH_TOKEN=$(gh auth token)',
        '  • The tokenRef: "GH_TOKEN" matches the environment variable name'
      ];

    case 'package-scripts':
      return [
        '  • Scripts use secure shell script for GitHub token handling',
        '  • ./scripts/release.sh should export GH_TOKEN=$(gh auth token)',
        '  • --ci flag bypasses interactive prompts for automated releases',
        '  • Requires release-it and GitHub CLI to be installed'
      ];

    case 'eslint':
      return [
        '  • Uses modern ESLint flat config format (eslint.config.js)',
        '  • Configured for Node.js and Mocha test environments',
        '  • Includes comprehensive style and best practice rules',
        '  • Special rules for test files to allow Chai assertions'
      ];

    case 'prettier':
      return [
        '  • Consistent formatting across JavaScript and Markdown files',
        '  • Uses single quotes and trailing commas for ES5 compatibility',
        '  • Special Markdown formatting rules for better readability',
        '  • Integrates well with ESLint configuration'
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
      'before:init': ['gh auth status', 'npm test', 'npm run lint'],
      'after:release': 'echo "✅ Successfully released ${name} v${version}"'
    }
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Get package.json scripts template with secure release handling
 */
function getPackageScriptsTemplate() {
  const scripts = {
    'release:patch': './scripts/release.sh patch --ci',
    'release:minor': './scripts/release.sh minor --ci',
    'release:major': './scripts/release.sh major --ci',
    'release:check': 'npm run lint:check && ./scripts/release.sh patch --dry-run',
    lint: 'eslint --fix .',
    'lint:check': 'eslint --fix-dry-run .',
    test: 'mocha test/**/*.test.js',
    coverage: 'c8 --include=src/**/*.js --reporter=lcov --reporter=text-summary mocha test/**/*.test.js'
  };

  return `Add these scripts to your package.json:

${JSON.stringify({ scripts }, null, 2)}

And create ./scripts/release.sh:

#!/bin/bash
export GH_TOKEN=$(gh auth token)
npx release-it $1 $2`;
}

/**
 * Get ESLint flat config template
 */
function getEslintTemplate() {
  return `import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      // Error prevention
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      
      // Best practices
      'curly': ['error', 'all'],
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'error',
      'prefer-promise-reject-errors': 'error',
      'require-await': 'error',
      
      // Code style
      'array-bracket-spacing': ['error', 'never'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'comma-spacing': ['error', { before: false, after: true }],
      'func-call-spacing': ['error', 'never'],
      'indent': ['error', 2],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'linebreak-style': ['error', 'unix'],
      'no-trailing-spaces': 'error',
      'object-curly-spacing': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      }],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      
      // ES6+
      'arrow-spacing': ['error', { before: true, after: true }],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-template': 'error',
      'template-curly-spacing': ['error', 'never'],
    },
  },
  {
    files: ['test/**/*.js'],
    rules: {
      'no-unused-expressions': 'off', // For chai assertions
    },
  },
];`;
}

/**
 * Get Prettier config template
 */
function getPrettierTemplate() {
  return `export default {
  // Line length
  printWidth: 100,
  
  // Indentation
  tabWidth: 2,
  useTabs: false,
  
  // Semicolons
  semi: true,
  
  // Quotes
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // Trailing commas
  trailingComma: 'es5',
  
  // Brackets
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow functions
  arrowParens: 'always',
  
  // Line endings
  endOfLine: 'lf',
  
  // HTML/Markdown
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  
  // Special files
  overrides: [
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
      },
    },
  ],
};`;
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
out/

# Test coverage
coverage/
.nyc_output/

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
.eslintcache
.prettierignore

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
[*.{js,json}]
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
[{package.json,.prettierrc,.eslintrc}]
indent_style = space
indent_size = 2

# Makefiles
[Makefile]
indent_style = tab`;
}
