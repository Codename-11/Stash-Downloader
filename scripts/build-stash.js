#!/usr/bin/env node

/**
 * Build script for creating a ready-to-install Stash plugin folder
 *
 * Usage: npm run build:stash
 *
 * This script:
 * 1. Creates stash-plugin/ directory (cleaned if exists)
 * 2. Copies all required plugin files
 * 3. Outputs installation instructions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'stash-plugin');

// Files to copy
const filesToCopy = [
  { src: 'stash-downloader.yml', dest: 'stash-downloader.yml' },
  { src: 'README.md', dest: 'README.md' },
  { src: 'LICENSE', dest: 'LICENSE' },
];

// Directories to copy
const dirsToCopy = [
  { src: 'dist', dest: 'dist' },
  { src: 'scripts', dest: 'scripts', filter: (f) => f.endsWith('.py') || f.endsWith('.sh') },
];

/**
 * Remove directory recursively
 */
function rmSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Copy directory recursively with optional filter
 */
function copyDirSync(src, dest, filter) {
  if (!fs.existsSync(src)) {
    console.warn(`  Warning: Source directory not found: ${src}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, filter);
    } else if (!filter || filter(entry.name)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Main build function
 */
function build() {
  console.log('');
  console.log('Building Stash plugin package...');
  console.log('================================');
  console.log('');

  // Clean output directory
  console.log('1. Cleaning output directory...');
  rmSync(outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  // Copy files
  console.log('2. Copying files...');
  for (const file of filesToCopy) {
    const srcPath = path.join(rootDir, file.src);
    const destPath = path.join(outputDir, file.dest);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`   ✓ ${file.src}`);
    } else {
      console.warn(`   ⚠ ${file.src} (not found, skipping)`);
    }
  }

  // Copy directories
  console.log('3. Copying directories...');
  for (const dir of dirsToCopy) {
    const srcPath = path.join(rootDir, dir.src);
    const destPath = path.join(outputDir, dir.dest);

    if (fs.existsSync(srcPath)) {
      copyDirSync(srcPath, destPath, dir.filter);
      console.log(`   ✓ ${dir.src}/`);
    } else {
      console.warn(`   ⚠ ${dir.src}/ (not found, skipping)`);
    }
  }

  // Verify output
  console.log('');
  console.log('4. Verifying output...');
  const requiredFiles = [
    'stash-downloader.yml',
    'dist/stash-downloader.js',
    'scripts/download.py',
  ];

  let allPresent = true;
  for (const file of requiredFiles) {
    const filePath = path.join(outputDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✓ ${file}`);
    } else {
      console.error(`   ✗ ${file} (MISSING)`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    console.error('');
    console.error('Error: Some required files are missing!');
    console.error('Make sure you ran "npm run build" first.');
    process.exit(1);
  }

  // Success message
  console.log('');
  console.log('================================');
  console.log('✓ Plugin package ready!');
  console.log('');
  console.log('Output: stash-plugin/');
  console.log('');
  console.log('To install:');
  console.log('  1. Copy the stash-plugin/ folder to your Stash plugins directory');
  console.log('  2. Rename to "stash-downloader" (or any name you prefer)');
  console.log('  3. Reload plugins in Stash UI (Settings > Plugins > Reload)');
  console.log('');
  console.log('Example (Linux/macOS):');
  console.log('  cp -r stash-plugin/ ~/.stash/plugins/stash-downloader');
  console.log('');
  console.log('Example (Windows):');
  console.log('  xcopy stash-plugin %USERPROFILE%\\.stash\\plugins\\stash-downloader /E /I');
  console.log('');
}

// Run
build();
