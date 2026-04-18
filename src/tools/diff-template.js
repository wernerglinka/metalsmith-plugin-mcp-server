/**
 * Diff Template Tool
 *
 * Compares an existing plugin's files against the current scaffold templates
 * so authors can see what has drifted from the latest standards. For each
 * tracked template the tool reports one of three statuses:
 *
 *   - matches  : the file is byte-identical to a freshly rendered template
 *   - missing  : the file does not exist in the plugin
 *   - drifted  : the file exists but differs from the rendered template
 *
 * For drifted files the tool emits a unified diff. Authors can then decide
 * whether the drift is intentional (custom code, README content) or whether
 * the file should be brought back in line with the scaffold.
 *
 * Template variables are substituted from the plugin's own package.json
 * (name, description, author, license) before comparison so the diff
 * reflects real drift rather than placeholder noise.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPatch } from 'diff';
import chalk from 'chalk';
import { sanitizePath } from '../utils/path-security.js';
import { render } from '../utils/render.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Manifest of template-to-target mappings.
 *
 * Keep in sync with copyTemplates() in plugin-scaffold.js. Each entry maps a
 * scaffold template to the file path it produces inside a plugin, plus a
 * `kind` hint that tells users which drift is normally interesting:
 *
 *   - structural: configs, scripts, workflows. Drift here usually means the
 *     plugin is behind the latest scaffold standards.
 *   - content: README, CLAUDE.md, theory doc, test entry. Drift is expected
 *     because authors customize these heavily; surface it but don't alarm.
 *   - static: copied verbatim by the scaffold (no template rendering). Drift
 *     compared as exact bytes.
 */
const TEMPLATE_MANIFEST = [
  { template: 'plugin/package.json.template', target: 'package.json', kind: 'structural' },
  { template: 'plugin/README.md.template', target: 'README.md', kind: 'content' },
  { template: 'plugin/CLAUDE.md.template', target: 'CLAUDE.md', kind: 'content' },
  { template: 'plugin/index.js.template', target: 'src/index.js', kind: 'structural' },
  { template: 'plugin/utils/config.js.template', target: 'src/utils/config.js', kind: 'structural' },
  { template: 'plugin/index.test.js.template', target: 'test/index.test.js', kind: 'content' },
  { template: 'plugin/scripts/release.sh.template', target: 'scripts/release.sh', kind: 'structural' },
  { template: 'plugin/docs/THEORY.md.template', target: 'docs/THEORY.md', kind: 'content' },
  { template: 'workflows/test.yml.template', target: '.github/workflows/test.yml', kind: 'structural' },
  { template: 'workflows/test-matrix.yml.template', target: '.github/workflows/test-matrix.yml', kind: 'structural' },
  { template: 'workflows/claude-code.yml.template', target: '.github/workflows/claude-code.yml', kind: 'structural' },
  { template: 'github/dependabot.yml.template', target: '.github/dependabot.yml', kind: 'structural' }
];

const STATIC_CONFIG_MANIFEST = [
  { source: 'configs/biome.json.template', target: 'biome.json' },
  { source: 'configs/.editorconfig.template', target: '.editorconfig' },
  { source: 'configs/.gitignore.template', target: '.gitignore' },
  { source: 'configs/release-it.json.template', target: '.release-it.json' }
];

/**
 * Truncate a unified diff to keep tool output readable.
 * Long drift on a generated README isn't useful — the user just needs to
 * know the file is out of sync, not see 800 lines of diff.
 */
function truncatePatch(patch, maxLines = 60) {
  const lines = patch.split('\n');
  if (lines.length <= maxLines) {
    return patch;
  }
  const head = lines.slice(0, maxLines).join('\n');
  return `${head}\n... (${lines.length - maxLines} more diff lines truncated)`;
}

/**
 * Build the template data object used to render scaffold templates against
 * a plugin. Mirrors the data shape that plugin-scaffold.js builds, derived
 * from the plugin's own package.json so the rendered output reflects the
 * plugin's identity rather than scaffold placeholders.
 *
 * Features can't be reliably inferred from package.json. We default to
 * `['async-processing']` to match the scaffold default; this means README
 * and CLAUDE.md feature sections may show drift on plugins built without
 * async features, which is expected and called out in the report header.
 */
function buildTemplateData(pkg) {
  const author =
    typeof pkg.author === 'string' ? pkg.author : pkg.author && pkg.author.name ? pkg.author.name : 'Plugin Author';
  return {
    pluginName: pkg.name,
    description: pkg.description || '',
    author,
    license: pkg.license || 'MIT',
    features: ['async-processing'],
    year: new Date().getFullYear()
  };
}

async function readTemplate(relPath) {
  const absPath = path.join(__dirname, '../../templates', relPath);
  return fs.readFile(absPath, 'utf-8');
}

async function readPluginFile(pluginPath, relPath) {
  return fs.readFile(path.join(pluginPath, relPath), 'utf-8');
}

