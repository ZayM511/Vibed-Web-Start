"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Automated data collection for training the ML models
 * This script fetches job postings and scans them to populate trainingData
 */

// Sample scam job templates for testing
const SCAM_JOB_TEMPLATES = [
  {
    title: "Work From Home - Easy Money",
    company: "Quick Cash LLC",
    content: `
🔥 URGENT HIRING! 🔥

Make $5,000/week from home! No experience needed!

We are looking for motivated individuals who want to earn money FAST. This is a 100% remote position with unlimited earning potential!

Requirements:
- Must be 18+
- Have a computer and internet
- Ready to start IMMEDIATELY

What we offer:
✅ $5,000-$10,000 per week
✅ Work from anywhere
✅ Flexible hours
✅ No boss, no schedule

TO APPLY: Send $99 for the training materials and starter kit to quickcash@gmail.com

ACT NOW! Limited spots available. First 20 applicants get a BONUS!

Contact: quickcash@gmail.com or WhatsApp: +1-555-0199
    `,
  },
  {
    title: "Data Entry Specialist - Remote",
    company: "Global Data Solutions",
    content: `
HIGH PAYING DATA ENTRY POSITION

Earn up to $8,000/month working part-time from home!

We need people to enter data into our system. Very simple work, anyone can do it!

Requirements:
- Computer with internet
- 2-3 hours per day
- Reliable and trustworthy

Before you start, you need to:
1. Pay $150 registration fee
2. Complete background check ($50)
3. Purchase our software package ($200)

Total investment: $400 (one-time)

You will make this back in your first week! GUARANTEED!

Email globaldata2024@yahoo.com to get started NOW!
    `,
  },
  {
    title: "Personal Assistant to CEO",
    company: "International Trading Corp",
    content: `
Immediate Opening - Personal Assistant

I am looking for a personal assistant to help with various tasks. This is a REAL opportunity!

Pay: $5,500/month
Hours: Flexible, work from home

Duties:
- Receive packages at your home
- Forward packages to addresses I provide
- Deposit checks and transfer funds
- Purchase items online with company card

You will receive a signing bonus of $2,000 after your first week!

Please provide:
- Full name
- Home address
- Social Security Number
- Bank account details
- Copy of driver's license

Email: ceo.assistant2024@gmail.com

URGENT - Need to fill this position THIS WEEK!
    `,
  },
];

const LEGITIMATE_JOB_TEMPLATES = [
  {
    title: "Senior Software Engineer",
    company: "TechCorp Inc.",
    content: `
TechCorp Inc. is seeking a Senior Software Engineer to join our growing team in San Francisco, CA.

About Us:
TechCorp is a leading software company with 500+ employees, specializing in enterprise solutions. We've been in business since 2010 and serve Fortune 500 clients worldwide.

Position: Senior Software Engineer
Location: San Francisco, CA (Hybrid - 3 days in office)
Salary: $140,000 - $180,000/year + equity + benefits

Responsibilities:
- Design and develop scalable backend services
- Collaborate with cross-functional teams
- Mentor junior engineers
- Participate in code reviews and architectural decisions

Requirements:
- 5+ years of software engineering experience
- Proficiency in Python, Go, or Java
- Experience with AWS or GCP
- Strong understanding of distributed systems
- Bachelor's degree in Computer Science or related field

Benefits:
- Health, dental, and vision insurance
- 401(k) matching
- Unlimited PTO
- Professional development budget
- Stock options

To Apply:
Please submit your resume and cover letter through our careers portal at www.techcorp.com/careers

TechCorp is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees.
    `,
  },
  {
    title: "Marketing Manager",
    company: "GreenLeaf Marketing",
    content: `
GreenLeaf Marketing is hiring a Marketing Manager for our Seattle office.

Company Overview:
GreenLeaf is a boutique marketing agency serving eco-friendly brands. Founded in 2015, we have a team of 25 marketing professionals.

Position Details:
- Title: Marketing Manager
- Location: Seattle, WA (On-site)
- Compensation: $75,000 - $95,000/year
- Reports to: Director of Marketing

Key Responsibilities:
- Develop and execute marketing strategies for clients
- Manage a team of 3-5 marketing coordinators
- Oversee social media campaigns and content creation
- Track campaign performance and provide analytics
- Client relationship management

Qualifications:
- 3-5 years of marketing experience
- Proven track record in digital marketing
- Experience with SEO, SEM, and social media advertising
- Strong project management skills
- Excellent written and verbal communication

What We Offer:
- Competitive salary
- Health and dental insurance
- 15 days PTO + 10 holidays
- Professional development opportunities
- Collaborative work environment

Application Process:
Send your resume, portfolio, and a brief cover letter to careers@greenleafmarketing.com

Website: www.greenleafmarketing.com
    `,
  },
];

