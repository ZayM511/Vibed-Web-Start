/**
 * Feature Flags
 *
 * WAITLIST_MODE: When true, hides public sign-in/sign-up UI and restricts
 * the /admin page to founder accounts only. All other authenticated routes
 * redirect to the homepage.
 *
 * To re-enable public auth after launch, set WAITLIST_MODE to false.
 */
export const WAITLIST_MODE = true;

/** Founder email addresses that can access /admin during waitlist mode */
export const FOUNDER_EMAILS = [
  "isaiah.e.malone@gmail.com",
  "zaydozier17@gmail.com",
  "support@jobfiltr.app",
];
