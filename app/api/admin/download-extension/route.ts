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
    const zipPath = path.join(process.cwd(), "chrome-extension", "dist", "jobfiltr-extension.zip");

    // Check file exists
    await stat(zipPath);

    const fileBuffer = await readFile(zipPath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=jobfiltr-extension.zip",
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Extension ZIP not found. Run the build script first: cd chrome-extension && pwsh -File build-extension.ps1" },
      { status: 404 }
    );
  }
}
