import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { WAITLIST_MODE } from "@/lib/feature-flags";

const isAdminRoute = createRouteMatcher(["/admin", "/admin/(.*)"]);

const isProtectedRoute = createRouteMatcher([
  "/server",
  "/dashboard",
  "/dashboard/(.*)",
  "/admin",
  "/admin/(.*)",
  "/billing",
  "/billing/(.*)",
  "/scan",
  "/scanner",
  "/extension-errors",
  "/extension-errors/(.*)",
]);

// Routes that should redirect to home during waitlist mode (everything except /admin)
const isWaitlistBlockedRoute = createRouteMatcher([
  "/server",
  "/dashboard",
  "/dashboard/(.*)",
  "/billing",
  "/billing/(.*)",
  "/scan",
  "/scanner",
  "/extension-errors",
  "/extension-errors/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (WAITLIST_MODE) {
    // In waitlist mode: redirect non-admin protected routes to home
    if (isWaitlistBlockedRoute(req)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Admin route still requires sign-in
    if (isAdminRoute(req)) {
      await auth.protect();
    }
  } else {
    // Normal mode: protect all routes
    if (isProtectedRoute(req)) await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
