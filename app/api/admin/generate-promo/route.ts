import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { FOUNDER_EMAILS } from "@/lib/feature-flags";
import sharp from "sharp";
import path from "path";
import { mkdir, readFile } from "fs/promises";

function createGradientSvg(width: number, height: number): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#1e293b;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <rect x="0" y="0" width="${width}" height="4" fill="#3b82f6" opacity="0.6" />
    <rect x="0" y="${height - 4}" width="${width}" height="4" fill="#3b82f6" opacity="0.6" />
  </svg>`;
  return Buffer.from(svg);
}

function createTextOverlay(
  width: number,
  height: number,
  opts: { title: string; subtitle: string; features?: string[] }
): Buffer {
  const centerY = height / 2;
  const titleSize = Math.round(width / 12);
  const subtitleSize = Math.round(width / 22);
  const featureSize = Math.round(width / 28);

  let featuresMarkup = "";
  if (opts.features && opts.features.length > 0) {
    const startY = centerY + titleSize + 20;
    featuresMarkup = opts.features
      .map(
        (f, i) =>
          `<text x="${width / 2}" y="${startY + i * (featureSize + 10)}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${featureSize}" fill="rgba(255,255,255,0.7)">${f}</text>`
      )
      .join("\n");
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${width / 2}" y="${centerY - 10}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${titleSize}" font-weight="bold" fill="white">JobFiltr</text>
    <text x="${width / 2}" y="${centerY + subtitleSize + 10}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${subtitleSize}" fill="rgba(255,255,255,0.8)">${opts.subtitle}</text>
    ${featuresMarkup}
  </svg>`;
  return Buffer.from(svg);
}

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
    const outputDir = path.join(process.cwd(), "public", "store-assets", "promo");
    await mkdir(outputDir, { recursive: true });

    // Load logo for compositing
    const logoPath = path.join(process.cwd(), "public", "jobfiltr-logo-transparent.png");
    let logoBuffer: Buffer | null = null;
    try {
      logoBuffer = await readFile(logoPath);
    } catch {
      // Logo not available, continue without it
    }

    const generated: string[] = [];

    // Generate small promo tile (440x280)
    {
      const w = 440,
        h = 280;
      const bg = createGradientSvg(w, h);
      const text = createTextOverlay(w, h, {
        title: "JobFiltr",
        subtitle: "Filter Fake Jobs. Find Real Ones.",
      });

      let composite = sharp(bg).composite([{ input: text, top: 0, left: 0 }]);

      if (logoBuffer) {
        const resizedLogo = await sharp(logoBuffer)
          .resize(60, 60, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        composite = sharp(await composite.png().toBuffer()).composite([
          { input: resizedLogo, top: 30, left: Math.round((w - 60) / 2) },
        ]);
      }

      await composite.png().toFile(path.join(outputDir, "small-tile-440x280.png"));
      generated.push("small-tile-440x280.png");
    }

    // Generate marquee promo tile (1400x560)
    {
      const w = 1400,
        h = 560;
      const bg = createGradientSvg(w, h);
      const text = createTextOverlay(w, h, {
        title: "JobFiltr",
        subtitle: "Filter Fake Jobs. Find Real Ones.",
        features: [
          "Ghost Job Detection  |  Scam & Spam Filters  |  Community Reports",
          "LinkedIn & Indeed  |  Job Age Badges  |  Smart Keyword Filters",
        ],
      });

      let composite = sharp(bg).composite([{ input: text, top: 0, left: 0 }]);

      if (logoBuffer) {
        const resizedLogo = await sharp(logoBuffer)
          .resize(100, 100, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        composite = sharp(await composite.png().toBuffer()).composite([
          { input: resizedLogo, top: 40, left: Math.round((w - 100) / 2) },
        ]);
      }

      await composite.png().toFile(path.join(outputDir, "marquee-1400x560.png"));
      generated.push("marquee-1400x560.png");
    }

    return NextResponse.json({
      success: true,
      generated,
    });
  } catch (error) {
    console.error("Failed to generate promo tiles:", error);
    return NextResponse.json(
      { error: "Failed to generate promo tiles" },
      { status: 500 }
    );
  }
}
