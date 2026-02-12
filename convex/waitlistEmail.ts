"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "resend";

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
