import { promises as fs } from 'fs';
import path from 'path';
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
  const { outputPath: userPath = '.', configs = ['eslint', 'prettier', 'editorconfig', 'gitignore'] } = args;

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
          case 'eslint':
            await generateEslintConfig(outputPath);
            generated.push('eslint.config.js');
            break;

          case 'prettier':
            await generatePrettierConfig(outputPath);
            generated.push('prettier.config.js');
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
            await generateReleaseNotesScript(outputPath);
            generated.push('scripts/release-notes.sh');
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
 * Generate modern ESLint flat config
 */
async function generateEslintConfig(outputPath) {
  const configPath = path.join(outputPath, 'eslint.config.js');

  // Check if already exists
  try {
    await fs.access(configPath);
    throw new Error('eslint.config.js already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const config = `import js from '@eslint/js';
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
];
`;

  await fs.writeFile(configPath, config);
}

/**
 * Generate Prettier config
 */
async function generatePrettierConfig(outputPath) {
  const configPath = path.join(outputPath, 'prettier.config.js');

  try {
    await fs.access(configPath);
    throw new Error('prettier.config.js already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const config = `export default {
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
};
`;

  await fs.writeFile(configPath, config);
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
    git: {
      commitMessage: 'chore: release v${version}',
      requireCleanWorkingDir: true,
      requireBranch: 'main',
      tag: true,
      tagName: 'v${version}',
      push: true,
      changelog:
        "npx auto-changelog -u --commit-limit false --ignore-commit-pattern '^((dev|chore|ci):|Release)' --stdout"
    },
    github: {
      release: true,
      releaseName: 'v${version}',
      draft: false,
      autoGenerate: false,
      releaseNotes: './scripts/release-notes.sh ${latestTag}',
      tokenRef: 'GH_TOKEN'
    },
    npm: {
      publish: false,
      publishPath: '.'
    },
    hooks: {
      'before:init': ['npm test', 'npm run lint'],
      'before:git': [
        "gh --version || (echo 'GitHub CLI not found. Install with: brew install gh' && exit 1)",
        "gh auth status || (echo 'GitHub CLI not authenticated. Run: gh auth login' && exit 1)"
      ],
      'after:bump':
        "npx auto-changelog -p --commit-limit false --ignore-commit-pattern '^((dev|chore|ci):|Release)' && git add CHANGELOG.md",
      'after:release': 'echo Successfully released ${name} v${version} to ${repo.repository}.'
    }
  };

  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Generate release notes script
 */
async function generateReleaseNotesScript(outputPath) {
  const scriptsDir = path.join(outputPath, 'scripts');
  const scriptPath = path.join(scriptsDir, 'release-notes.sh');

  // Ensure scripts directory exists
  await fs.mkdir(scriptsDir, { recursive: true });

  try {
    await fs.access(scriptPath);
    throw new Error('scripts/release-notes.sh already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const script = `#!/bin/bash

# Generate release notes for the current version only
# Usage: ./scripts/release-notes.sh <previous-tag>

set -e

PREV_TAG="\${1:-$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null)}"
REPO_URL="https://github.com/your-username/your-plugin-name"

# Fallback for first release if no previous tag exists
if [ -z "$PREV_TAG" ]; then
    PREV_TAG="HEAD~20"  # Show last 20 commits for first release
fi

# Get commits since the previous tag, excluding merge commits and chore commits
echo "## Changes"
echo ""

# Check if we have any commits to show
if git log --pretty=format:"- %s ([%h]($REPO_URL/commit/%H))" \\
  "\${PREV_TAG}..HEAD" \\
  --no-merges \\
  --grep="^chore:" --grep="^ci:" --grep="^dev:" --invert-grep 2>/dev/null | grep -q "."; then
    
    git log --pretty=format:"- %s ([%h]($REPO_URL/commit/%H))" \\
      "\${PREV_TAG}..HEAD" \\
      --no-merges \\
      --grep="^chore:" --grep="^ci:" --grep="^dev:" --invert-grep
else
    echo "- Initial release"
fi

echo ""
echo ""

# Only show full changelog link if we have a previous tag
if [ "$PREV_TAG" != "HEAD~20" ]; then
    CURRENT_TAG=$(git describe --tags --exact-match HEAD 2>/dev/null || echo "HEAD")
    echo "**Full Changelog**: [\$PREV_TAG...\$CURRENT_TAG](\${REPO_URL}/compare/\${PREV_TAG}...\${CURRENT_TAG})"
fi`;

  await fs.writeFile(scriptPath, script);
  await fs.chmod(scriptPath, 0o755);
}
