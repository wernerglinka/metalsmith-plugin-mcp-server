import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function checkReleaseNotes(pluginPath, results) {
  try {
    try {
      const releaseItPath = path.join(pluginPath, '.release-it.json');
      const releaseItContent = await fs.readFile(releaseItPath, 'utf-8');
      const releaseItConfig = JSON.parse(releaseItContent);

      if (releaseItConfig.github?.autoGenerate === true) {
        results.passed.push('✓ Release-it configured with GitHub auto-generated release notes');
      } else {
        results.recommendations.push(
          '💡 Consider setting github.autoGenerate to true in .release-it.json for automatic release notes'
        );
      }

      if (releaseItConfig.git?.commitMessage === 'Release ${version}') {
        results.passed.push('✓ Release-it commit message format is correct');
      } else if (releaseItConfig.git?.commitMessage) {
        results.recommendations.push(
          '💡 Consider using "Release ${version}" as the git.commitMessage in .release-it.json'
        );
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        results.recommendations.push(
          '💡 Consider adding .release-it.json for release automation. Run: npx metalsmith-plugin-mcp-server configs . release-it'
        );
      } else {
        results.warnings.push(`⚠ Could not validate .release-it.json configuration: ${error.message}`);
      }
    }

    try {
      const releaseScriptPath = path.join(pluginPath, 'scripts', 'release.sh');
      const scriptStat = await fs.stat(releaseScriptPath);
      const isExecutable = scriptStat.mode & 0o111;

      if (isExecutable) {
        results.passed.push('✓ Release script exists and is executable');
      } else {
        results.warnings.push('⚠ Release script exists but is not executable. Run: chmod +x scripts/release.sh');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        results.recommendations.push(
          '💡 Consider adding scripts/release.sh for secure GitHub releases. Use: get-template plugin/scripts/release.sh'
        );
      }
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check release configuration: ${error.message}`);
  }
}
