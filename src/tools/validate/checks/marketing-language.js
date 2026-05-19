import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readPluginSource } from '../utils.js';

const MARKETING_WORDS = [
  'intelligent',
  'smart',
  'seamless',
  'advanced',
  'powerful',
  'cutting-edge',
  'revolutionary',
  'innovative',
  'breakthrough',
  'next-generation',
  'state-of-the-art',
  'enterprise-grade',
  'world-class',
  'industry-leading',
  'game-changing'
];

export async function checkMarketingLanguage(pluginPath, results) {
  try {
    const docFiles = ['README.md', 'CHANGELOG.md'];
    let foundMarketingLanguage = false;
    const foundWords = new Set();

    for (const file of docFiles) {
      try {
        const content = await fs.readFile(path.join(pluginPath, file), 'utf-8');
        for (const word of MARKETING_WORDS) {
          if (new RegExp(`\\b${word}\\b`, 'gi').test(content)) {
            foundMarketingLanguage = true;
            foundWords.add(word);
          }
        }
      } catch {
        // file doesn't exist
      }
    }

    const { all } = await readPluginSource(pluginPath);
    for (const word of MARKETING_WORDS) {
      if (new RegExp(`\\b${word}\\b`, 'gi').test(all)) {
        foundMarketingLanguage = true;
        foundWords.add(word);
      }
    }

    if (foundMarketingLanguage) {
      results.warnings.push(
        `⚠ Marketing language detected: ${Array.from(foundWords).join(', ')}. Consider replacing with technical descriptions`
      );
      results.recommendations.push(
        '💡 Replace marketing words with specific technical descriptions of what the plugin actually does'
      );
    } else {
      results.passed.push('✓ Documentation uses technical language without marketing buzzwords');
    }
  } catch (error) {
    results.warnings.push(`⚠ Could not check marketing language: ${error.message}`);
  }
}
