/**
 * Sync version from package.json to manifest.json
 *
 * This script is called automatically by npm version (via package.json "version" script)
 * to keep manifest.json in sync with package.json version.
 */

const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const manifestPath = path.join(__dirname, '..', 'manifest.json');

// Read package.json version
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageJson.version;

// Read and update manifest.json
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const oldVersion = manifest.version;
manifest.version = version;

// Write back
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`✓ Updated manifest.json version: ${oldVersion} → ${version}`);
