import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { FOUNDER_EMAILS } from "@/lib/feature-flags";
import sharp from "sharp";
import path from "path";
import { mkdir } from "fs/promises";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const requestingUser = await client.users.getUser(userId);
  const requestingEmail = requestingUser.emailAddresses.find(
    (e) => e.id === requestingUser.primaryEmailAddressId
  )?.emailAddress;

  if (!requestingEmail || !FOUNDER_EMAILS.includes(requestingEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sourcePath = path.join(process.cwd(), "public", "jobfiltr-logo-source.png");
    const sizes = [128, 48, 16];

    // Ensure output directories exist
    const publicIconsDir = path.join(process.cwd(), "public", "icons");
    const extensionIconsDir = path.join(process.cwd(), "chrome-extension", "icons");
    await mkdir(publicIconsDir, { recursive: true });
    await mkdir(extensionIconsDir, { recursive: true });

    // Remove white background via flood fill from edges (preserves interior white like the funnel)
    const { data, info } = await sharp(sourcePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width: w, height: h } = info;
    const ch = 4;
    const output = Buffer.from(data);
    const visited = new Uint8Array(w * h);

    const isWhitish = (x: number, y: number) => {
      const i = (y * w + x) * ch;
      return output[i] >= 235 && output[i + 1] >= 235 && output[i + 2] >= 235;
    };

    // Seed BFS from all white-ish edge pixels
    const queue: [number, number][] = [];
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
      const [cx, cy] = queue.shift()!;
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

    // Second pass: make any remaining unvisited white pixels in the top 20% transparent.
    // These are enclosed white regions (like the gap between handle and suitcase body)
    // that the edge BFS couldn't reach. The funnel body starts lower, so top 20% is safe.
    const topLimit = Math.round(h * 0.20);
    for (let y = 0; y < topLimit; y++) {
      for (let x = 0; x < w; x++) {
        if (visited[y * w + x]) continue;
        if (!isWhitish(x, y)) continue;
        output[(y * w + x) * ch + 3] = 0;
      }
    }

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

    const iconBuffers: Record<number, string> = {};
    for (const size of sizes) {
      const buffer = await sharp(transparentSource)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      iconBuffers[size] = buffer.toString("base64");

      // Best-effort disk write (works locally, fails silently on Vercel's read-only fs)
      try {
        await sharp(buffer).toFile(path.join(publicIconsDir, `icon${size}.png`));
        await sharp(buffer).toFile(path.join(extensionIconsDir, `icon${size}.png`));
      } catch { /* read-only filesystem on Vercel */ }
    }

    // Best-effort: save cleaned transparent PNG for promo tile generation
    try {
      const transparentPngPath = path.join(process.cwd(), "public", "jobfiltr-logo-transparent.png");
      await sharp(transparentSource).toFile(transparentPngPath);
    } catch { /* read-only filesystem on Vercel */ }

    return NextResponse.json({
      success: true,
      icons: sizes.map((size) => ({
        size: `${size}x${size}`,
        publicPath: `/icons/icon${size}.png`,
        base64: iconBuffers[size],
      })),
    });
  } catch (error) {
    console.error("Icon generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate icons" },
      { status: 500 }
    );
  }
}
