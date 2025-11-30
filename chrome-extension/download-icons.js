// Download icons from Iconify and convert to PNG
const https = require('https');
const fs = require('fs');
const path = require('path');

// Best icon candidates for JobFiltr
const iconCandidates = [
  'mdi:shield-check',           // Shield with checkmark - perfect for protection/verification
  'mdi:filter-check',           // Filter with checkmark - perfect for job filtering
  'heroicons:shield-check-20-solid', // Another shield check option
  'tabler:filter-check',        // Clean filter check icon
];

// Use the first icon as primary
const primaryIcon = 'mdi:shield-check';

function downloadSVG(iconName) {
  return new Promise((resolve, reject) => {
    const url = `https://api.iconify.design/${iconName}.svg?color=%236B46C1`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Failed to download ${iconName}: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function convertSVGToPNG(svgContent, size) {
  // Check if sharp is available for high-quality conversion
  try {
    const sharp = require('sharp');
    const buffer = Buffer.from(svgContent);
    return await sharp(buffer)
      .resize(size, size)
      .png()
      .toBuffer();
  } catch (e) {
    console.log('Sharp not available, trying canvas...');

    try {
      const { createCanvas, loadImage } = require('canvas');

      // Convert SVG to data URL
      const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;

      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');

      // Load and draw SVG
      const img = await loadImage(svgDataUrl);
      ctx.drawImage(img, 0, 0, size, size);

      return canvas.toBuffer('image/png');
    } catch (canvasError) {
      throw new Error('Neither sharp nor canvas available for PNG conversion');
    }
  }
}

async function generateIcons() {
  console.log('Downloading icon from Iconify...');

  try {
    // Download SVG
    const svgContent = await downloadSVG(primaryIcon);
    console.log(`✓ Downloaded ${primaryIcon}`);

    // Save original SVG
    const iconsDir = path.join(__dirname, 'icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir);
    }

    fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);
    console.log('✓ Saved icon.svg');

    // Try to convert to PNG sizes
    const sizes = [16, 32, 48, 128];

    // Check if we have conversion tools
    const hasSharp = await checkPackage('sharp');
    const hasCanvas = await checkPackage('canvas');

    if (!hasSharp && !hasCanvas) {
      console.log('\nNo PNG conversion tools available.');
      console.log('Installing sharp for high-quality PNG generation...');
      await installPackage('sharp');
    }

    console.log('\nGenerating PNG files...');
    for (const size of sizes) {
      try {
        const pngBuffer = await convertSVGToPNG(svgContent, size);
        const filename = path.join(iconsDir, `icon${size}.png`);
        fs.writeFileSync(filename, pngBuffer);
        console.log(`✓ Created ${filename}`);
      } catch (error) {
        console.error(`✗ Failed to create icon${size}.png:`, error.message);
      }
    }

    console.log('\n✓ Icon generation complete!');
    console.log(`\nUsing icon: ${primaryIcon}`);
    console.log('This shield-check icon represents protection and verification,');
    console.log('perfect for JobFiltr\'s job scam detection features.');

  } catch (error) {
    console.error('Failed to generate icons:', error.message);
    console.log('\nCreating fallback icons...');
    createFallbackIcons();
  }
}

function checkPackage(packageName) {
  return new Promise((resolve) => {
    try {
      require.resolve(packageName);
      resolve(true);
    } catch (e) {
      resolve(false);
    }
  });
}

function installPackage(packageName) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(`npm install ${packageName}`, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function createFallbackIcons() {
  const iconsDir = path.join(__dirname, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
  }

  const sizes = [16, 32, 48, 128];

  // Create a simple colored square PNG as fallback
  const createColoredPNG = (size) => {
    // This creates a minimal valid PNG with color
    // For a proper fallback, we'll create SVG versions instead
    const svgContent = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#001f54;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#6B46C1;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="5" fill="url(#grad)"/>
        <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `;

    return svgContent;
  };

  // For fallback, just copy the SVG to different sizes
  sizes.forEach(size => {
    const filename = path.join(iconsDir, `icon${size}.svg`);
    fs.writeFileSync(filename, createColoredPNG(size));
    console.log(`✓ Created fallback ${filename}`);
  });

  console.log('\nFallback SVG icons created.');
  console.log('Note: Chrome extensions work with SVG icons in manifest v3.');
  console.log('Update manifest.json to use .svg instead of .png if needed.');
}

// Run the generator
generateIcons().catch(console.error);
