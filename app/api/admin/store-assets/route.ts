import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { FOUNDER_EMAILS } from "@/lib/feature-flags";
import { readdir } from "fs/promises";
import path from "path";

export async function GET() {
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
    const screenshotsDir = path.join(process.cwd(), "public", "store-assets", "screenshots");
    const promoDir = path.join(process.cwd(), "public", "store-assets", "promo");

    let screenshots: string[] = [];
    let promos: string[] = [];

    try {
      screenshots = await readdir(screenshotsDir);
    } catch {
      // Directory may not exist yet
    }
    try {
      promos = await readdir(promoDir);
    } catch {
      // Directory may not exist yet
    }

    return NextResponse.json({
      screenshots: screenshots
        .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
        .map((f) => ({
          filename: f,
          path: `/store-assets/screenshots/${f}`,
        })),
      promos: promos
        .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
        .map((f) => ({
          filename: f,
          path: `/store-assets/promo/${f}`,
        })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to list store assets" },
      { status: 500 }
    );
  }
}
