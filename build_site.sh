#!/bin/bash
# Build script for generating Stash plugin repository index

set -e

echo "Building Stash Downloader Plugin..."

# Build the plugin
echo "Installing dependencies..."
npm ci

echo "Building plugin..."
npm run build

# Create output directory
echo "Creating output directory..."
mkdir -p _site
rm -rf _site/*

# Create plugin directory structure
echo "Creating plugin directory structure..."
mkdir -p plugins/stash-downloader
cp -r dist plugins/stash-downloader/
cp stash-downloader.yml plugins/stash-downloader/
cp README.md plugins/stash-downloader/
cp LICENSE plugins/stash-downloader/

# Create ZIP file
echo "Creating ZIP package..."
cd plugins
zip -r ../stash-downloader.zip stash-downloader
cd ..

# Calculate SHA256
echo "Calculating SHA256..."
if command -v sha256sum &> /dev/null; then
    SHA256=$(sha256sum stash-downloader.zip | awk '{print $1}')
elif command -v shasum &> /dev/null; then
    SHA256=$(shasum -a 256 stash-downloader.zip | awk '{print $1}')
else
    echo "Error: Neither sha256sum nor shasum found"
    exit 1
fi

# Move ZIP to _site directory
mv stash-downloader.zip _site/

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
DATETIME=$(date +'%Y-%m-%d %H:%M:%S')

# Generate index.yml
echo "Generating plugin index..."
cat > _site/index.yml << EOF
- id: stash-downloader
  name: Stash Downloader
  version: ${VERSION}
  date: ${DATETIME}
  path: stash-downloader.zip
  sha256: ${SHA256}
  description: Download images and videos from URLs with automatic metadata extraction and organization
  url: https://github.com/Codename-11/Stash-Downloader
EOF

echo "✅ Build complete!"
echo "📦 Plugin ZIP: _site/stash-downloader.zip"
echo "📄 Index file: _site/index.yml"
echo "🔒 SHA256: ${SHA256}"
echo ""
echo "To test locally, commit and push to trigger GitHub Pages deployment."
echo "Then add this URL to Stash: https://codename-11.github.io/Stash-Downloader/index.yml"
