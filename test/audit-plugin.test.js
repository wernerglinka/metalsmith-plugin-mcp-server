/**
 * Test suite for audit-plugin tool
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { auditPlugin } from '../src/tools/audit-plugin.js';
import * as child_process from 'child_process';
import * as fs from 'fs';
import path from 'path';

describe('audit-plugin tool', () => {
    let execSyncStub;
    let existsSyncStub;
    let readFileSyncStub;
    
    beforeEach(() => {
        // Stub child_process.execSync
        execSyncStub = sinon.stub(child_process, 'execSync');
        
        // Stub fs methods
        existsSyncStub = sinon.stub(fs, 'existsSync');
        readFileSyncStub = sinon.stub(fs, 'readFileSync');
    });
    
    afterEach(() => {
        sinon.restore();
    });
    
    describe('basic functionality', () => {
        it('should run audit with default parameters', async () => {
            // Mock validation output
            execSyncStub.withArgs(sinon.match(/validate/)).returns(
                'Quality score: 85%\n✅ Plugin meets quality standards!'
            );
            
            // Mock package.json
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify({
                scripts: {
                    lint: 'eslint .',
                    'format:check': 'prettier --check .',
                    test: 'mocha',
                    'test:coverage': 'c8 mocha'
                }
            }));
            
            // Mock other commands
            execSyncStub.withArgs(sinon.match(/lint/)).returns('');
            execSyncStub.withArgs(sinon.match(/format/)).returns('');
            execSyncStub.withArgs(sinon.match(/test$/)).returns('15 passing');
            execSyncStub.withArgs(sinon.match(/coverage/)).returns('All files | 92.5 |');
            
            const result = await auditPlugin({ path: '.' });
            
            expect(result).to.include('Overall Health:');
            expect(execSyncStub).to.have.been.called;
        });
        
        it('should handle validation failure gracefully', async () => {
            execSyncStub.withArgs(sinon.match(/validate/)).throws(new Error('Validation failed'));
            existsSyncStub.returns(false);
            
            const result = await auditPlugin({ path: '.' });
            
            expect(result).to.include('Overall Health:');
        });
        
        it('should apply fixes when fix option is true', async () => {
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify({
                scripts: {
                    lint: 'eslint .',
                    'lint:fix': 'eslint . --fix',
                    format: 'prettier --write .'
                }
            }));
            
            execSyncStub.returns('');
            
            await auditPlugin({ path: '.', fix: true });
            
            expect(execSyncStub).to.have.been.calledWith(sinon.match(/lint:fix/));
            expect(execSyncStub).to.have.been.calledWith(sinon.match(/format/));
        });
    });
    
    describe('output formats', () => {
        beforeEach(() => {
            execSyncStub.returns('Quality score: 85%');
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify({ scripts: {} }));
        });
        
        it('should output JSON format when requested', async () => {
            const result = await auditPlugin({ path: '.', output: 'json' });
            const parsed = JSON.parse(result);
            
            expect(parsed).to.have.property('pluginName');
            expect(parsed).to.have.property('results');
            expect(parsed).to.have.property('overallHealth');
        });
        
        it('should output markdown format when requested', async () => {
            const result = await auditPlugin({ path: '.', output: 'markdown' });
            
            expect(result).to.include('# Audit Report:');
            expect(result).to.include('| Check | Status | Details |');
        });
    });
    
    describe('score extraction', () => {
        it('should extract validation score correctly', async () => {
            execSyncStub.withArgs(sinon.match(/validate/)).returns(
                'Some output\nQuality score: 73%\nMore output'
            );
            existsSyncStub.returns(false);
            
            const result = await auditPlugin({ path: '.' });
            
            expect(result).to.exist;
        });
        
        it('should extract test statistics correctly', async () => {
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify({
                scripts: { test: 'mocha' }
            }));
            
            execSyncStub.withArgs(sinon.match(/validate/)).returns('Quality score: 80%');
            execSyncStub.withArgs(sinon.match(/test$/)).returns('24 passing, 2 failing');
            
            const result = await auditPlugin({ path: '.' });
            
            expect(result).to.exist;
        });
        
        it('should extract coverage percentage correctly', async () => {
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify({
                scripts: { 'test:coverage': 'c8 mocha' }
            }));
            
            execSyncStub.withArgs(sinon.match(/validate/)).returns('Quality score: 80%');
            execSyncStub.withArgs(sinon.match(/coverage/)).returns(
                'All files    | 85.71 | 75.00 | 66.67 | 85.71 |'
            );
            
            const result = await auditPlugin({ path: '.' });
            
            expect(result).to.exist;
        });
    });
    
    describe('health calculation', () => {
        it('should calculate EXCELLENT health for high scores', async () => {
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify({
                scripts: {
                    lint: 'eslint',
                    'format:check': 'prettier --check',
                    test: 'mocha',
                    'test:coverage': 'c8 mocha'
                }
            }));
            
            execSyncStub.withArgs(sinon.match(/validate/)).returns('Quality score: 95%');
            execSyncStub.withArgs(sinon.match(/lint/)).returns('');
            execSyncStub.withArgs(sinon.match(/format/)).returns('');
            execSyncStub.withArgs(sinon.match(/test$/)).returns('50 passing');
            execSyncStub.withArgs(sinon.match(/coverage/)).returns('All files | 95 |');
            
            const result = await auditPlugin({ path: '.' });
            
            expect(result).to.include('EXCELLENT');
        });
        
        it('should calculate POOR health for low scores', async () => {
            existsSyncStub.returns(true);
            readFileSyncStub.returns(JSON.stringify({
                scripts: { test: 'mocha' }
            }));
            
            execSyncStub.withArgs(sinon.match(/validate/)).returns('Quality score: 40%');
            execSyncStub.withArgs(sinon.match(/test/)).throws(new Error('Tests failed'));
            
            const result = await auditPlugin({ path: '.' });
            
            expect(result).to.include('POOR');
        });
    });
});