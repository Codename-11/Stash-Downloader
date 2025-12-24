const fs = require('fs');
const path = require('path');

// SVG template for the icon
const createSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="88" height="88" rx="18" fill="url(#bg)"/>
  <g fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M48 24 L48 56"/>
    <path d="M34 44 L48 58 L62 44"/>
    <path d="M28 64 L28 72 L68 72 L68 64"/>
  </g>
</svg>`;

const sizes = [16, 32, 48, 96];
const iconsDir = __dirname;

// Check if sharp is available, otherwise just create SVGs
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('sharp not installed, creating SVG files instead...');
  console.log('To generate PNG icons, install sharp: npm install sharp');
  console.log('');

  // Create SVG files for each size
  sizes.forEach(size => {
    const svgContent = createSvg(size);
    const filePath = path.join(iconsDir, `icon-${size}.svg`);
    fs.writeFileSync(filePath, svgContent);
    console.log(`Created: icon-${size}.svg`);
  });

  console.log('\nTo convert SVGs to PNGs, you can use:');
  console.log('- Online converter: https://svgtopng.com/');
  console.log('- Inkscape: inkscape icon-96.svg -o icon-96.png');
  console.log('- ImageMagick: convert icon-96.svg icon-96.png');
  process.exit(0);
}

// Generate PNG icons using sharp
async function generateIcons() {
  for (const size of sizes) {
    const svgContent = createSvg(size);
    const outputPath = path.join(iconsDir, `icon-${size}.png`);

    await sharp(Buffer.from(svgContent))
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}.png`);
  }
  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
