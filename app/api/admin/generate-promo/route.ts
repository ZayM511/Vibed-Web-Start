// Promo tile generation has been moved to the client-side (Canvas API)
// in components/admin/CwsSubmissionCard.tsx.
// This route is kept as a stub for backwards compatibility.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Promo tile generation has moved to the client side. Please refresh the page." },
    { status: 410 }
  );
}
