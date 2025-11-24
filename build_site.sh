#!/bin/bash
# Build script for generating Stash plugin repository index

set -e

echo "Building Stash Downloader Plugin..."

# Build the plugin
echo "Installing dependencies..."
npm ci

echo "Building plugin..."
npm run build

# Create plugin directory structure
echo "Creating plugin directory structure..."
mkdir -p plugins/stash-downloader
cp -r dist plugins/stash-downloader/
cp stash-downloader.yml plugins/stash-downloader/
cp README.md plugins/stash-downloader/
cp LICENSE plugins/stash-downloader/

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
DATE=$(date +%Y-%m-%d)

# Generate index.yml
echo "Generating plugin index..."
cat > index.yml << EOF
---
version: "1"
sources:
  - id: stash-downloader
    name: Stash Downloader
    metadata:
      Name: Stash Downloader
      Author: Codename-11
      Description: Download images and videos from URLs with automatic metadata extraction and organization
      URL: https://github.com/Codename-11/Stash-Downloader
      Tags:
        - download
        - metadata
        - scraper
        - react
    plugins:
      - id: stash-downloader
        name: Stash Downloader
        version: ${VERSION}
        date: ${DATE}
        files:
          - stash-downloader.yml
          - dist/stash-downloader.js
        requires:
          - stash: ">=0.20.0"
        description: Download images and videos from URLs with automatic metadata extraction and organization
        url: https://github.com/Codename-11/Stash-Downloader
        path: plugins/stash-downloader
EOF

echo "✅ Build complete!"
echo "📦 Plugin files: plugins/stash-downloader/"
echo "📄 Index file: index.yml"
echo ""
echo "To test locally, commit and push to trigger GitHub Pages deployment."
echo "Then add this URL to Stash: https://codename-11.github.io/Stash-Downloader/index.yml"
