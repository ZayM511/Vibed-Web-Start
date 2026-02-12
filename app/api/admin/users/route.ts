import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { FOUNDER_EMAILS } from "@/lib/feature-flags";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the requesting user is a founder
  const client = await clerkClient();
  const requestingUser = await client.users.getUser(userId);
  const requestingEmail = requestingUser.emailAddresses.find(
    (e) => e.id === requestingUser.primaryEmailAddressId
  )?.emailAddress;

  if (!requestingEmail || !FOUNDER_EMAILS.includes(requestingEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all users from Clerk
  const allUsers = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const batch = await client.users.getUserList({ limit, offset });
    allUsers.push(...batch.data);
    if (batch.data.length < limit) break;
    offset += limit;
  }

  // Format user data
  const users = allUsers.map((user) => {
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    return {
      id: user.id,
      email: primaryEmail || "No email",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown",
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      lastActiveAt: user.lastActiveAt,
    };
  });

  return NextResponse.json({ users, total: users.length });
}
