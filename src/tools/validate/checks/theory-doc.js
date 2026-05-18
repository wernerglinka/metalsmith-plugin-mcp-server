import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Check for a theory-of-operations document at docs/THEORY.md.
 *
 * A plugin without a theory doc, or one whose stub has not been filled
 * in, is flagged as a warning ("needs work"). The doc captures the *why*
 * of the plugin's design and is required reading before non-trivial
 * changes. The scaffold template plants a "TODO: Replace this stub"
 * marker at the top; if the marker is still present, the author hasn't
 * replaced the stub with real content.
 */
export async function checkTheoryDoc(pluginPath, results) {
  const theoryPath = path.join(pluginPath, 'docs/THEORY.md');

  let contents;
  try {
    contents = await fs.readFile(theoryPath, 'utf-8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      results.warnings.push(
        '⚠ Missing docs/THEORY.md — every plugin should ship a theory-of-operations document explaining how and why it works. Use: get-template plugin/docs/THEORY.md'
      );
      return;
    }
    results.warnings.push(`⚠ Could not read docs/THEORY.md: ${error.message}`);
    return;
  }

  if (contents.includes('TODO: Replace this stub')) {
    results.warnings.push(
      '⚠ docs/THEORY.md is still the unfilled scaffold stub. Replace the TODO sections with the real theory of operations before the next release.'
    );
    return;
  }

  results.passed.push('✓ docs/THEORY.md exists and has been filled in');
}
