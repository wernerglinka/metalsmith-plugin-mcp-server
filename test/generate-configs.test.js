import { strict as assert } from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
      outputPath: tmpDir
    });

    assert.notEqual(result.isError, true);

    // Check default configs were created
    const expectedFiles = ['eslint.config.js', 'prettier.config.js', '.editorconfig', '.gitignore'];

    for (const file of expectedFiles) {
      const filePath = path.join(tmpDir, file);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      assert.equal(exists, true);
    }
  });

  it('should generate specific config files', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['eslint', 'release-it']
    });

    assert.notEqual(result.isError, true);

    // Check specific configs
    const eslintExists = await fs
      .access(path.join(tmpDir, 'eslint.config.js'))
      .then(() => true)
      .catch(() => false);
    const releaseItExists = await fs
      .access(path.join(tmpDir, '.release-it.json'))
      .then(() => true)
      .catch(() => false);

    assert.equal(eslintExists, true);
    assert.equal(releaseItExists, true);

    // Check that prettier was not created
    const prettierExists = await fs
      .access(path.join(tmpDir, 'prettier.config.js'))
      .then(() => true)
      .catch(() => false);
    assert.equal(prettierExists, false);
  });

  it('should not overwrite existing files', async function () {
    // Create existing file
    const existingContent = '// Existing config';
    await fs.writeFile(path.join(tmpDir, 'eslint.config.js'), existingContent);

    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['eslint']
    });

    // Should report error for existing file
    const text = result.content[0].text;
    assert.ok(text.includes('already exists'));

    // Check file wasn't overwritten
    const content = await fs.readFile(path.join(tmpDir, 'eslint.config.js'), 'utf-8');
    assert.equal(content, existingContent);
  });

  it('should validate ESLint config content', async function () {
    await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['eslint']
    });

    const content = await fs.readFile(path.join(tmpDir, 'eslint.config.js'), 'utf-8');

    // Check for modern flat config structure
    assert.ok(content.includes('export default'));
    assert.ok(content.includes('@eslint/js'));
    assert.ok(content.includes('languageOptions'));
    assert.ok(content.includes('ecmaVersion: 2024'));
  });

  it('should validate Prettier config content', async function () {
    await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['prettier']
    });

    const content = await fs.readFile(path.join(tmpDir, 'prettier.config.js'), 'utf-8');

    // Check for key prettier options
    assert.ok(content.includes('printWidth'));
    assert.ok(content.includes('singleQuote'));
    assert.ok(content.includes('trailingComma'));
    assert.ok(content.includes('endOfLine'));
  });

  it('should handle unknown config types', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['unknown-config']
    });

    const text = result.content[0].text;
    assert.ok(text.includes('Unknown config type'));
  });

  it('should create output directory if it does not exist', async function () {
    const nestedPath = path.join(tmpDir, 'nested/path');

    const result = await generateConfigsTool({
      outputPath: nestedPath,
      configs: ['gitignore']
    });

    assert.notEqual(result.isError, true);

    const gitignoreExists = await fs
      .access(path.join(nestedPath, '.gitignore'))
      .then(() => true)
      .catch(() => false);
    assert.equal(gitignoreExists, true);
  });

  it('should handle mix of valid and invalid config types', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['eslint', 'invalid-config', 'prettier']
    });

    const text = result.content[0].text;
    assert.ok(text.includes('Generated files:'));
    assert.ok(text.includes('eslint.config.js'));
    assert.ok(text.includes('prettier.config.js'));
    assert.ok(text.includes('Errors:'));
    assert.ok(text.includes('Unknown config type: invalid-config'));
  });

  it('should generate all available config types', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['eslint', 'prettier', 'editorconfig', 'gitignore', 'release-it']
    });

    assert.notEqual(result.isError, true);

    const expectedFiles = ['eslint.config.js', 'prettier.config.js', '.editorconfig', '.gitignore', '.release-it.json'];

    for (const file of expectedFiles) {
      const exists = await fs
        .access(path.join(tmpDir, file))
        .then(() => true)
        .catch(() => false);
      assert.equal(exists, true);
    }
  });

  it('should handle file system errors gracefully', async function () {
    // Try to write to a read-only directory (simulate permission error)
    const readOnlyPath = path.join(tmpDir, 'readonly');
    await fs.mkdir(readOnlyPath, { recursive: true });
    await fs.chmod(readOnlyPath, 0o444); // Read-only

    const result = await generateConfigsTool({
      outputPath: readOnlyPath,
      configs: ['eslint']
    });

    // Should handle the error gracefully
    const text = result.content[0].text;
    assert.ok(text.includes('Failed to generate eslint'));

    // Restore permissions for cleanup
    await fs.chmod(readOnlyPath, 0o755);
  });

  it('should generate release-it config with GitHub auto-generated release notes', async function () {
    const result = await generateConfigsTool({
      outputPath: tmpDir,
      configs: ['release-it']
    });

    assert.notEqual(result.isError, true);

    // Check release-it config content
    const releaseItPath = path.join(tmpDir, '.release-it.json');
    const releaseItContent = await fs.readFile(releaseItPath, 'utf-8');
    const releaseItConfig = JSON.parse(releaseItContent);

    // Should use GitHub's auto-generated release notes
    assert.equal(releaseItConfig.github.autoGenerate, true);
    assert.equal(releaseItConfig.npm.publish, false);
    assert.equal(releaseItConfig.github.releaseNotes, undefined);
  });
});