/**
 * Generate sample job postings for testing the labeling interface
 */
export const generateSampleJobs = action({
  args: {
    count: v.optional(v.number()),
    includeScams: v.optional(v.boolean()),
    includeLegit: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to generate sample jobs");
    }

    const count = args.count || 10;
    const includeScams = args.includeScams !== false; // default true
    const includeLegit = args.includeLegit !== false; // default true

    const results = [];

    for (let i = 0; i < count; i++) {
      const isScam = Math.random() < 0.5;

      let jobTemplate;
      if (isScam && includeScams) {
        jobTemplate =
          SCAM_JOB_TEMPLATES[
            Math.floor(Math.random() * SCAM_JOB_TEMPLATES.length)
          ];
      } else if (!isScam && includeLegit) {
        jobTemplate =
          LEGITIMATE_JOB_TEMPLATES[
            Math.floor(Math.random() * LEGITIMATE_JOB_TEMPLATES.length)
          ];
      } else {
        continue;
      }

      // Add some variation to make each job unique
      const variation = Math.floor(Math.random() * 1000);
      const jobContent = `${jobTemplate.content}\n\nJob ID: ${variation}`;

      try {
        // Scan the job using the ML pipeline
        const result: any = await ctx.runAction(api.mlPipeline.scanJobWithML, {
          jobContent,
          jobUrl: `https://example.com/job/${variation}`,
          userId: identity.tokenIdentifier,
          context: `Sample ${isScam ? "scam" : "legitimate"} job for training`,
        });

        results.push({
          jobTitle: jobTemplate.title,
          company: jobTemplate.company,
          isScam,
          confidence: result.report?.confidenceScore,
          created: true,
        });

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to scan job ${i}:`, error);
        results.push({
          jobTitle: jobTemplate.title,
          error: String(error),
          created: false,
        });
      }
    }

    return {
      success: true,
      generated: results.length,
      results,
      message: `Generated ${results.length} sample jobs for labeling`,
    };
  },
});

/**
 * Batch import job postings from an array
 * Useful for importing scraped data or external datasets
 */
export const batchImportJobs = action({
  args: {
    jobs: v.array(
      v.object({
        title: v.string(),
        company: v.string(),
        content: v.string(),
        url: v.optional(v.string()),
        knownScam: v.optional(v.boolean()), // if we already know it's a scam
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to import jobs");
    }

    const results = [];

    for (const job of args.jobs) {
      try {
        // Scan the job
        const scanResult: any = await ctx.runAction(api.mlPipeline.scanJobWithML, {
          jobContent: job.content,
          jobUrl: job.url,
          userId: identity.tokenIdentifier,
        });

        // If we know it's a scam, mark it as labeled
        if (job.knownScam !== undefined) {
          // TODO: Add internal mutation to pre-label known scams
          // This would call internal.trainingData.addTrainingExampleInternal
          // with isLabeled: true, trueScam: job.knownScam
        }

        results.push({
          title: job.title,
          success: true,
          confidence: scanResult.report?.confidenceScore,
        });
      } catch (error) {
        results.push({
          title: job.title,
          success: false,
          error: String(error),
        });
      }
    }

    return {
      total: args.jobs.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

/**
 * Clear all unlabeled training data
 * Useful for testing or resetting the dataset
 */
export const clearUnlabeledData = internalAction({
  args: {},
  handler: async (ctx) => {
    // This would need to be implemented with proper pagination
    // For now, just return a placeholder
    return {
      message: "This function needs to be implemented with proper query and delete logic",
    };
  },
});
