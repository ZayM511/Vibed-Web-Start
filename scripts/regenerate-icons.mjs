// Standalone script to regenerate icons with transparent background
// Includes second-pass BFS to fix enclosed white regions (handle gap)
import sharp from "sharp";
import path from "path";
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

async function main() {
  const sourcePath = path.join(root, "public", "jobfiltr-logo-source.png");
  const sizes = [128, 48, 16];

  const publicIconsDir = path.join(root, "public", "icons");
  const extensionIconsDir = path.join(root, "chrome-extension", "icons");
  await mkdir(publicIconsDir, { recursive: true });
  await mkdir(extensionIconsDir, { recursive: true });

  // Load source and ensure alpha channel
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = info;
  const ch = 4;
  const output = Buffer.from(data);
  const visited = new Uint8Array(w * h);

  const isWhitish = (x, y) => {
    const i = (y * w + x) * ch;
    return output[i] >= 235 && output[i + 1] >= 235 && output[i + 2] >= 235;
  };

  // Pass 1: Seed BFS from all white-ish edge pixels
  const queue = [];
  for (let x = 0; x < w; x++) {
    if (isWhitish(x, 0)) { queue.push([x, 0]); visited[x] = 1; }
    if (isWhitish(x, h - 1)) { queue.push([x, h - 1]); visited[(h - 1) * w + x] = 1; }
  }
  for (let y = 0; y < h; y++) {
    if (isWhitish(0, y)) { queue.push([0, y]); visited[y * w] = 1; }
    if (isWhitish(w - 1, y)) { queue.push([w - 1, y]); visited[y * w + (w - 1)] = 1; }
  }

  const dx = [-1, 0, 1, 0, -1, -1, 1, 1];
  const dy = [0, -1, 0, 1, -1, 1, -1, 1];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    output[(cy * w + cx) * ch + 3] = 0;
    for (let d = 0; d < 8; d++) {
      const nx = cx + dx[d], ny = cy + dy[d];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (visited[ny * w + nx]) continue;
      if (isWhitish(nx, ny)) {
        visited[ny * w + nx] = 1;
        queue.push([nx, ny]);
      }
    }
  }

  // Pass 2: Make any remaining unvisited white pixels in the top 20% transparent.
  // These are enclosed white regions (like the gap between handle and suitcase body)
  // that the edge BFS couldn't reach. The funnel body starts lower, so top 20% is safe.
  const topLimit = Math.round(h * 0.20);
  let pass2Count = 0;
  for (let y = 0; y < topLimit; y++) {
    for (let x = 0; x < w; x++) {
      if (visited[y * w + x]) continue; // already processed by edge BFS
      if (!isWhitish(x, y)) continue;
      output[(y * w + x) * ch + 3] = 0;
      pass2Count++;
    }
  }
  console.log(`Pass 2: made ${pass2Count} enclosed white pixels transparent (top 20%)`);
  console.log(`Image dimensions: ${w}x${h}, topLimit: ${topLimit}px`);

  // Edge anti-aliasing
  const edgeOutput = Buffer.from(output);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * ch;
      if (edgeOutput[i + 3] === 0) continue;
      let tn = 0;
      for (let d = 0; d < 4; d++) {
        if (output[((y + dy[d]) * w + (x + dx[d])) * ch + 3] === 0) tn++;
      }
      if (tn >= 2 && edgeOutput[i] >= 250 && edgeOutput[i + 1] >= 250 && edgeOutput[i + 2] >= 250) {
        edgeOutput[i + 3] = Math.round(255 * (1 - tn / 6));
      }
    }
  }

  const transparentSource = await sharp(edgeOutput, {
    raw: { width: w, height: h, channels: 4 },
  }).png().toBuffer();

  // Save cleaned transparent PNG for promo tile generation
  const transparentPngPath = path.join(root, "public", "jobfiltr-logo-transparent.png");
  await sharp(transparentSource).toFile(transparentPngPath);
  console.log(`Saved: ${transparentPngPath}`);

  // Generate sized icons
  for (const size of sizes) {
    const buffer = await sharp(transparentSource)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const publicPath = path.join(publicIconsDir, `icon${size}.png`);
    const extensionPath = path.join(extensionIconsDir, `icon${size}.png`);

    await sharp(buffer).toFile(publicPath);
    await sharp(buffer).toFile(extensionPath);
    console.log(`Saved: icon${size}.png (public + extension)`);
  }

  console.log("\nDone! All icons regenerated with handle gap fix.");
}

main().catch(console.error);
