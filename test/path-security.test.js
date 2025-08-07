/**
 * Tests for path security utilities
 */

import { expect } from 'chai';
import path from 'path';
import os from 'os';
import { sanitizePath, sanitizeTemplateName, validatePath, createPathResolver } from '../src/utils/path-security.js';
import { promises as fs } from 'fs';

describe('Path Security Utilities', () => {
  const testBase = '/test/base/directory';

  describe('sanitizePath', () => {
    it('should allow valid relative paths', () => {
      const result = sanitizePath('subdir/file.js', testBase);
      expect(result).to.equal(path.resolve(testBase, 'subdir/file.js'));
    });

    it('should allow valid absolute paths without traversal', () => {
      const validPath = '/usr/local/lib/node_modules';
      const result = sanitizePath(validPath, testBase);
      expect(result).to.equal(path.normalize(validPath));
    });

    it('should allow current directory reference', () => {
      const result = sanitizePath('.', testBase);
      expect(result).to.equal(path.resolve(testBase));
    });

    it('should allow simple filenames', () => {
      const result = sanitizePath('file.txt', testBase);
      expect(result).to.equal(path.resolve(testBase, 'file.txt'));
    });

    it('should prevent relative path traversal with ../', () => {
      expect(() => sanitizePath('../../../etc/passwd', testBase)).to.throw('Path traversal attempt detected');
    });

    it('should prevent relative path traversal with ..\\', () => {
      expect(() => sanitizePath('..\\\\..\\\\..\\\\etc\\\\passwd', testBase)).to.throw(
        'Path traversal attempt detected'
      );
    });

    it('should prevent absolute path with traversal patterns', () => {
      expect(() => sanitizePath('/usr/local/../../../etc/passwd', testBase)).to.throw(
        'Path traversal attempt detected'
      );
    });

    it('should prevent Windows-style traversal', () => {
      expect(() => sanitizePath('C:\\\\..\\\\..\\\\Windows\\\\System32', testBase)).to.throw(
        'Path traversal attempt detected'
      );
    });

    it('should reject invalid input types', () => {
      expect(() => sanitizePath(null, testBase)).to.throw('Invalid path provided');
      expect(() => sanitizePath(undefined, testBase)).to.throw('Invalid path provided');
      expect(() => sanitizePath(123, testBase)).to.throw('Invalid path provided');
    });

    it('should handle empty string', () => {
      expect(() => sanitizePath('', testBase)).to.throw('Invalid path provided');
    });

    it('should normalize paths correctly', () => {
      const result = sanitizePath('subdir//file.js', testBase);
      expect(result).to.equal(path.resolve(testBase, 'subdir/file.js'));
    });

    it('should handle temp directory paths used in tests', () => {
      const tempPath = path.join(os.tmpdir(), 'test-plugin');
      const result = sanitizePath(tempPath, testBase);
      expect(result).to.equal(path.normalize(tempPath));
    });
  });

  describe('sanitizeTemplateName', () => {
    it('should allow valid template names', () => {
      expect(sanitizeTemplateName('plugin/index')).to.equal('plugin/index');
      expect(sanitizeTemplateName('configs/eslint')).to.equal('configs/eslint');
    });

    it('should remove path traversal attempts', () => {
      expect(sanitizeTemplateName('../../../etc/passwd')).to.equal('etc/passwd');
      expect(sanitizeTemplateName('../../template')).to.equal('template');
    });

    it('should remove leading slashes', () => {
      expect(sanitizeTemplateName('/absolute/path')).to.equal('absolute/path');
      expect(sanitizeTemplateName('\\windows\\path')).to.equal('windows/path');
    });

    it('should normalize path separators', () => {
      expect(sanitizeTemplateName('folder\\\\file')).to.equal('folder/file');
      expect(sanitizeTemplateName('folder//file')).to.equal('folder/file');
    });

    it('should reject null bytes', () => {
      expect(() => sanitizeTemplateName('file\x00name')).to.throw('Invalid template name: contains null bytes');
    });

    it('should reject invalid input types', () => {
      expect(() => sanitizeTemplateName(null)).to.throw('Invalid template name provided');
      expect(() => sanitizeTemplateName(undefined)).to.throw('Invalid template name provided');
      expect(() => sanitizeTemplateName(123)).to.throw('Invalid template name provided');
    });

    it('should handle empty string', () => {
      expect(() => sanitizeTemplateName('')).to.throw('Invalid template name provided');
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
      expect(result).to.equal(path.join(tempDir, 'test.txt'));
    });

    it('should reject non-existent paths', async () => {
      try {
        await validatePath('nonexistent.txt', tempDir);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Path does not exist');
      }
    });

    it('should prevent traversal in validation', async () => {
      try {
        await validatePath('../../../etc/passwd', tempDir);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Path traversal attempt detected');
      }
    });
  });

  describe('createPathResolver', () => {
    it('should create a resolver with the correct base path', () => {
      const resolver = createPathResolver('/base/path');
      expect(resolver.getBase()).to.equal(path.resolve('/base/path'));
    });

    it('should resolve paths relative to base', () => {
      const resolver = createPathResolver('/base/path');
      const resolved = resolver.resolve('subdir/file.js');
      expect(resolved).to.equal(path.resolve('/base/path', 'subdir/file.js'));
    });

    it('should prevent traversal through resolver', () => {
      const resolver = createPathResolver('/base/path');
      expect(() => resolver.resolve('../../../etc/passwd')).to.throw('Path traversal attempt detected');
    });

    it('should validate paths through resolver', async () => {
      const tempDir = path.join(os.tmpdir(), 'resolver-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(path.join(tempDir, 'exists.txt'), 'content');

      const resolver = createPathResolver(tempDir);

      const validPath = await resolver.validate('exists.txt');
      expect(validPath).to.equal(path.join(tempDir, 'exists.txt'));

      try {
        await resolver.validate('notfound.txt');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Path does not exist');
      }

      await fs.rm(tempDir, { recursive: true, force: true });
    });
  });
});
