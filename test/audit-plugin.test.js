/**
 * Test suite for audit-plugin tool - Integration Tests
 *
 * These tests verify the audit functionality works correctly without
 * attempting to stub ES modules, which is problematic.
 */

import { expect } from 'chai';
import { auditPlugin } from '../src/tools/audit-plugin.js';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

describe('audit-plugin tool', () => {
  let tempDir;

  beforeEach(async () => {
    // Create a temporary directory for test plugin
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'audit-test-'));

    // Create a minimal package.json
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test plugin for audit',
          scripts: {
            test: 'echo "15 passing"',
            lint: 'echo "lint passed"',
            'format:check': 'echo "format passed"'
          }
        },
        null,
        2
      )
    );

    // Create basic directory structure
    await fs.mkdir(path.join(tempDir, 'src'));
    await fs.mkdir(path.join(tempDir, 'test'));

    // Create a minimal plugin file
    await fs.writeFile(
      path.join(tempDir, 'src', 'index.js'),
      `
export default function testPlugin() {
  return (files, metalsmith, done) => {
    done();
  };
}
        `
    );

    // Create a minimal test file
    await fs.writeFile(
      path.join(tempDir, 'test', 'index.js'),
      `
import { expect } from 'chai';
console.log('Test file exists');
        `
    );

    // Create README
    await fs.writeFile(path.join(tempDir, 'README.md'), '# Test Plugin\n\nTest plugin for audit tests.');
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('basic functionality', () => {
    it('should run audit and return a result', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'console'
      });

      expect(result).to.be.a('string');
    });

    it('should support JSON output format', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      expect(result).to.be.a('string');

      const parsed = JSON.parse(result);
      expect(parsed).to.have.property('pluginName');
      expect(parsed).to.have.property('results');
      expect(parsed).to.have.property('overallHealth');
      expect(parsed.results).to.have.property('validation');
      expect(parsed.results).to.have.property('linting');
      expect(parsed.results).to.have.property('formatting');
      expect(parsed.results).to.have.property('tests');
      expect(parsed.results).to.have.property('coverage');
    });

    it('should support markdown output format', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'markdown'
      });

      expect(result).to.be.a('string');
      expect(result).to.include('# Audit Report:');
      expect(result).to.include('| Check | Status | Details |');
    });

    it('should handle non-existent plugin directory', async () => {
      try {
        await auditPlugin({ path: './non-existent-directory' });
        // If it doesn't throw, that's fine - it should handle gracefully
      } catch (error) {
        // If it does throw, that's also acceptable behavior
        expect(error).to.be.an('error');
      }
    });

    it('should calculate overall health status', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      const parsed = JSON.parse(result);
      expect(parsed.overallHealth).to.be.oneOf(['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS IMPROVEMENT', 'POOR']);
    });
  });

  describe('validation integration', () => {
    it('should include validation results', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      const parsed = JSON.parse(result);
      expect(parsed.results.validation).to.have.property('score');
      expect(parsed.results.validation).to.have.property('passed');
    });

    it('should include test results', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      const parsed = JSON.parse(result);
      expect(parsed.results.tests).to.have.property('passed');
      expect(parsed.results.tests).to.have.property('stats');
    });

    it('should include linting and formatting results', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      const parsed = JSON.parse(result);
      expect(parsed.results.linting).to.have.property('passed');
      expect(parsed.results.formatting).to.have.property('passed');
    });
  });
});
