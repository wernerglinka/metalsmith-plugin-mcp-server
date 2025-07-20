import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateConfigsTool } from '../src/tools/generate-configs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, 'tmp-configs');

describe('generate-configs tool', function () {
  beforeEach(async function () {
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async function () {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should generate default config files', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
    });

    expect(result.isError).to.not.be.true;

    // Check default configs were created
    const expectedFiles = [
      'eslint.config.js',
      'prettier.config.js',
      '.editorconfig',
      '.gitignore',
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(tmpDir, file);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).to.be.true;
    }
  });

  it('should generate specific config files', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['eslint', 'release-it'],
    });

    expect(result.isError).to.not.be.true;

    // Check specific configs
    const eslintExists = await fs
      .access(path.join(tmpDir, 'eslint.config.js'))
      .then(() => true)
      .catch(() => false);
    const releaseItExists = await fs
      .access(path.join(tmpDir, '.release-it.json'))
      .then(() => true)
      .catch(() => false);

    expect(eslintExists).to.be.true;
    expect(releaseItExists).to.be.true;

    // Check that prettier was not created
    const prettierExists = await fs
      .access(path.join(tmpDir, 'prettier.config.js'))
      .then(() => true)
      .catch(() => false);
    expect(prettierExists).to.be.false;
  });

  it('should not overwrite existing files', async function () {
    // Create existing file
    const existingContent = '// Existing config';
    await fs.writeFile(path.join(tmpDir, 'eslint.config.js'), existingContent);

    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['eslint'],
    });

    // Should report error for existing file
    const text = result.content[0].text;
    expect(text).to.include('already exists');

    // Check file wasn't overwritten
    const content = await fs.readFile(
      path.join(tmpDir, 'eslint.config.js'),
      'utf-8',
    );
    expect(content).to.equal(existingContent);
  });

  it('should validate ESLint config content', async function () {
    await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['eslint'],
    });

    const content = await fs.readFile(
      path.join(tmpDir, 'eslint.config.js'),
      'utf-8',
    );

    // Check for modern flat config structure
    expect(content).to.include('export default');
    expect(content).to.include('@eslint/js');
    expect(content).to.include('languageOptions');
    expect(content).to.include('ecmaVersion: 2024');
  });

  it('should validate Prettier config content', async function () {
    await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['prettier'],
    });

    const content = await fs.readFile(
      path.join(tmpDir, 'prettier.config.js'),
      'utf-8',
    );

    // Check for key prettier options
    expect(content).to.include('printWidth');
    expect(content).to.include('singleQuote');
    expect(content).to.include('trailingComma');
    expect(content).to.include('endOfLine');
  });

  it('should handle unknown config types', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['unknown-config'],
    });

    const text = result.content[0].text;
    expect(text).to.include('Unknown config type');
  });

  it('should create output directory if it does not exist', async function () {
    const nestedPath = path.join(tmpDir, 'nested/path');

    const result = await generateConfigsTool({
      outputPath: nestedPath,
      configs: ['gitignore'],
    });

    expect(result.isError).to.not.be.true;

    const gitignoreExists = await fs
      .access(path.join(nestedPath, '.gitignore'))
      .then(() => true)
      .catch(() => false);
    expect(gitignoreExists).to.be.true;
  });

  it('should handle mix of valid and invalid config types', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['eslint', 'invalid-config', 'prettier'],
    });

    const text = result.content[0].text;
    expect(text).to.include('Generated files:');
    expect(text).to.include('eslint.config.js');
    expect(text).to.include('prettier.config.js');
    expect(text).to.include('Errors:');
    expect(text).to.include('Unknown config type: invalid-config');
  });

  it('should generate all available config types', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: [
        'eslint',
        'prettier',
        'editorconfig',
        'gitignore',
        'release-it',
      ],
    });

    expect(result.isError).to.not.be.true;

    const expectedFiles = [
      'eslint.config.js',
      'prettier.config.js',
      '.editorconfig',
      '.gitignore',
      '.release-it.json',
    ];

    for (const file of expectedFiles) {
      const exists = await fs
        .access(path.join(tmpDir, file))
        .then(() => true)
        .catch(() => false);
      expect(exists).to.be.true;
    }
  });

  it('should handle file system errors gracefully', async function () {
    // Try to write to a read-only directory (simulate permission error)
    const readOnlyPath = path.join(tmpDir, 'readonly');
    await fs.mkdir(readOnlyPath, { recursive: true });
    await fs.chmod(readOnlyPath, 0o444); // Read-only

    const result = await generateConfigsTool({
      outputPath: readOnlyPath,
      configs: ['eslint'],
    });

    // Should handle the error gracefully
    const text = result.content[0].text;
    expect(text).to.include('Failed to generate eslint');

    // Restore permissions for cleanup
    await fs.chmod(readOnlyPath, 0o755);
  });
});
