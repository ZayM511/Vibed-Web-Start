"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "resend";

// Email recipients for contact form submissions
const NOTIFICATION_EMAILS = [
  "support@jobfiltr.app",
  "hello@jobfiltr.app",
  "isaiah.e.malone@gmail.com",
];

/**
 * Send email notification for new feedback/contact form submission
 */
/**
 * Send confirmation email to user after form submission
 */
export const sendUserConfirmation = action({
  args: {
    type: v.string(),
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    reportCategories: v.optional(
      v.object({
        scamJob: v.boolean(),
        spamJob: v.boolean(),
        ghostJob: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service is not configured");
    }

    const resend = new Resend(apiKey);

    // Format the feedback type for display
    const typeLabels: Record<string, string> = {
      feedback: "General Feedback",
      improvement: "Improvement Idea",
      report: "Company Report",
      bug: "Bug Report",
      other: "Other",
    };

    const feedbackTypeLabel = typeLabels[args.type] || args.type;

    // Build report categories section if applicable
    let reportCategoriesHtml = "";
    let reportCategoriesText = "";
    if (args.type === "report" && args.reportCategories) {
      const categories = [];
      if (args.reportCategories.scamJob) categories.push("Scam Job");
      if (args.reportCategories.spamJob) categories.push("Spam Job");
      if (args.reportCategories.ghostJob) categories.push("Ghost Job");

      if (categories.length > 0) {
        reportCategoriesHtml = `
          <tr>
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Report Type:</td>
            <td style="padding: 8px 12px; color: #374151; font-size: 14px;">${categories.join(", ")}</td>
          </tr>
        `;
        reportCategoriesText = `Report Type: ${categories.join(", ")}\n`;
      }
    }

    // Email HTML template for user confirmation
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>We've Received Your Message</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <div style="background-color: #1e3a5f; padding: 32px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Thank You, ${args.name}!</h1>
                <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">We've received your message</p>
              </div>

              <!-- Content -->
              <div style="padding: 32px;">
                <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  Thanks for reaching out! We appreciate you taking the time to contact us. Our team will review your message and get back to you as soon as possible.
                </p>

                <!-- Submission Summary -->
                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 16px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Your Submission</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 12px; color: #6b7280; font-size: 14px; width: 100px;">Type:</td>
                      <td style="padding: 8px 12px; color: #374151; font-size: 14px;">${feedbackTypeLabel}</td>
                    </tr>
                    ${reportCategoriesHtml}
                    <tr>
                      <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Subject:</td>
                      <td style="padding: 8px 12px; color: #374151; font-size: 14px;">${args.subject}</td>
                    </tr>
                  </table>
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Your Message:</p>
                    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${args.message}</p>
                  </div>
                </div>

                <!-- What's Next -->
                <div style="background-color: #1e3a5f; border-radius: 8px; padding: 20px;">
                  <h3 style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: 600;">What happens next?</h3>
                  <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; line-height: 1.5;">
                    Our team will review your message and get back to you as soon as possible.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                  Best regards,<br>
                  <strong style="color: #374151;">The JobFiltr Team</strong>
                </p>
                <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                  This is an automated confirmation.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Plain text version
    const emailText = `
Thank You, ${args.name}!

We've received your message and appreciate you taking the time to contact us. Our team will review your message and get back to you as soon as possible.

--- Your Submission ---
Type: ${feedbackTypeLabel}
${reportCategoriesText}Subject: ${args.subject}

Your Message:
${args.message}

--- What happens next? ---
Our team will review your message and get back to you as soon as possible.

Best regards,
The JobFiltr Team

---
This is an automated confirmation.
    `.trim();

    try {
      const { data, error } = await resend.emails.send({
        from: "JobFiltr (No Reply) <hello@jobfiltr.app>",
        to: args.email,
        subject: `Thanks for contacting JobFiltr - ${args.subject}`,
        html: emailHtml,
        text: emailText,
      });

      if (error) {
        console.error("Failed to send user confirmation email:", error);
        throw new Error(`Failed to send confirmation email: ${error.message}`);
      }

      console.log("User confirmation email sent successfully:", data?.id);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending user confirmation email:", error);
      throw error;
    }
  },
});

/**
 * Send email notification for new feedback/contact form submission
 */
export const sendFeedbackNotification = action({
  args: {
    type: v.string(),
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    reportCategories: v.optional(
      v.object({
        scamJob: v.boolean(),
        spamJob: v.boolean(),
        ghostJob: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service is not configured");
    }

    const resend = new Resend(apiKey);

    // Format the feedback type for display
    const typeLabels: Record<string, string> = {
      feedback: "General Feedback",
      improvement: "Improvement Idea",
      report: "Company Report",
      bug: "Bug Report",
      other: "Other",
    };

    const feedbackTypeLabel = typeLabels[args.type] || args.type;

    // Build report categories section if applicable
    let reportCategoriesHtml = "";
    if (args.type === "report" && args.reportCategories) {
      const categories = [];
      if (args.reportCategories.scamJob) categories.push("Scam Job");
      if (args.reportCategories.spamJob) categories.push("Spam Job");
      if (args.reportCategories.ghostJob) categories.push("Ghost Job");

      if (categories.length > 0) {
        reportCategoriesHtml = `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 140px;">Report Types:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">${categories.join(", ")}</td>
          </tr>
        `;
      }
    }

    // Email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">New Contact Form Submission</h1>
                <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">${feedbackTypeLabel}</p>
              </div>

              <!-- Content -->
              <div style="padding: 32px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 140px;">From:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">${args.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Email:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                      <a href="mailto:${args.email}" style="color: #6366f1; text-decoration: none;">${args.email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Type:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">${feedbackTypeLabel}</td>
                  </tr>
                  ${reportCategoriesHtml}
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Subject:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">${args.subject}</td>
                  </tr>
                </table>

                <!-- Message -->
                <div style="margin-top: 24px;">
                  <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Message</h3>
                  <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${args.message}</div>
                </div>

                <!-- Reply Button -->
                <div style="margin-top: 32px; text-align: center;">
                  <a href="mailto:${args.email}?subject=Re: ${encodeURIComponent(args.subject)}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">Reply to ${args.name}</a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">This email was sent from the JobFiltr contact form.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Plain text version
    const emailText = `
New Contact Form Submission - ${feedbackTypeLabel}

From: ${args.name}
Email: ${args.email}
Type: ${feedbackTypeLabel}
${args.type === "report" && args.reportCategories ? `Report Types: ${[args.reportCategories.scamJob && "Scam Job", args.reportCategories.spamJob && "Spam Job", args.reportCategories.ghostJob && "Ghost Job"].filter(Boolean).join(", ")}` : ""}
Subject: ${args.subject}

Message:
${args.message}

---
Reply to this email or contact ${args.email} directly.
    `.trim();

    try {
      // Send email to all recipients
      const { data, error } = await resend.emails.send({
        from: "JobFiltr <noreply@jobfiltr.app>",
        to: NOTIFICATION_EMAILS,
        replyTo: args.email,
        subject: `[JobFiltr ${feedbackTypeLabel}] ${args.subject}`,
        html: emailHtml,
        text: emailText,
      });

      if (error) {
        console.error("Failed to send email:", error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log("Email sent successfully:", data?.id);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  },
});
