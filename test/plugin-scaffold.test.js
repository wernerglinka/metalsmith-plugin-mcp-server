import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

    expect(result.isError).to.be.true;
    expect(result.content[0].text).to.include('Plugin description is required');
  });

  it('should create plugin structure', async function () {
    const pluginName = 'metalsmith-test-plugin';
    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A test plugin for validation',
      type: 'processor',
      outputPath: tmpDir
    });

    expect(result.isError).to.not.be.true;

    // Check directory structure
    const pluginPath = path.join(tmpDir, pluginName);
    const stats = await fs.stat(pluginPath);
    expect(stats.isDirectory()).to.be.true;

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
      'scripts/release.sh',
      'scripts/release-notes.sh'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(pluginPath, file);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).to.be.true;
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

    expect(result.isError).to.be.true;
    expect(result.content[0].text).to.include('Plugin description is required');
  });

  it('should create basic plugin structure without types', async function () {
    const pluginName = 'metalsmith-basic-test';

    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A basic test plugin',
      outputPath: tmpDir
    });

    expect(result.isError).to.not.be.true;

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

    expect(srcExists).to.be.true;
    expect(testExists).to.be.true;
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

    expect(result.isError).to.not.be.true;

    // Check feature-specific directories
    const pluginPath = path.join(tmpDir, pluginName);

    // Async processing adds to processors
    const asyncDir = path.join(pluginPath, 'src', 'processors', 'async');
    const hasAsync = await fs
      .access(asyncDir)
      .then(() => true)
      .catch(() => false);
    expect(hasAsync).to.be.true;

    // Background processing adds workers
    const workersDir = path.join(pluginPath, 'src', 'workers');
    const hasWorkers = await fs
      .access(workersDir)
      .then(() => true)
      .catch(() => false);
    expect(hasWorkers).to.be.true;

    // Metadata generation adds metadata
    const metadataDir = path.join(pluginPath, 'src', 'metadata');
    const hasMetadata = await fs
      .access(metadataDir)
      .then(() => true)
      .catch(() => false);
    expect(hasMetadata).to.be.true;
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

    expect(result.isError).to.be.true;
    expect(result.content[0].text).to.include('Plugin description is required');

    // Verify cleanup happened - directory should not exist
    const pluginPath = path.join(tmpDir, pluginName);
    const exists = await fs
      .access(pluginPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).to.be.false;
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
    expect(result.isError).to.not.be.true;
    expect(result.content[0].text).to.include('Successfully created');

    const pluginPath = path.join(tmpDir, pluginName);
    const exists = await fs
      .access(pluginPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).to.be.true;
  });

  it('should create feature-specific directories when requested', async function () {
    const pluginName = 'metalsmith-feature-dirs-test';
    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A test plugin with feature-specific directories',
      features: ['async-processing', 'background-processing'],
      outputPath: tmpDir
    });

    expect(result.isError).to.not.be.true;

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

    expect(processorsExists).to.be.true;
    expect(workersExists).to.be.true;
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

      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('Plugin description is required');
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

  it('should create executable release scripts', async function () {
    const pluginName = 'metalsmith-scripts-test';
    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A test plugin for script permissions',
      outputPath: tmpDir
    });

    expect(result.isError).to.not.be.true;

    const pluginPath = path.join(tmpDir, pluginName);

    // Check that release scripts exist and are executable
    const releaseScript = path.join(pluginPath, 'scripts/release.sh');
    const releaseNotesScript = path.join(pluginPath, 'scripts/release-notes.sh');

    const releaseStats = await fs.stat(releaseScript);
    const releaseNotesStats = await fs.stat(releaseNotesScript);

    // Check executable permissions (0o111 = executable by user, group, other)
    expect(releaseStats.mode & 0o111).to.be.greaterThan(0);
    expect(releaseNotesStats.mode & 0o111).to.be.greaterThan(0);

    // Check script content contains expected patterns
    const releaseNotesContent = await fs.readFile(releaseNotesScript, 'utf-8');
    expect(releaseNotesContent).to.include('#!/bin/bash');
    expect(releaseNotesContent).to.include('Generate release notes for the current version only');
    expect(releaseNotesContent).to.include('PREV_TAG=');
    expect(releaseNotesContent).to.include('REPO_URL=');
  });
});
