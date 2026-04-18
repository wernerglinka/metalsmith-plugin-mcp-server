import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pluginScaffoldTool } from '../src/tools/plugin-scaffold.js';
import { diffTemplateTool } from '../src/tools/diff-template.js';

describe('diff-template tool', function () {
  let tmpDir;
  let pluginPath;
  const pluginName = 'metalsmith-diff-target';

  before(async function () {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-diff-'));

    // Use the real scaffold to generate a plugin we can diff against. Starting
    // from a freshly scaffolded plugin guarantees most files match the
    // current scaffold templates, so we can reliably introduce specific drift
    // and verify the tool catches it.
    const result = await pluginScaffoldTool({
      name: pluginName,
      description: 'A plugin used to exercise the diff-template tool',
      outputPath: tmpDir
    });
    assert.notEqual(result.isError, true);
    pluginPath = path.join(tmpDir, pluginName);
  });

  after(async function () {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('reports matches for a freshly scaffolded plugin', async function () {
    const result = await diffTemplateTool({ path: pluginPath });
    assert.notEqual(result.isError, true);
    const text = result.content[0].text;
    assert.ok(text.includes('Matches scaffold:'), 'should list matched files');
    assert.ok(text.includes('biome.json'), 'biome.json should be a static config that matches');
  });

  it('detects a drifted file and emits a unified diff', async function () {
    // Append a single line to biome.json so the diff is small enough to land
    // entirely within the patch truncation window — this lets us assert that
    // the new content actually appears in the rendered diff hunk.
    const biomePath = path.join(pluginPath, 'biome.json');
    const original = await fs.readFile(biomePath, 'utf-8');
    try {
      await fs.writeFile(biomePath, `${original.trimEnd()}\n// DRIFT_MARKER\n`);
      const result = await diffTemplateTool({ path: pluginPath });
      const text = result.content[0].text;
      assert.ok(text.includes('Drifted files'), 'should announce a drift section');
      assert.ok(text.includes('biome.json'), 'should call out biome.json by name');
      assert.ok(text.includes('DRIFT_MARKER'), 'unified diff should include the drifted content');
    } finally {
      await fs.writeFile(biomePath, original);
    }
  });

  it('detects a missing file', async function () {
    const claudePath = path.join(pluginPath, '.github/workflows/claude-code.yml');
    const original = await fs.readFile(claudePath, 'utf-8');
    try {
      await fs.unlink(claudePath);
      const result = await diffTemplateTool({ path: pluginPath });
      const text = result.content[0].text;
      assert.ok(text.includes('Missing files'), 'should announce a missing-files section');
      assert.ok(text.includes('claude-code.yml'), 'should name the missing file');
    } finally {
      await fs.writeFile(claudePath, original);
    }
  });

  it('honors the templates filter', async function () {
    const result = await diffTemplateTool({
      path: pluginPath,
      templates: ['plugin/package.json.template']
    });
    const text = result.content[0].text;
    // Filter narrows to one template; only package.json should appear in the
    // file lists. README/biome should not show up.
    assert.ok(text.includes('package.json'), 'filtered template should appear in output');
    assert.ok(!text.includes('biome.json'), 'unfiltered templates should be omitted');
  });

  it('errors gracefully when package.json is missing', async function () {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-diff-empty-'));
    try {
      const result = await diffTemplateTool({ path: emptyDir });
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('Could not read package.json'));
    } finally {
      await fs.rm(emptyDir, { recursive: true, force: true });
    }
  });
});
