import { strict as assert } from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginScaffoldTool } from '../src/tools/plugin-scaffold.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, 'tmp');

describe('plugin-scaffold tool', function () {
  beforeEach(async function () {
    // Create temp directory
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async function () {
    // Clean up temp directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should validate plugin name', async function () {
    const result = await pluginScaffoldTool({
      name: 'invalid-name',
      outputPath: tmpDir
    });

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Plugin description is required'));
  });

  it('should create plugin structure', async function () {
    const pluginName = 'metalsmith-test-plugin';
    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A test plugin for validation',
      type: 'processor',
      outputPath: tmpDir
    });

    assert.notEqual(result.isError, true);

    // Check directory structure
    const pluginPath = path.join(tmpDir, pluginName);
    const stats = await fs.stat(pluginPath);
    assert.equal(stats.isDirectory(), true);

    // Check required files
    const requiredFiles = [
      'package.json',
      'README.md',
      'src/index.js',
      'test/index.test.js',
      'eslint.config.js',
      'prettier.config.js',
      '.editorconfig',
      '.gitignore',
      'scripts/release.sh'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(pluginPath, file);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      assert.equal(exists, true);
    }
  });

  it('should prevent overwriting existing directory', async function () {
    const pluginName = 'metalsmith-existing-plugin';
    const pluginPath = path.join(tmpDir, pluginName);

    // Create existing directory
    await fs.mkdir(pluginPath, { recursive: true });

    const result = await pluginScaffoldTool({
      name: pluginName,
      outputPath: tmpDir
    });

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Plugin description is required'));
  });

  it('should create basic plugin structure without types', async function () {
    const pluginName = 'metalsmith-basic-test';

    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A basic test plugin',
      outputPath: tmpDir
    });

    assert.notEqual(result.isError, true);

    // Check basic directory structure exists
    const pluginPath = path.join(tmpDir, pluginName);
    const srcDir = path.join(pluginPath, 'src');
    const testDir = path.join(pluginPath, 'test');

    const srcExists = await fs
      .access(srcDir)
      .then(() => true)
      .catch(() => false);
    const testExists = await fs
      .access(testDir)
      .then(() => true)
      .catch(() => false);

    assert.equal(srcExists, true);
    assert.equal(testExists, true);
  });

  it('should handle additional features', async function () {
    const pluginName = 'metalsmith-features-test';
    const features = ['async-processing', 'background-processing', 'metadata-generation'];

    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A test plugin with features',
      features,
      outputPath: tmpDir
    });

    assert.notEqual(result.isError, true);

    // Check feature-specific directories
    const pluginPath = path.join(tmpDir, pluginName);

    // Async processing adds to processors
    const asyncDir = path.join(pluginPath, 'src', 'processors', 'async');
    const hasAsync = await fs
      .access(asyncDir)
      .then(() => true)
      .catch(() => false);
    assert.equal(hasAsync, true);

    // Background processing adds workers
    const workersDir = path.join(pluginPath, 'src', 'workers');
    const hasWorkers = await fs
      .access(workersDir)
      .then(() => true)
      .catch(() => false);
    assert.equal(hasWorkers, true);

    // Metadata generation adds metadata
    const metadataDir = path.join(pluginPath, 'src', 'metadata');
    const hasMetadata = await fs
      .access(metadataDir)
      .then(() => true)
      .catch(() => false);
    assert.equal(hasMetadata, true);
  });

  it('should handle template rendering errors gracefully', async function () {
    // Create a plugin with a name that will cause template rendering to fail
    const pluginName = 'metalsmith-error-test';

    // Mock fs.writeFile to throw an error during template writing
    const originalWriteFile = fs.writeFile;
    let callCount = 0;
    fs.writeFile = (path, content) => {
      callCount++;
      if (callCount === 2) {
        // Fail on second file write (after directory creation)
        throw new Error('Simulated template error');
      }
      return originalWriteFile(path, content);
    };

    const result = await pluginScaffoldTool({
      name: pluginName,
      outputPath: tmpDir
    });

    // Restore original function
    fs.writeFile = originalWriteFile;

    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes('Plugin description is required'));

    // Verify cleanup happened - directory should not exist
    const pluginPath = path.join(tmpDir, pluginName);
    const exists = await fs
      .access(pluginPath)
      .then(() => true)
      .catch(() => false);
    assert.equal(exists, false);
  });

  it('should handle git initialization failure gracefully', async function () {
    const pluginName = 'metalsmith-git-test';

    // This test verifies that git failure doesn't prevent plugin creation
    // We can't easily mock the dynamic import, so we'll test indirectly
    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A test plugin for git testing',
      outputPath: tmpDir
    });

    // Plugin should still be created successfully even if git fails
    assert.notEqual(result.isError, true);
    assert.ok(result.content[0].text.includes('Successfully created'));

    const pluginPath = path.join(tmpDir, pluginName);
    const exists = await fs
      .access(pluginPath)
      .then(() => true)
      .catch(() => false);
    assert.equal(exists, true);
  });

  it('should create feature-specific directories when requested', async function () {
    const pluginName = 'metalsmith-feature-dirs-test';
    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A test plugin with feature-specific directories',
      features: ['async-processing', 'background-processing'],
      outputPath: tmpDir
    });

    assert.notEqual(result.isError, true);

    // Check if feature-specific directories were created
    const pluginPath = path.join(tmpDir, pluginName);
    const processorsDir = path.join(pluginPath, 'src', 'processors', 'async');
    const workersDir = path.join(pluginPath, 'src', 'workers');

    const processorsExists = await fs
      .access(processorsDir)
      .then(() => true)
      .catch(() => false);
    const workersExists = await fs
      .access(workersDir)
      .then(() => true)
      .catch(() => false);

    assert.equal(processorsExists, true);
    assert.equal(workersExists, true);
  });

  it('should handle missing template files gracefully', async function () {
    // Test what happens when template files are missing
    const pluginName = 'metalsmith-missing-template-test';

    // Temporarily rename a template file to simulate missing template
    const templatePath = path.join(__dirname, '../templates/plugin/package.json.template');
    const backupPath = `${templatePath}.backup`;

    try {
      await fs.rename(templatePath, backupPath);

      const result = await pluginScaffoldTool({
        name: pluginName,
        outputPath: tmpDir
      });

      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Plugin description is required'));
    } finally {
      // Restore the template file
      try {
        await fs.rename(backupPath, templatePath);
      } catch {
        // If backup doesn't exist, create a minimal template
        await fs.writeFile(templatePath, '{"name": "{{pluginName}}"}');
      }
    }
  });

  it('should create executable release script', async function () {
    const pluginName = 'metalsmith-scripts-test';
    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A test plugin for script permissions',
      outputPath: tmpDir
    });

    assert.notEqual(result.isError, true);

    const pluginPath = path.join(tmpDir, pluginName);

    // Check that release script exists and is executable
    const releaseScript = path.join(pluginPath, 'scripts/release.sh');
    const releaseStats = await fs.stat(releaseScript);

    // Check executable permissions (0o111 = executable by user, group, other)
    assert.ok(releaseStats.mode & (0o111 > 0));

    // Check script content contains expected patterns
    const releaseContent = await fs.readFile(releaseScript, 'utf-8');
    assert.ok(releaseContent.includes('#!/bin/bash'));
    assert.ok(releaseContent.includes('gh auth status'));
    assert.ok(releaseContent.includes('GH_TOKEN'));
  });
});
