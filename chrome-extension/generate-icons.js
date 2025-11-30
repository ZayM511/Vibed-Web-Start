// Simple script to generate placeholder icons using Node.js Canvas
const fs = require('fs');
const path = require('path');

// Create a simple PNG file header and data
function createSimplePNG(size, colors) {
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colors.start);
  gradient.addColorStop(1, colors.end);

  // Draw rounded rectangle background
  const radius = size / 5;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Draw circle
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size / 20;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 3.2, 0, 2 * Math.PI);
  ctx.stroke();

  // Draw checkmark
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size / 20;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.39, size * 0.5);
  ctx.lineTo(size * 0.45, size * 0.56);
  ctx.lineTo(size * 0.61, size * 0.41);
  ctx.stroke();

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

const colors = {
  start: '#001f54', // Navy Blue
  end: '#6B46C1'    // Purple
};

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

console.log('Generating icons...');

sizes.forEach(size => {
  try {
    const buffer = createSimplePNG(size, colors);
    const filename = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`✓ Created ${filename}`);
  } catch (error) {
    console.error(`✗ Failed to create icon${size}.png:`, error.message);
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

  // Create minimal valid PNG files (1x1 transparent pixel)
  // PNG signature + IHDR + IDAT + IEND chunks
  const createMinimalPNG = () => {
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
      0x42, 0x60, 0x82
    ]);
  };

  sizes.forEach(size => {
    const filename = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filename, createMinimalPNG());
    console.log(`✓ Created fallback ${filename}`);
  });

  console.log('\nNote: Fallback icons are minimal placeholders.');
  console.log('For proper icons, please install the canvas package or create custom icons.');
}
