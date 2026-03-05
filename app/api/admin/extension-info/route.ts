import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { FOUNDER_EMAILS } from "@/lib/feature-flags";
import { readFile, stat } from "fs/promises";
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
    const buildInfoPath = path.join(process.cwd(), "chrome-extension", "dist", "build-info.json");
    const zipPath = path.join(process.cwd(), "chrome-extension", "dist", "jobfiltr-extension.zip");

    // Get ZIP file stats
    const zipStats = await stat(zipPath);
    const zipSizeKB = Math.round(zipStats.size / 1024);

    // Try to read build info
    let buildInfo = null;
    try {
      const raw = await readFile(buildInfoPath, "utf-8");
      buildInfo = JSON.parse(raw);
    } catch {
      // build-info.json doesn't exist yet (old build)
    }

    return NextResponse.json({
      exists: true,
      sizeKB: zipSizeKB,
      buildTime: buildInfo?.buildTime || null,
      commit: buildInfo?.commit || null,
      commitFull: buildInfo?.commitFull || null,
      commitMessage: buildInfo?.commitMessage || null,
      manifestVersion: buildInfo?.manifestVersion || null,
      cacheVersion: buildInfo?.cacheVersion || null,
    });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
