# Migration Guide

This guide helps existing Metalsmith plugins move to the scaffold's current defaults. Each section is a separate migration — apply only the ones that match your plugin's current state.

## Table of Contents

- [v3.0.0 — ESM-only publishing](#v300--esm-only-publishing)
- [v2.0.0 — Biome + node:test toolchain](#v200--biome--nodetest-toolchain)
- [Verifying with the MCP server](#verifying-with-the-mcp-server)

## v3.0.0 — ESM-only publishing

The scaffold no longer produces a dual ESM/CJS build. Plugins publish `src/` directly with `"type": "module"` and `"exports": "./src/index.js"`. CommonJS consumers can still `require('metalsmith-foo')` via Node 22+'s stable `require(esm)`, so dropping the build does not break existing users.

### Detection

Your plugin needs this migration if any of the following is true:

- `package.json` has `main`, `module`, or dual `exports.import`/`exports.require` fields
- `package.json` devDependencies include `microbundle`
- `package.json` scripts include `build`, `prepublishOnly: npm run build`, `test:esm`, or `test:cjs`
- A `lib/` build-output directory exists
- A `test/**/*.test.cjs` file exists

### Steps

**1. Update `package.json`**

Remove these fields:

```diff
- "main": "lib/index.cjs",
- "module": "lib/index.js",
- "exports": {
-   "import": "./lib/index.js",
-   "require": "./lib/index.cjs"
- },
```

Add or replace with:

```json
{
  "type": "module",
  "exports": "./src/index.js",
  "files": ["src/**/*.js", "LICENSE", "README.md"]
}
```

Remove these scripts:

```diff
- "build": "microbundle --target node --no-compress --format modern,cjs --generateTypes false",
- "prepublishOnly": "npm run build",
- "test:esm": "node --test ...",
- "test:cjs": "node --test ... *.test.cjs",
```

Keep a single test script:

```json
{
  "test": "node --test --test-timeout=15000 'test/**/*.test.js'"
}
```

Remove `microbundle` from devDependencies:

```bash
npm uninstall microbundle
```

**2. Delete build artifacts and CJS test files**

```bash
rm -rf lib/
rm -f test/**/*.test.cjs
```

**3. Update README examples**

Replace any remaining CommonJS syntax in README code blocks:

```diff
- const Metalsmith = require('metalsmith');
- const myPlugin = require('my-plugin');
- Metalsmith(__dirname).use(myPlugin());
+ import Metalsmith from 'metalsmith';
+ import myPlugin from 'my-plugin';
+ Metalsmith(import.meta.dirname).use(myPlugin());
```

Remove the ESM/CJS badge from the README if present.

**4. Verify**

```bash
npm install
npm test
npx metalsmith-plugin-mcp-server validate .
```

The validator flags any remaining `require()`, `module.exports`, `__dirname`, or `__filename` in README code blocks, and flags `microbundle`, `lib/`, `main`, `module`, and dual `exports` fields as legacy.

### Why this works

Node 22 made `require(esm)` stable. When a CommonJS user writes `const plugin = require('metalsmith-foo')`, Node loads the ESM source and returns the default export. No build step, no dual exports, no compatibility shim.

## v2.0.0 — Biome + node:test toolchain

The scaffold replaced ESLint + Prettier with Biome, Mocha + Chai with `node:test` + `node:assert/strict`, and c8 with native coverage.

### Detection

Your plugin needs this migration if any of the following is true:

- `package.json` devDependencies include `eslint`, `prettier`, `mocha`, `chai`, `c8`, or `nyc`
- `eslint.config.js`, `.eslintrc*`, `prettier.config.js`, `.prettierrc*`, `.c8rc.json`, `.nycrc`, or `.mocharc.*` exists
- Test files import from `mocha` or `chai`

### Steps

**1. Delete legacy configs**

```bash
rm -f eslint.config.js .eslintrc* prettier.config.js .prettierrc* .c8rc.json .nycrc .nycrc.json .mocharc.*
```

**2. Regenerate `biome.json`**

```bash
npx metalsmith-plugin-mcp-server configs .
```

**3. Update test imports**

```diff
- import { describe, it, before, after } from 'mocha';
- import { expect } from 'chai';
+ import { describe, it, before, after } from 'node:test';
+ import assert from 'node:assert/strict';
```

Replace `expect(...).to.equal(...)` with `assert.equal(...)`, `expect(...).to.deep.equal(...)` with `assert.deepEqual(...)`, and so on.

**4. Update `package.json`**

```bash
npm uninstall eslint prettier mocha chai c8 nyc
npm install --save-dev @biomejs/biome
```

Bump `engines.node`:

```json
{
  "engines": {
    "node": ">= 22.0.0"
  }
}
```

Use the canonical scripts (see `npx metalsmith-plugin-mcp-server show-template package-scripts`):

```json
{
  "test": "node --test --test-timeout=15000 'test/**/*.test.js'",
  "coverage": "mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=lcov --test-reporter-destination=coverage/lcov.info --test-timeout=15000 'test/**/*.test.js'",
  "lint": "biome check --write .",
  "lint:check": "biome check .",
  "format": "biome format --write .",
  "format:check": "biome format ."
}
```

**5. Verify**

```bash
npm install
npm run lint:check
npm test
```

## Verifying with the MCP server

After either migration, run:

```bash
npx metalsmith-plugin-mcp-server validate .
```

The validator reports any remaining legacy configs, dependencies, or patterns as actionable recommendations. Work through the list until the report is clean.

For a full audit (validation + lint + tests + coverage):

```bash
npx metalsmith-plugin-mcp-server audit .
```
