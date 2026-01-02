/**
 * Package the Firefox extension into a ZIP file
 *
 * Creates stash-downloader-extension.zip with all required files
 * for submission to Firefox Add-ons (AMO).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extDir = path.join(__dirname, '..');
const outputZip = path.join(extDir, 'stash-downloader-extension.zip');

// Files/directories to include in the ZIP
const includes = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup/',
  'options/',
  'icons/',
  'README.md',
];

// Remove existing ZIP if present
if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
  console.log('Removed existing ZIP');
}

// Build the zip command
const filesToZip = includes.filter(f => {
  const fullPath = path.join(extDir, f);
  return fs.existsSync(fullPath);
}).join(' ');

try {
  // Use PowerShell on Windows, zip on Unix
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // PowerShell Compress-Archive
    const psCommand = `Compress-Archive -Path ${includes.map(f => `"${f}"`).join(',')} -DestinationPath "stash-downloader-extension.zip" -Force`;
    execSync(`powershell -Command "${psCommand}"`, { cwd: extDir, stdio: 'inherit' });
  } else {
    // Unix zip command
    execSync(`zip -r stash-downloader-extension.zip ${filesToZip}`, { cwd: extDir, stdio: 'inherit' });
  }

  // Get file size
  const stats = fs.statSync(outputZip);
  const sizeKB = (stats.size / 1024).toFixed(1);

  // Get version from manifest
  const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));

  console.log(`\n✓ Created: stash-downloader-extension.zip`);
  console.log(`  Version: ${manifest.version}`);
  console.log(`  Size: ${sizeKB} KB`);
  console.log(`\nNext steps:`);
  console.log(`  1. Upload to Firefox Add-ons: https://addons.mozilla.org/developers/`);
  console.log(`  2. Or install locally: about:debugging → Load Temporary Add-on`);
} catch (error) {
  console.error('Failed to create ZIP:', error.message);
  process.exit(1);
}
