/**
 * Package the Firefox extension into a ZIP file
 *
 * Creates stash-downloader-extension.zip with all required files
 * for submission to Firefox Add-ons (AMO).
 *
 * On Windows: Uses tar (available in Windows 10+) or provides manual instructions
 * On Unix/CI: Uses zip command
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
  'popup',
  'options',
  'icons',
  'README.md',
];

// Get version from manifest
const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));

// Remove existing ZIP if present
if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
  console.log('Removed existing ZIP');
}

// Filter to existing files only
const filesToZip = includes.filter(f => {
  const fullPath = path.join(extDir, f);
  return fs.existsSync(fullPath);
});

try {
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // Try using 7zip if available, otherwise use tar
    try {
      // Try 7-Zip first (common on Windows)
      execSync(`7z a -tzip "stash-downloader-extension.zip" ${filesToZip.join(' ')}`, {
        cwd: extDir,
        stdio: 'pipe'
      });
    } catch {
      // Fall back to tar (Windows 10+)
      console.log('7-Zip not found, trying tar...');
      execSync(`tar -a -cf "stash-downloader-extension.zip" ${filesToZip.join(' ')}`, {
        cwd: extDir,
        stdio: 'inherit'
      });
    }
  } else {
    // Unix zip command (used in CI)
    execSync(`zip -r stash-downloader-extension.zip ${filesToZip.join(' ')}`, {
      cwd: extDir,
      stdio: 'inherit'
    });
  }

  // Get file size
  const stats = fs.statSync(outputZip);
  const sizeKB = (stats.size / 1024).toFixed(1);

  console.log(`\n✓ Created: stash-downloader-extension.zip`);
  console.log(`  Version: ${manifest.version}`);
  console.log(`  Size: ${sizeKB} KB`);
  console.log(`\nNext steps:`);
  console.log(`  1. Upload to Firefox Add-ons: https://addons.mozilla.org/developers/`);
  console.log(`  2. Or install locally: about:debugging → Load Temporary Add-on`);
} catch (error) {
  console.error('\n⚠️  Could not create ZIP automatically.');
  console.error('   Error:', error.message);
  console.log('\nManual ZIP creation:');
  console.log('  1. Select these files in browser-extension/:');
  filesToZip.forEach(f => console.log(`     - ${f}`));
  console.log('  2. Right-click → Send to → Compressed (zipped) folder');
  console.log('  3. Rename to: stash-downloader-extension.zip');
  console.log(`\nVersion: ${manifest.version}`);
  process.exit(1);
}
