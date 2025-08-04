#!/usr/bin/env node

import { auditPlugin } from './src/tools/audit-plugin.js';

// Test the audit-plugin tool
async function test() {
    console.log('Testing audit-plugin on test-blog-lists...\n');
    
    try {
        const result = await auditPlugin({
            path: '../test-plugins/test-blog-lists',
            output: 'console'
        });
        
        console.log(result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
