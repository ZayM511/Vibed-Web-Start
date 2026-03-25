"use node";

import { v } from "convex/values";
import { action, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { Resend } from "resend";

const EXTENSION_URL = "https://chromewebstore.google.com/detail/jobfiltr-job-search-power/jddcgobdokioeapnopadlgfhcancmjfl";

/**
 * Send confirmation email to waitlist signup
 */
export const sendWaitlistConfirmation = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service is not configured");
    }

    const resend = new Resend(apiKey);
    const displayName = args.name || "there";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to the JobFiltr Waitlist!</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <div style="background-color: #1e3a5f; padding: 32px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">You're on the List!</h1>
                <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Welcome to the JobFiltr waitlist</p>
              </div>

              <!-- Content -->
              <div style="padding: 32px;">
                <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  Hey ${displayName}!
                </p>

                <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  Thanks for joining the JobFiltr waitlist! We're excited to have you on board. You'll be among the first to know when the JobFiltr Chrome extension is ready for download.
                </p>

                <!-- What to Expect -->
                <div style="background-color: #1e3a5f; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 16px; font-weight: 600;">What to expect:</h3>
                  <ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.9); font-size: 14px; line-height: 1.8;">
                    <li>Updates on when we launch</li>
                    <li>News on potential promos</li>
                  </ul>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                  Best regards,<br>
                  <strong style="color: #374151;">The JobFiltr Team</strong>
                </p>
                <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                  This email was sent because you joined the JobFiltr waitlist.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Hey ${displayName}!

Thanks for joining the JobFiltr waitlist! We're excited to have you on board.

You'll be among the first to know when the JobFiltr Chrome extension is ready for download.

What to expect:
- Updates on when we launch
- News on potential promos

Best regards,
The JobFiltr Team
    `.trim();

    try {
      const { data, error } = await resend.emails.send({
        from: "JobFiltr (No Reply) <hello@jobfiltr.app>",
        to: args.email,
        subject: "You're on the JobFiltr Waitlist!",
        html: emailHtml,
        text: emailText,
      });

      if (error) {
        console.error("Failed to send waitlist confirmation:", error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log("Waitlist confirmation sent:", data?.id);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending waitlist confirmation:", error);
      throw error;
    }
  },
});

/**
 * Send admin notification email when someone joins the waitlist
 */
export const sendWaitlistAdminNotification = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    location: v.string(),
    totalCount: v.number(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service is not configured");
    }

    const resend = new Resend(apiKey);
    const displayName = args.name || "Not provided";
    const signupDate = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "full",
      timeStyle: "short",
    });

    const adminDashboardUrl = "https://jobfiltr.app/admin";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Waitlist Signup!</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">New Waitlist Signup!</h1>
                <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Someone just joined the JobFiltr waitlist</p>
              </div>

              <!-- Content -->
              <div style="padding: 32px;">
                <!-- Stats Banner -->
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
                  <p style="margin: 0 0 4px 0; color: rgba(255,255,255,0.8); font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Total Waitlist Signups</p>
                  <p style="margin: 0; color: #ffffff; font-size: 48px; font-weight: 700;">${args.totalCount}</p>
                </div>

                <!-- New Signup Details -->
                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 16px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">New Signup Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 12px; color: #6b7280; font-size: 14px; width: 100px;">Name:</td>
                      <td style="padding: 8px 12px; color: #374151; font-size: 14px; font-weight: 500;">${displayName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Email:</td>
                      <td style="padding: 8px 12px; color: #374151; font-size: 14px;">
                        <a href="mailto:${args.email}" style="color: #6366f1; text-decoration: none;">${args.email}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Location:</td>
                      <td style="padding: 8px 12px; color: #374151; font-size: 14px; font-weight: 500;">${args.location}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Source:</td>
                      <td style="padding: 8px 12px; color: #374151; font-size: 14px;">${args.source || "waitlist_page"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Signed Up:</td>
                      <td style="padding: 8px 12px; color: #374151; font-size: 14px;">${signupDate}</td>
                    </tr>
                  </table>
                </div>

                <!-- View Full List Button -->
                <div style="text-align: center;">
                  <a href="${adminDashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Full Waitlist in Admin Dashboard</a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated notification from JobFiltr.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
New Waitlist Signup!

Total Waitlist Signups: ${args.totalCount}

--- New Signup Details ---
Name: ${displayName}
Email: ${args.email}
Location: ${args.location}
Source: ${args.source || "waitlist_page"}
Signed Up: ${signupDate}

View the full waitlist at: ${adminDashboardUrl}

---
This is an automated notification from JobFiltr.
    `.trim();

    try {
      const { data, error } = await resend.emails.send({
        from: "JobFiltr <noreply@jobfiltr.app>",
        to: "support@jobfiltr.app",
        subject: `[Waitlist] New signup: ${args.email} (#${args.totalCount})`,
        html: emailHtml,
        text: emailText,
      });

      if (error) {
        console.error("Failed to send admin notification:", error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log("Admin notification sent:", data?.id);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending admin notification:", error);
      throw error;
    }
  },
});

