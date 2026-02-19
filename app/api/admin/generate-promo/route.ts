import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { FOUNDER_EMAILS } from "@/lib/feature-flags";
import sharp from "sharp";

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

async function generateTile(
  width: number,
  height: number,
  subtitle: string,
  features?: string[]
): Promise<Buffer> {
  const bg = createGradientSvg(width, height);
  const text = createTextOverlay(width, height, {
    title: "JobFiltr",
    subtitle,
    features,
  });

  const composite = await sharp(bg)
    .composite([{ input: text, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return composite;
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
    const subtitle = "Your Job Search Power Tool";

    // Generate small promo tile (440x280) - in memory
    const smallTileBuffer = await generateTile(440, 280, subtitle);

    // Generate marquee promo tile (1400x560) - in memory
    const marqueeTileBuffer = await generateTile(1400, 560, subtitle, [
      "Ghost Job Detection  |  Scam & Spam Filters  |  Community Reports",
      "LinkedIn & Indeed  |  Job Age Badges  |  Smart Keyword Filters",
    ]);

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      tiles: {
        small: {
          filename: "small-tile-440x280.png",
          width: 440,
          height: 280,
          base64: smallTileBuffer.toString("base64"),
        },
        marquee: {
          filename: "marquee-1400x560.png",
          width: 1400,
          height: 560,
          base64: marqueeTileBuffer.toString("base64"),
        },
      },
    });
  } catch (error) {
    console.error("Failed to generate promo tiles:", error);
    return NextResponse.json(
      { error: "Failed to generate promo tiles" },
      { status: 500 }
    );
  }
}
