/**
 * batch-audit.js
 * 
 * Batch audit tool that runs audits on multiple plugins and provides
 * a summary report showing the health status of all plugins.
 */

import { resolve, basename } from 'path';
import { promises as fs } from 'fs';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';
import { auditPlugin } from './audit-plugin.js';

/**
 * Check if a directory is a valid plugin directory
 * @param {string} pluginPath - Path to check
 * @returns {Promise<boolean>} True if it's a valid plugin directory
 */
async function isValidPluginDirectory(pluginPath) {
    try {
        const packageJsonPath = resolve(pluginPath, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        // Check if it has metalsmith-plugin keyword or metalsmith- prefix
        const isMetalsmithPlugin = packageJson.keywords?.includes('metalsmith-plugin') ||
                                   packageJson.keywords?.includes('metalsmith') ||
                                   packageJson.name?.startsWith('metalsmith-') ||
                                   packageJson.name?.includes('test-'); // Include test plugins
        
        return isMetalsmithPlugin;
    } catch {
        return false;
    }
}

/**
 * Find all plugin directories in a given path
 * @param {string} searchPath - Base path to search
 * @returns {Promise<string[]>} Array of plugin directory paths
 */
async function findPluginDirectories(searchPath) {
    const pluginDirs = [];
    
    try {
        // Look for directories that might contain plugins
        const entries = await fs.readdir(searchPath, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const fullPath = resolve(searchPath, entry.name);
                if (await isValidPluginDirectory(fullPath)) {
                    pluginDirs.push(fullPath);
                }
            }
        }
        
        // Also try glob patterns for nested structures
        const globPattern = resolve(searchPath, '*/package.json');
        const packageFiles = await glob(globPattern);
        
        for (const packageFile of packageFiles) {
            const pluginPath = resolve(packageFile, '..');
            if (!pluginDirs.includes(pluginPath) && await isValidPluginDirectory(pluginPath)) {
                pluginDirs.push(pluginPath);
            }
        }
    } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not search directory ${searchPath}: ${error.message}`));
    }
    
    return pluginDirs.sort();
}

/**
 * Generate summary statistics from batch results
 * @param {Array} results - Array of audit results
 * @returns {Object} Summary statistics
 */
function generateSummary(results) {
    const summary = {
        total: results.length,
        excellent: 0,
        good: 0,
        fair: 0,
        needsImprovement: 0,
        poor: 0,
        failed: 0
    };
    
    results.forEach(result => {
        if (result.error) {
            summary.failed++;
        } else {
            switch (result.overallHealth) {
                case 'EXCELLENT':
                    summary.excellent++;
                    break;
                case 'GOOD':
                    summary.good++;
                    break;
                case 'FAIR':
                    summary.fair++;
                    break;
                case 'NEEDS IMPROVEMENT':
                    summary.needsImprovement++;
                    break;
                case 'POOR':
                    summary.poor++;
                    break;
            }
        }
    });
    
    return summary;
}

/**
 * Get health icon and color for display
 * @param {string} health - Health status
 * @returns {Object} Icon and color function
 */
function getHealthDisplay(health) {
    const displays = {
        'EXCELLENT': { icon: '✅', color: chalk.green },
        'GOOD': { icon: '✅', color: chalk.green },
        'FAIR': { icon: '⚠️', color: chalk.yellow },
        'NEEDS IMPROVEMENT': { icon: '⚠️', color: chalk.red },
        'POOR': { icon: '❌', color: chalk.red },
        'FAILED': { icon: '💥', color: chalk.red }
    };
    
    return displays[health] || { icon: '❓', color: chalk.gray };
}

/**
 * Run batch audit on multiple plugins
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Base path to search for plugins
 * @param {boolean} args.fix - Apply automatic fixes during audit
 * @param {string} args.output - Output format (console, json, markdown)
 * @returns {Promise<string>} Batch audit report
 */
export async function batchAudit(args) {
    const searchPath = resolve(process.cwd(), args.path || '.');
    const results = [];
    
    console.log(chalk.blue(`\n📊 Running batch audit in ${chalk.bold(searchPath)}...\n`));
    
    // Find all plugin directories
    const findSpinner = ora('Finding plugin directories...').start();
    const pluginDirs = await findPluginDirectories(searchPath);
    findSpinner.succeed(`Found ${pluginDirs.length} plugin directories`);
    
    if (pluginDirs.length === 0) {
        const message = 'No plugin directories found';
        console.log(chalk.yellow(message));
        return message;
    }
    
    // Audit each plugin
    console.log(chalk.gray('Running audits...\n'));
    
    for (const pluginPath of pluginDirs) {
        const pluginName = basename(pluginPath);
        const auditSpinner = ora(`Auditing ${pluginName}...`).start();
        
        try {
            // Run audit but suppress console output by using json format
            const auditResult = await auditPlugin({
                path: pluginPath,
                fix: args.fix,
                output: 'json'
            });
            
            // Parse the JSON result
            const parsedResult = JSON.parse(auditResult);
            
            results.push({
                pluginName: parsedResult.pluginName,
                path: pluginPath,
                overallHealth: parsedResult.overallHealth,
                validationScore: parsedResult.results.validation.score,
                testsPassed: parsedResult.results.tests.passed,
                coverage: parsedResult.results.coverage.percentage,
                linting: parsedResult.results.linting.passed,
                formatting: parsedResult.results.formatting.passed
            });
            
            const display = getHealthDisplay(parsedResult.overallHealth);
            auditSpinner.succeed(`${display.icon} ${pluginName}: ${display.color(parsedResult.overallHealth)}`);
            
        } catch (error) {
            results.push({
                pluginName,
                path: pluginPath,
                error: error.message
            });
            
            const display = getHealthDisplay('FAILED');
            auditSpinner.fail(`${display.icon} ${pluginName}: ${display.color('FAILED')} - ${error.message}`);
        }
    }
    
    // Generate summary
    const summary = generateSummary(results);
    
    console.log(chalk.blue(`\n📊 Batch Audit Summary\n`));
    console.log(`Total plugins audited: ${summary.total}`);
    
    if (summary.excellent > 0) {console.log(chalk.green(`  ✅ Excellent: ${summary.excellent}`));}
    if (summary.good > 0) {console.log(chalk.green(`  ✅ Good: ${summary.good}`));}
    if (summary.fair > 0) {console.log(chalk.yellow(`  ⚠️  Fair: ${summary.fair}`));}
    if (summary.needsImprovement > 0) {console.log(chalk.red(`  ⚠️  Needs Improvement: ${summary.needsImprovement}`));}
    if (summary.poor > 0) {console.log(chalk.red(`  ❌ Poor: ${summary.poor}`));}
    if (summary.failed > 0) {console.log(chalk.red(`  💥 Failed: ${summary.failed}`));}
    
    const passed = summary.excellent + summary.good;
    const needsAttention = summary.fair + summary.needsImprovement + summary.poor + summary.failed;
    
    console.log(chalk.blue(`\nSummary: ${passed} plugins passed, ${needsAttention} need attention\n`));
    
    // Format output based on requested format
    if (args.output === 'json') {
        return JSON.stringify({ summary, results }, null, 2);
    } else if (args.output === 'markdown') {
        return generateMarkdownBatchReport(summary, results);
    } else {
        return generateConsoleBatchReport(results);
    }
}

/**
 * Generate markdown batch report
 * @param {Object} summary - Summary statistics
 * @param {Array} results - Audit results
 * @returns {string} Markdown report
 */
function generateMarkdownBatchReport(summary, results) {
    const lines = [
        '# Batch Audit Report',
        '',
        `**Date**: ${new Date().toISOString()}`,
        `**Total Plugins**: ${summary.total}`,
        '',
        '## Summary',
        '',
        '| Status | Count |',
        '|--------|-------|'
    ];
    
    if (summary.excellent > 0) {lines.push(`| ✅ Excellent | ${summary.excellent} |`);}
    if (summary.good > 0) {lines.push(`| ✅ Good | ${summary.good} |`);}
    if (summary.fair > 0) {lines.push(`| ⚠️ Fair | ${summary.fair} |`);}
    if (summary.needsImprovement > 0) {lines.push(`| ⚠️ Needs Improvement | ${summary.needsImprovement} |`);}
    if (summary.poor > 0) {lines.push(`| ❌ Poor | ${summary.poor} |`);}
    if (summary.failed > 0) {lines.push(`| 💥 Failed | ${summary.failed} |`);}
    
    lines.push('', '## Plugin Details', '', '| Plugin | Health | Validation | Tests | Coverage |');
    lines.push('|--------|--------|------------|-------|----------|');
    
    results.forEach(result => {
        if (result.error) {
            lines.push(`| ${result.pluginName} | 💥 Failed | - | - | - |`);
        } else {
            const display = getHealthDisplay(result.overallHealth);
            const coverage = result.coverage !== null ? `${result.coverage}%` : 'N/A';
            const tests = result.testsPassed ? '✅' : '❌';
            
            lines.push(`| ${result.pluginName} | ${display.icon} ${result.overallHealth} | ${result.validationScore}% | ${tests} | ${coverage} |`);
        }
    });
    
    return lines.join('\n');
}

/**
 * Generate console batch report with detailed plugin issues
 * @param {Array} results - Audit results
 * @returns {string} Console report
 */
function generateConsoleBatchReport(results) {
    const lines = [];
    const problemPlugins = results.filter(r => 
        r.error || ['POOR', 'NEEDS IMPROVEMENT'].includes(r.overallHealth)
    );
    
    if (problemPlugins.length > 0) {
        lines.push(chalk.yellow('\n⚠️  Plugins needing attention:\n'));
        
        problemPlugins.forEach(plugin => {
            if (plugin.error) {
                lines.push(`  💥 ${plugin.pluginName}: Failed - ${plugin.error}`);
            } else {
                const issues = [];
                if (plugin.validationScore < 70) {issues.push(`low validation (${plugin.validationScore}%)`);}
                if (!plugin.testsPassed) {issues.push('failing tests');}
                if (plugin.coverage !== null && plugin.coverage < 80) {issues.push(`low coverage (${plugin.coverage}%)`);}
                if (!plugin.linting) {issues.push('linting issues');}
                if (!plugin.formatting) {issues.push('formatting issues');}
                
                const display = getHealthDisplay(plugin.overallHealth);
                lines.push(`  ${display.icon} ${plugin.pluginName}: ${issues.join(', ')}`);
            }
        });
        
        lines.push(chalk.blue('\n💡 Run individual audits with --fix to resolve some issues'));
    }
    
    return lines.join('\n');
}

export default batchAudit;