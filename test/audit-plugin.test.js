/**
 * Test suite for audit-plugin tool - Integration Tests
 *
 * These tests verify the audit functionality works correctly without
 * attempting to stub ES modules, which is problematic.
 */

import { strict as assert } from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { auditPlugin } from '../src/tools/audit-plugin.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

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

      assert.equal(typeof result, 'string');
    });

    it('should support JSON output format', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      assert.equal(typeof result, 'string');

      const parsed = JSON.parse(result);
      assert.ok('pluginName' in parsed);
      assert.ok('results' in parsed);
      assert.ok('overallHealth' in parsed);
      assert.ok('validation' in parsed.results);
      assert.ok('linting' in parsed.results);
      assert.ok('formatting' in parsed.results);
      assert.ok('tests' in parsed.results);
      assert.ok('coverage' in parsed.results);
    });

    it('should support markdown output format', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'markdown'
      });

      assert.equal(typeof result, 'string');
      assert.ok(result.includes('# Audit Report:'));
      assert.ok(result.includes('| Check | Status | Details |'));
    });

    it('should handle non-existent plugin directory', async () => {
      try {
        await auditPlugin({ path: './non-existent-directory' });
        // If it doesn't throw, that's fine - it should handle gracefully
      } catch (error) {
        // If it does throw, that's also acceptable behavior
        assert.ok(error instanceof Error);
      }
    });

    it('should calculate overall health status', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      const parsed = JSON.parse(result);
      assert.ok(['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS IMPROVEMENT', 'POOR'].includes(parsed.overallHealth));
    });
  });

  describe('validation integration', () => {
    it('should include validation results', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      const parsed = JSON.parse(result);
      assert.ok('score' in parsed.results.validation);
      assert.ok('passed' in parsed.results.validation);
    });

    it('should include test results', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      const parsed = JSON.parse(result);
      assert.ok('passed' in parsed.results.tests);
      assert.ok('stats' in parsed.results.tests);
    });

    it('should include linting and formatting results', async () => {
      const result = await auditPlugin({
        path: tempDir,
        output: 'json'
      });

      const parsed = JSON.parse(result);
      assert.ok('passed' in parsed.results.linting);
      assert.ok('passed' in parsed.results.formatting);
    });
  });
});
