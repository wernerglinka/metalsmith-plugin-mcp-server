/**
 * Tests for path security utilities
 */

import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import path from 'node:path';
import os from 'node:os';
import { sanitizePath, sanitizeTemplateName, validatePath, createPathResolver } from '../src/utils/path-security.js';
import { promises as fs } from 'node:fs';

describe('Path Security Utilities', () => {
  const testBase = '/test/base/directory';

  describe('sanitizePath', () => {
    it('should allow valid relative paths', () => {
      const result = sanitizePath('subdir/file.js', testBase);
      assert.equal(result, path.resolve(testBase, 'subdir/file.js'));
    });

    it('should allow valid absolute paths without traversal', () => {
      const validPath = '/usr/local/lib/node_modules';
      const result = sanitizePath(validPath, testBase);
      assert.equal(result, path.normalize(validPath));
    });

    it('should allow current directory reference', () => {
      const result = sanitizePath('.', testBase);
      assert.equal(result, path.resolve(testBase));
    });

    it('should allow simple filenames', () => {
      const result = sanitizePath('file.txt', testBase);
      assert.equal(result, path.resolve(testBase, 'file.txt'));
    });

    it('should prevent relative path traversal with ../', () => {
      assert.throws(
        () => sanitizePath('../../../etc/passwd', testBase),
        new RegExp('Path traversal attempt detected'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });

    it('should prevent relative path traversal with ..\\', () => {
      assert.throws(
        () => sanitizePath('..\\\\..\\\\..\\\\etc\\\\passwd', testBase),
        new RegExp('Path traversal attempt detected'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });

    it('should prevent absolute path with traversal patterns', () => {
      assert.throws(
        () => sanitizePath('/usr/local/../../../etc/passwd', testBase),
        new RegExp('Path traversal attempt detected'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });

    it('should prevent Windows-style traversal', () => {
      assert.throws(
        () => sanitizePath('C:\\\\..\\\\..\\\\Windows\\\\System32', testBase),
        new RegExp('Path traversal attempt detected'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });

    it('should reject invalid input types', () => {
      assert.throws(
        () => sanitizePath(null, testBase),
        new RegExp('Invalid path provided'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
      assert.throws(
        () => sanitizePath(undefined, testBase),
        new RegExp('Invalid path provided'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
      assert.throws(
        () => sanitizePath(123, testBase),
        new RegExp('Invalid path provided'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });

    it('should handle empty string', () => {
      assert.throws(
        () => sanitizePath('', testBase),
        new RegExp('Invalid path provided'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });

    it('should normalize paths correctly', () => {
      const result = sanitizePath('subdir//file.js', testBase);
      assert.equal(result, path.resolve(testBase, 'subdir/file.js'));
    });

    it('should handle temp directory paths used in tests', () => {
      const tempPath = path.join(os.tmpdir(), 'test-plugin');
      const result = sanitizePath(tempPath, testBase);
      assert.equal(result, path.normalize(tempPath));
    });
  });

  describe('sanitizeTemplateName', () => {
    it('should allow valid template names', () => {
      assert.equal(sanitizeTemplateName('plugin/index'), 'plugin/index');
      assert.equal(sanitizeTemplateName('configs/eslint'), 'configs/eslint');
    });

    it('should remove path traversal attempts', () => {
      assert.equal(sanitizeTemplateName('../../../etc/passwd'), 'etc/passwd');
      assert.equal(sanitizeTemplateName('../../template'), 'template');
    });

    it('should remove leading slashes', () => {
      assert.equal(sanitizeTemplateName('/absolute/path'), 'absolute/path');
      assert.equal(sanitizeTemplateName('\\windows\\path'), 'windows/path');
    });

    it('should normalize path separators', () => {
      assert.equal(sanitizeTemplateName('folder\\\\file'), 'folder/file');
      assert.equal(sanitizeTemplateName('folder//file'), 'folder/file');
    });

    it('should reject null bytes', () => {
      assert.throws(
        () => sanitizeTemplateName('file\x00name'),
        new RegExp('Invalid template name: contains null bytes'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });

    it('should reject invalid input types', () => {
      assert.throws(
        () => sanitizeTemplateName(null),
        new RegExp('Invalid template name provided'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
      assert.throws(
        () => sanitizeTemplateName(undefined),
        new RegExp('Invalid template name provided'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
      assert.throws(
        () => sanitizeTemplateName(123),
        new RegExp('Invalid template name provided'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });

    it('should handle empty string', () => {
      assert.throws(
        () => sanitizeTemplateName(''),
        new RegExp('Invalid template name provided'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });
  });

  describe('validatePath', () => {
    let tempDir;

    before(async () => {
      tempDir = path.join(os.tmpdir(), 'path-security-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');
    });

    after(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should validate existing paths', async () => {
      const result = await validatePath('test.txt', tempDir);
      assert.equal(result, path.join(tempDir, 'test.txt'));
    });

    it('should reject non-existent paths', async () => {
      try {
        await validatePath('nonexistent.txt', tempDir);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error.message.includes('Path does not exist'));
      }
    });

    it('should prevent traversal in validation', async () => {
      try {
        await validatePath('../../../etc/passwd', tempDir);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error.message.includes('Path traversal attempt detected'));
      }
    });
  });

  describe('createPathResolver', () => {
    it('should create a resolver with the correct base path', () => {
      const resolver = createPathResolver('/base/path');
      assert.equal(resolver.getBase(), path.resolve('/base/path'));
    });

    it('should resolve paths relative to base', () => {
      const resolver = createPathResolver('/base/path');
      const resolved = resolver.resolve('subdir/file.js');
      assert.equal(resolved, path.resolve('/base/path', 'subdir/file.js'));
    });

    it('should prevent traversal through resolver', () => {
      const resolver = createPathResolver('/base/path');
      assert.throws(
        () => resolver.resolve('../../../etc/passwd'),
        new RegExp('Path traversal attempt detected'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    });

    it('should validate paths through resolver', async () => {
      const tempDir = path.join(os.tmpdir(), 'resolver-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(path.join(tempDir, 'exists.txt'), 'content');

      const resolver = createPathResolver(tempDir);

      const validPath = await resolver.validate('exists.txt');
      assert.equal(validPath, path.join(tempDir, 'exists.txt'));

      try {
        await resolver.validate('notfound.txt');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error.message.includes('Path does not exist'));
      }

      await fs.rm(tempDir, { recursive: true, force: true });
    });
  });
});
