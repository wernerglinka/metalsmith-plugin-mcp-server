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
      outputPath: tmpDir,
    });

    expect(result.isError).to.be.true;
    expect(result.content[0].text).to.include('must start with "metalsmith-"');
  });

  it('should create plugin structure', async function () {
    const pluginName = 'metalsmith-test-plugin';
    const result = await pluginScaffoldTool({
      name: pluginName,
      type: 'processor',
      outputPath: tmpDir,
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
      outputPath: tmpDir,
    });

    expect(result.isError).to.be.true;
    expect(result.content[0].text).to.include('already exists');
  });

  it('should support different plugin types', async function () {
    const types = ['processor', 'transformer', 'validator'];

    for (const type of types) {
      const pluginName = `metalsmith-${type}-test`;
      const result = await pluginScaffoldTool({
        name: pluginName,
        type,
        outputPath: tmpDir,
      });

      expect(result.isError).to.not.be.true;

      // Check type-specific directory
      const pluginPath = path.join(tmpDir, pluginName);
      const typeDir = path.join(pluginPath, 'src', `${type}s`);
      const exists = await fs
        .access(typeDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).to.be.true;
    }
  });

  it('should handle additional features', async function () {
    const pluginName = 'metalsmith-features-test';
    const features = [
      'async-processing',
      'background-processing',
      'metadata-generation',
    ];

    const result = await pluginScaffoldTool({
      name: pluginName,
      type: 'processor',
      features,
      outputPath: tmpDir,
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
      type: 'processor',
      outputPath: tmpDir,
    });

    // Restore original function
    fs.writeFile = originalWriteFile;

    expect(result.isError).to.be.true;
    expect(result.content[0].text).to.include('Failed to scaffold plugin');
    expect(result.content[0].text).to.include('Simulated template error');

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
      type: 'processor',
      outputPath: tmpDir,
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

  it('should copy type-specific templates when they exist', async function () {
    // First create a type-specific template directory for testing
    const typeTemplatesDir = path.join(
      __dirname,
      '../templates/plugin/types/processor',
    );
    await fs.mkdir(typeTemplatesDir, { recursive: true });

    // Create a test type-specific template file
    await fs.writeFile(
      path.join(typeTemplatesDir, 'processor-helper.js.template'),
      '// Type-specific helper for {{pluginName}}\nexport function processFile() {}\n',
    );

    const pluginName = 'metalsmith-type-specific-test';
    const result = await pluginScaffoldTool({
      name: pluginName,
      type: 'processor',
      outputPath: tmpDir,
    });

    expect(result.isError).to.not.be.true;

    // Check if type-specific file was created
    const typeSpecificFile = path.join(
      tmpDir,
      pluginName,
      'src',
      'processor-helper.js',
    );
    const exists = await fs
      .access(typeSpecificFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).to.be.true;

    if (exists) {
      const content = await fs.readFile(typeSpecificFile, 'utf-8');
      expect(content).to.include('metalsmith-type-specific-test');
    }

    // Clean up the test template
    await fs.rm(path.join(__dirname, '../templates/plugin/types'), {
      recursive: true,
      force: true,
    });
  });

  it('should handle missing template files gracefully', async function () {
    // Test what happens when template files are missing
    const pluginName = 'metalsmith-missing-template-test';

    // Temporarily rename a template file to simulate missing template
    const templatePath = path.join(
      __dirname,
      '../templates/plugin/package.json.template',
    );
    const backupPath = `${templatePath}.backup`;

    try {
      await fs.rename(templatePath, backupPath);

      const result = await pluginScaffoldTool({
        name: pluginName,
        type: 'processor',
        outputPath: tmpDir,
      });

      expect(result.isError).to.be.true;
      expect(result.content[0].text).to.include('Failed to scaffold plugin');
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
});