/**
 * Send early access email to all eligible waitlist members
 * Sends to entries with "pending" or "confirmed" status
 */
export const sendEarlyAccessEmails = action({
  args: {},
  handler: async (ctx: ActionCtx): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    total?: number;
    message?: string;
    errors?: string[];
  }> => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service is not configured");
    }

    const resend = new Resend(apiKey);

    // Get all eligible entries
    const entries: Doc<"waitlist">[] = await ctx.runQuery(internal.waitlist.internalGetEligibleForEarlyAccess, {});

    if (entries.length === 0) {
      return { success: true, sent: 0, failed: 0, message: "No eligible entries to send to" };
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      const displayName = entry.name || "there";

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>JobFiltr Early Access is Here!</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">You're In! Early Access is Here</h1>
                  <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">JobFiltr Chrome Extension is ready for you</p>
                </div>

                <!-- Content -->
                <div style="padding: 32px;">
                  <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hey ${displayName}!
                  </p>

                  <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Thank you for being one of our earliest supporters! As promised, you're getting exclusive early access to the JobFiltr Chrome extension before everyone else.
                  </p>

                  <!-- Install Button -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${EXTENSION_URL}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px;">
                      Install JobFiltr Now
                    </a>
                  </div>

                  <!-- What's Included -->
                  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">What you get with early access:</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px; line-height: 1.8;">
                      <li>Filter out staffing agencies & recruiters</li>
                      <li>Ghost job detection & analysis</li>
                      <li>Community reported companies</li>
                      <li>Keyword filtering for job titles</li>
                      <li>Works on Indeed (LinkedIn coming soon)</li>
                    </ul>
                  </div>

                  <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    <strong>We'd love your feedback!</strong> As an early access user, your input helps shape JobFiltr. Reply to this email or reach out to us at <a href="mailto:support@jobfiltr.app" style="color: #10b981;">support@jobfiltr.app</a> with any thoughts, bugs, or feature requests.
                  </p>

                  <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Happy job hunting!
                  </p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                    Best regards,<br>
                    <strong style="color: #374151;">The JobFiltr Team</strong>
                  </p>
                  <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                    You're receiving this because you signed up for the JobFiltr waitlist.
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const emailText = `
Hey ${displayName}!

Thank you for being one of our earliest supporters! As promised, you're getting exclusive early access to the JobFiltr Chrome extension before everyone else.

Install JobFiltr Now: ${EXTENSION_URL}

What you get with early access:
- Filter out staffing agencies & recruiters
- Ghost job detection & analysis
- Community reported companies
- Keyword filtering for job titles
- Works on Indeed (LinkedIn coming soon)

We'd love your feedback! As an early access user, your input helps shape JobFiltr. Reply to this email or reach out to us at support@jobfiltr.app with any thoughts, bugs, or feature requests.

Happy job hunting!

Best regards,
The JobFiltr Team
      `.trim();

      try {
        const { error } = await resend.emails.send({
          from: "JobFiltr <hello@jobfiltr.app>",
          to: entry.email,
          subject: "You're In! JobFiltr Early Access is Here",
          html: emailHtml,
          text: emailText,
        });

        if (error) {
          console.error(`Failed to send to ${entry.email}:`, error);
          errors.push(`${entry.email}: ${error.message}`);
          failed++;
        } else {
          // Update status to "invited"
          await ctx.runMutation(internal.waitlist.internalUpdateWaitlistStatus, {
            id: entry._id,
            status: "invited",
          });
          sent++;
        }
      } catch (error) {
        console.error(`Error sending to ${entry.email}:`, error);
        errors.push(`${entry.email}: ${error instanceof Error ? error.message : "Unknown error"}`);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`Early access emails sent: ${sent} success, ${failed} failed`);
    return {
      success: true,
      sent,
      failed,
      total: entries.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
