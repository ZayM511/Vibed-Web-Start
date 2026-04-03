"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

export const sendRedemptionConfirmation = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
    code: v.string(),
    tier: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      return { success: false };
    }

    const resend = new Resend(apiKey);

    const tierDescriptions: Record<number, string> = {
      1: "Lifetime Pro for 1 user",
      2: "Lifetime Pro + 1 gift license",
      3: "Lifetime Pro + 2 gift licenses + all future features forever",
    };

    const tierDesc = tierDescriptions[args.tier] || tierDescriptions[1];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4, #2563eb); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Welcome to JobFiltr Pro!</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 16px;">Your lifetime license has been activated</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi ${args.name},
              </p>
              <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Thank you so much for choosing JobFiltr! We sincerely appreciate your support. Your AppSumo license code has been successfully redeemed and your Pro account is now active — forever.
              </p>

              <!-- License Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">License Code</p>
                    <p style="color: #06b6d4; font-size: 20px; font-family: monospace; font-weight: 700; margin: 0 0 16px;">${args.code}</p>
                    <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Your Plan</p>
                    <p style="color: #f59e0b; font-size: 16px; font-weight: 600; margin: 0;">Tier ${args.tier} — ${tierDesc}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="https://chromewebstore.google.com/detail/jobfiltr-job-search-power/jddcgobdokioeapnopadlgfhcancmjfl"
                       style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #2563eb); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Install Chrome Extension
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                Once installed, sign in with <strong style="color: #e2e8f0;">${args.email}</strong> and your Pro features will be active immediately. No monthly charges, no expiration — it's yours for life.
              </p>

              <!-- What's Included -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #e2e8f0; font-size: 14px; font-weight: 600; margin: 0 0 12px;">What's included in Pro:</p>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 2; margin: 0;">
                      &#10003; Ghost job detection (50+ AI signals)<br>
                      &#10003; Unlimited scans (free tier: 3/month)<br>
                      &#10003; Job age badges on LinkedIn &amp; Indeed<br>
                      &#10003; Staffing agency &amp; scam filters<br>
                      &#10003; Keyword include/exclude filters<br>
                      &#10003; Community-reported company warnings<br>
                      &#10003; All future features &amp; updates
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #334155; text-align: center;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                Need help? Reply to this email or reach us at
                <a href="mailto:support@jobfiltr.app" style="color: #06b6d4; text-decoration: none;">support@jobfiltr.app</a>
              </p>
              <p style="color: #475569; font-size: 12px; margin: 12px 0 0;">
                Built with care by Groundwork Labs. Zero tracking. Zero data selling. Your job search, upgraded.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `Welcome to JobFiltr Pro, ${args.name}!

Your AppSumo license code (${args.code}) has been successfully redeemed.

Your Plan: Tier ${args.tier} — ${tierDesc}

Install the Chrome extension: https://chromewebstore.google.com/detail/jobfiltr-job-search-power/jddcgobdokioeapnopadlgfhcancmjfl

Sign in with ${args.email} and your Pro features will be active immediately. No monthly charges, no expiration — it's yours for life.

Need help? Contact support@jobfiltr.app

Thank you for choosing JobFiltr!
— The Groundwork Labs Team`;

    try {
      await resend.emails.send({
        from: "JobFiltr <noreply@jobfiltr.app>",
        to: [args.email],
        subject: "Welcome to JobFiltr Pro! Your lifetime license is active",
        html,
        text,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send redemption email:", error);
      return { success: false };
    }
  },
});
