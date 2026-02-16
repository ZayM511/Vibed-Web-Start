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

    for (const size of sizes) {
      const buffer = await sharp(sourcePath)
        .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
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
