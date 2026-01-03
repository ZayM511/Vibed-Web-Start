// Script to generate the new filter-based icons
const fs = require('fs');
const path = require('path');

// Create filter icon PNG using canvas
function createFilterIconPNG(size, colors) {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colors.start);
  gradient.addColorStop(1, colors.end);

  // Draw circular background
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.47, 0, 2 * Math.PI);
  ctx.fill();

  // Draw filter lines
  ctx.strokeStyle = 'white';
  ctx.lineCap = 'round';
  ctx.lineWidth = size / 16;

  // Top line (widest)
  const topY = size * 0.34;
  const topLineWidth = size * 0.56;
  ctx.beginPath();
  ctx.moveTo(size / 2 - topLineWidth / 2, topY);
  ctx.lineTo(size / 2 + topLineWidth / 2, topY);
  ctx.stroke();

  // Middle line
  const midY = size * 0.50;
  const midLineWidth = size * 0.40;
  ctx.beginPath();
  ctx.moveTo(size / 2 - midLineWidth / 2, midY);
  ctx.lineTo(size / 2 + midLineWidth / 2, midY);
  ctx.stroke();

  // Bottom line (narrowest)
  const botY = size * 0.66;
  const botLineWidth = size * 0.24;
  ctx.beginPath();
  ctx.moveTo(size / 2 - botLineWidth / 2, botY);
  ctx.lineTo(size / 2 + botLineWidth / 2, botY);
  ctx.stroke();

  // Draw small checkmark in corner (for larger sizes)
  if (size >= 48) {
    ctx.strokeStyle = 'white';
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = size / 25;
    ctx.lineJoin = 'round';

    const checkX = size * 0.70;
    const checkY = size * 0.62;
    const checkSize = size * 0.15;

    ctx.beginPath();
    ctx.moveTo(checkX, checkY + checkSize * 0.4);
    ctx.lineTo(checkX + checkSize * 0.35, checkY + checkSize * 0.7);
    ctx.lineTo(checkX + checkSize * 0.9, checkY);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  return canvas.toBuffer('image/png');
}

// Check if canvas package is available
try {
  require.resolve('canvas');
} catch (e) {
  console.error('Canvas package not found. Installing...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install canvas', { stdio: 'inherit', cwd: __dirname });
  } catch (installError) {
    console.error('Failed to install canvas package. Creating fallback icons...');
    createFallbackIcons();
    process.exit(0);
  }
}

// New premium color palette (deep navy)
const colors = {
  start: '#1E3A5F', // Deep Navy
  end: '#2A4A73'    // Slightly lighter navy
};

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

console.log('Generating new JobFiltr filter icons...');

sizes.forEach(size => {
  try {
    const buffer = createFilterIconPNG(size, colors);
    const filename = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`Created ${filename}`);
  } catch (error) {
    console.error(`Failed to create icon${size}.png:`, error.message);
  }
});

console.log('Icon generation complete!');

// Fallback function to create basic icons without canvas
function createFallbackIcons() {
  console.log('Creating fallback icons...');
  const iconsDir = path.join(__dirname, 'icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
  }

  // Create minimal valid PNG files (1x1 pixel with navy color)
  const createMinimalPNG = () => {
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
  };

  sizes.forEach(size => {
    const filename = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filename, createMinimalPNG());
    console.log(`Created fallback ${filename}`);
  });

  console.log('\nNote: Fallback icons are minimal placeholders.');
  console.log('For proper icons, please install the canvas package or use the SVG directly.');
}
