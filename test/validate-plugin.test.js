import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validatePluginTool } from '../src/tools/validate-plugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('validate-plugin tool', function () {
  before(async function () {
    // Create test fixtures
    await createTestPlugin('valid-plugin');
    await createTestPlugin('minimal-plugin', { minimal: true });
    await createTestPlugin('invalid-plugin', { invalid: true });
  });

  after(async function () {
    // Clean up fixtures
    await fs.rm(fixturesDir, { recursive: true, force: true });
  });

  it('should validate a well-structured plugin', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'valid-plugin'),
      checks: ['structure', 'tests', 'docs', 'package-json'],
    });

    expect(result.isError).to.not.be.true;
    const text = result.content[0].text;
    expect(text).to.include('Plugin meets quality standards');
  });

  it('should detect missing required files', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'invalid-plugin'),
      checks: ['structure'],
    });

    const text = result.content[0].text;
    expect(text).to.include('Missing required');
  });

  it('should check test coverage', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'valid-plugin'),
      checks: ['tests', 'coverage'],
    });

    const text = result.content[0].text;
    expect(text).to.include('test');
  });

  it('should validate package.json standards', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'valid-plugin'),
      checks: ['package-json'],
    });

    const text = result.content[0].text;
    expect(text).to.include('package.json');
    expect(text).to.include('follows convention');
  });

  it('should handle non-existent plugin directory', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'non-existent'),
      checks: ['structure'],
    });

    expect(result.isError).to.be.true;
    expect(result.content[0].text).to.include('Failed to validate');
  });

  it('should check ESLint configuration', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'valid-plugin'),
      checks: ['eslint'],
    });

    const text = result.content[0].text;
    expect(text).to.include('ESLint configuration found');
    expect(text).to.include('modern ESLint flat config');
  });

  it('should handle missing ESLint configuration', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'minimal-plugin'),
      checks: ['eslint'],
    });

    const text = result.content[0].text;
    expect(text).to.include('No ESLint configuration found');
  });

  it('should check coverage reports when available', async function () {
    // Create a mock coverage directory and report
    const coverageDir = path.join(fixturesDir, 'valid-plugin', 'coverage');
    await fs.mkdir(coverageDir, { recursive: true });

    const coverageSummary = {
      total: {
        lines: { pct: 95.5 },
      },
    };

    await fs.writeFile(
      path.join(coverageDir, 'coverage-summary.json'),
      JSON.stringify(coverageSummary, null, 2),
    );

    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'valid-plugin'),
      checks: ['coverage'],
    });

    const text = result.content[0].text;
    expect(text).to.include('Coverage reports found');
    expect(text).to.include('95.5%');
  });

  it('should handle all check types in one validation', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'valid-plugin'),
      checks: [
        'structure',
        'tests',
        'docs',
        'package-json',
        'eslint',
        'coverage',
      ],
    });

    expect(result.isError).to.not.be.true;
    const text = result.content[0].text;
    expect(text).to.include('Quality score');
    expect(text).to.include('Passed');
  });

  it('should provide quality score and summary', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'valid-plugin'),
      checks: ['structure', 'tests'],
    });

    const text = result.content[0].text;
    expect(text).to.include('Quality score:');
    expect(text).to.include('%');
    expect(text).to.include('Total checks:');
  });

  it('should handle plugins with missing recommended directories', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'minimal-plugin'),
      checks: ['structure'],
    });

    const text = result.content[0].text;
    expect(text).to.include('Missing recommended directory');
  });

  it('should validate package.json name convention', async function () {
    const result = await validatePluginTool({
      path: path.join(fixturesDir, 'valid-plugin'),
      checks: ['package-json'],
    });

    const text = result.content[0].text;
    expect(text).to.include('Plugin name follows convention');
  });
});

/**
 * Create a test plugin fixture
 */
async function createTestPlugin(name, options = {}) {
  const pluginDir = path.join(fixturesDir, name);
  await fs.mkdir(pluginDir, { recursive: true });

  if (options.invalid) {
    // Create an invalid plugin structure
    await fs.writeFile(path.join(pluginDir, 'index.js'), '// Invalid plugin');
    return;
  }

  // Create basic structure
  await fs.mkdir(path.join(pluginDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(pluginDir, 'test'), { recursive: true });

  // Create package.json
  const packageJson = {
    name: `metalsmith-${name}`,
    version: '1.0.0',
    description: `Test plugin ${name}`,
    main: 'src/index.js',
    license: 'MIT',
    scripts: {
      test: 'mocha test',
      lint: 'eslint src test',
    },
    repository: {
      type: 'git',
      url: `https://github.com/test/${name}`,
    },
    keywords: ['metalsmith', 'plugin'],
    engines: {
      node: '>=18.0.0',
    },
  };

  if (!options.minimal) {
    packageJson.scripts['test:coverage'] = 'c8 npm test';
    packageJson.scripts.format = 'prettier --write .';
  }

  await fs.writeFile(
    path.join(pluginDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  // Create src/index.js
  await fs.writeFile(
    path.join(pluginDir, 'src/index.js'),
    `export default function plugin(options = {}) {
  return function (files, metalsmith, done) {
    done();
  };
}`,
  );

  // Create README.md
  let readme = `# metalsmith-${name}

> Test plugin ${name}

## Installation

\`\`\`bash
npm install metalsmith-${name}
\`\`\`
`;

  if (!options.minimal) {
    readme += `
## Usage

\`\`\`js
import plugin from 'metalsmith-${name}';
\`\`\`

## Options

- \`option\`: Description

## Examples

\`\`\`js
metalsmith.use(plugin({ option: 'value' }));
\`\`\`
`;
  }

  await fs.writeFile(path.join(pluginDir, 'README.md'), readme);

  // Create test file
  await fs.writeFile(
    path.join(pluginDir, 'test/index.test.js'),
    `import { expect } from 'chai';
import plugin from '../src/index.js';

describe('plugin', () => {
  it('should export a function', () => {
    expect(plugin).to.be.a('function');
  });
});`,
  );

  if (!options.minimal) {
    // Create additional recommended structure
    await fs.mkdir(path.join(pluginDir, 'src/utils'), { recursive: true });
    await fs.mkdir(path.join(pluginDir, 'src/processors'), { recursive: true });
    await fs.mkdir(path.join(pluginDir, 'test/fixtures'), { recursive: true });

    // Create ESLint config
    await fs.writeFile(
      path.join(pluginDir, 'eslint.config.js'),
      'export default [];',
    );

    // Create LICENSE
    await fs.writeFile(path.join(pluginDir, 'LICENSE'), 'MIT License');
  }
}