/**
 * Compare a single rendered template (or static config) against the plugin's
 * actual file. Returns one of: 'matches', 'missing', 'drifted'.
 */
async function compareEntry(pluginPath, expected, target) {
  let actual;
  try {
    actual = await readPluginFile(pluginPath, target);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { status: 'missing' };
    }
    throw err;
  }
  if (actual === expected) {
    return { status: 'matches' };
  }
  const patch = createPatch(target, expected, actual, 'scaffold', 'plugin', { context: 3 });
  return { status: 'drifted', patch };
}

/**
 * Render and diff every template in the manifest against the plugin.
 * Optionally filter to a subset by passing template paths in `only`.
 */
async function diffAll(pluginPath, templateData, only) {
  const results = { matches: [], missing: [], drifted: [], errors: [] };

  const templateEntries = only
    ? TEMPLATE_MANIFEST.filter((e) => only.includes(e.template) || only.includes(e.target))
    : TEMPLATE_MANIFEST;

  for (const entry of templateEntries) {
    try {
      const raw = await readTemplate(entry.template);
      const rendered = render(raw, templateData);
      const result = await compareEntry(pluginPath, rendered, entry.target);
      const enriched = { ...entry, ...result };
      results[result.status].push(enriched);
    } catch (err) {
      results.errors.push({ ...entry, message: err.message });
    }
  }

  const staticEntries = only
    ? STATIC_CONFIG_MANIFEST.filter((e) => only.includes(e.source) || only.includes(e.target))
    : STATIC_CONFIG_MANIFEST;

  for (const entry of staticEntries) {
    try {
      const expected = await readTemplate(entry.source);
      const result = await compareEntry(pluginPath, expected, entry.target);
      const enriched = { template: entry.source, target: entry.target, kind: 'static', ...result };
      results[result.status].push(enriched);
    } catch (err) {
      results.errors.push({ template: entry.source, target: entry.target, message: err.message });
    }
  }

  return results;
}

function formatReport(pluginPath, pkg, results) {
  const lines = [];
  lines.push(chalk.bold(`Template diff for ${pkg.name || path.basename(pluginPath)}`));
  lines.push(`Plugin path: ${pluginPath}`);
  lines.push('');
  lines.push(
    `Summary: ${chalk.green(`${results.matches.length} match`)}, ${chalk.yellow(`${results.drifted.length} drifted`)}, ${chalk.red(`${results.missing.length} missing`)}${results.errors.length ? `, ${chalk.red(`${results.errors.length} error`)}` : ''}`
  );
  lines.push('');
  lines.push(
    chalk.gray(
      'Note: features default to ["async-processing"] when rendering — README/CLAUDE.md drift in feature sections is expected for plugins built without async features.'
    )
  );
  lines.push('');

  if (results.missing.length > 0) {
    lines.push(chalk.red.bold('Missing files (present in scaffold, absent in plugin):'));
    for (const e of results.missing) {
      lines.push(`  ✗ ${e.target}   ${chalk.gray(`[${e.kind}]`)}`);
    }
    lines.push('');
  }

  if (results.drifted.length > 0) {
    lines.push(chalk.yellow.bold('Drifted files (content differs from scaffold):'));
    for (const e of results.drifted) {
      lines.push(`  ~ ${e.target}   ${chalk.gray(`[${e.kind}]`)}`);
    }
    lines.push('');

    lines.push(chalk.bold('Diffs:'));
    lines.push('');
    for (const e of results.drifted) {
      lines.push(chalk.cyan(`── ${e.target} ──`));
      lines.push(truncatePatch(e.patch));
      lines.push('');
    }
  }

  if (results.matches.length > 0) {
    lines.push(chalk.green.bold('Matches scaffold:'));
    for (const e of results.matches) {
      lines.push(`  ✓ ${e.target}   ${chalk.gray(`[${e.kind}]`)}`);
    }
    lines.push('');
  }

  if (results.errors.length > 0) {
    lines.push(chalk.red.bold('Errors:'));
    for (const e of results.errors) {
      lines.push(`  ! ${e.target}: ${e.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Diff Template Tool — main entry point.
 */
export async function diffTemplateTool(args) {
  const { path: userPath, templates: only } = args;

  let pluginPath;
  try {
    pluginPath = sanitizePath(userPath || '.', process.cwd());
    await fs.access(pluginPath);
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Failed to diff templates: ${err.message}` }],
      isError: true
    };
  }

  let pkg;
  try {
    pkg = JSON.parse(await fs.readFile(path.join(pluginPath, 'package.json'), 'utf-8'));
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Could not read package.json at ${pluginPath}: ${err.message}. The diff tool needs package.json to derive template variables.`
        }
      ],
      isError: true
    };
  }

  const templateData = buildTemplateData(pkg);
  const results = await diffAll(pluginPath, templateData, only);
  const report = formatReport(pluginPath, pkg, results);

  return { content: [{ type: 'text', text: report }] };
}
