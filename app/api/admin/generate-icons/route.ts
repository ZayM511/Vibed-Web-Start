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

    // Remove white background from source to create transparent version
    const { data, info } = await sharp(sourcePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const output = Buffer.from(data);
    const threshold = 245;
    for (let i = 0; i < output.length; i += 4) {
      const r = output[i], g = output[i + 1], b = output[i + 2];
      if (r >= threshold && g >= threshold && b >= threshold) {
        output[i + 3] = 0;
      } else if (r >= 230 && g >= 230 && b >= 230) {
        const brightness = (r + g + b) / 3;
        output[i + 3] = Math.max(0, Math.min(255, Math.round(255 * (1 - (brightness - 230) / 25))));
      }
    }

    const transparentSource = await sharp(output, {
      raw: { width: info.width, height: info.height, channels: 4 },
    }).png().toBuffer();

    for (const size of sizes) {
      const buffer = await sharp(transparentSource)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      const publicPath = path.join(publicIconsDir, `icon${size}.png`);
      const extensionPath = path.join(extensionIconsDir, `icon${size}.png`);

      await sharp(buffer).toFile(publicPath);
      await sharp(buffer).toFile(extensionPath);
    }

    return NextResponse.json({
      success: true,
      icons: sizes.map((size) => ({
        size: `${size}x${size}`,
        publicPath: `/icons/icon${size}.png`,
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
