import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { copyTemplate, copyTemplateDirectory } from '../src/utils/template.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, 'tmp-template');

describe('template utilities', function () {
  beforeEach(async function () {
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async function () {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('copyTemplate', function () {
    it('should copy and render a template file', async function () {
      const templatePath = path.join(tmpDir, 'test.template');
      const targetPath = path.join(tmpDir, 'output', 'test.js');

      await fs.writeFile(templatePath, 'const name = "{{pluginName}}";');

      const data = { pluginName: 'test-plugin' };
      await copyTemplate(templatePath, targetPath, data);

      const result = await fs.readFile(targetPath, 'utf-8');
      expect(result).to.equal('const name = "test-plugin";');
    });

    it('should create target directory if it does not exist', async function () {
      const templatePath = path.join(tmpDir, 'test.template');
      const targetPath = path.join(tmpDir, 'nested', 'deep', 'output.js');

      await fs.writeFile(templatePath, 'content');

      await copyTemplate(templatePath, targetPath, {});

      const exists = await fs
        .access(targetPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).to.be.true;
    });

    it('should handle templates with conditionals', async function () {
      const templatePath = path.join(tmpDir, 'conditional.template');
      const targetPath = path.join(tmpDir, 'conditional.js');

      const template = `
const config = {
  name: "{{pluginName}}"{{#if hasFeature}},
  feature: true{{/if}}
};`;

      await fs.writeFile(templatePath, template);

      const data = { pluginName: 'test', hasFeature: true };
      await copyTemplate(templatePath, targetPath, data);

      const result = await fs.readFile(targetPath, 'utf-8');
      expect(result).to.include('feature: true');
    });
  });

  describe('copyTemplateDirectory', function () {
    it('should copy multiple template files from a directory', async function () {
      const sourceDir = path.join(tmpDir, 'source');
      const targetDir = path.join(tmpDir, 'target');

      await fs.mkdir(sourceDir, { recursive: true });
      await fs.writeFile(
        path.join(sourceDir, 'file1.js.template'),
        'export const name = "{{name}}";',
      );
      await fs.writeFile(
        path.join(sourceDir, 'file2.md.template'),
        '# {{title}}',
      );
      await fs.writeFile(
        path.join(sourceDir, 'non-template.js'),
        'should not be copied',
      );

      const data = { name: 'test', title: 'Test Title' };
      await copyTemplateDirectory(sourceDir, targetDir, data);

      const file1 = await fs.readFile(
        path.join(targetDir, 'file1.js'),
        'utf-8',
      );
      const file2 = await fs.readFile(
        path.join(targetDir, 'file2.md'),
        'utf-8',
      );

      expect(file1).to.equal('export const name = "test";');
      expect(file2).to.equal('# Test Title');

      // Non-template file should not be copied
      const nonTemplateExists = await fs
        .access(path.join(targetDir, 'non-template.js'))
        .then(() => true)
        .catch(() => false);
      expect(nonTemplateExists).to.be.false;
    });

    it('should handle recursive directory copying', async function () {
      const sourceDir = path.join(tmpDir, 'source');
      const targetDir = path.join(tmpDir, 'target');
      const subDir = path.join(sourceDir, 'subdir');

      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(
        path.join(sourceDir, 'root.txt.template'),
        'root: {{value}}',
      );
      await fs.writeFile(
        path.join(subDir, 'nested.txt.template'),
        'nested: {{value}}',
      );

      const data = { value: 'test' };
      await copyTemplateDirectory(sourceDir, targetDir, data, {
        recursive: true,
      });

      const rootFile = await fs.readFile(
        path.join(targetDir, 'root.txt'),
        'utf-8',
      );
      const nestedFile = await fs.readFile(
        path.join(targetDir, 'subdir', 'nested.txt'),
        'utf-8',
      );

      expect(rootFile).to.equal('root: test');
      expect(nestedFile).to.equal('nested: test');
    });

    it('should handle empty directory', async function () {
      const sourceDir = path.join(tmpDir, 'empty-source');
      const targetDir = path.join(tmpDir, 'empty-target');

      await fs.mkdir(sourceDir, { recursive: true });

      // Should not throw error
      await copyTemplateDirectory(sourceDir, targetDir, {});

      const targetExists = await fs
        .access(targetDir)
        .then(() => true)
        .catch(() => false);
      expect(targetExists).to.be.false; // Target should not be created if no files to copy
    });
  });
});
