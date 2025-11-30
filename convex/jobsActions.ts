"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import * as cheerio from "cheerio";

// Action to scan a job listing using AI
export const scanJobListing = action({
  args: {
    jobUrl: v.optional(v.string()),
    jobContent: v.string(),
    userId: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    report: any;
    jobInput: string;
    jobUrl: string | undefined;
  }> => {
    try {
      // Extract job details from content using cheerio
      const $ = cheerio.load(args.jobContent);

      // Try to extract job title and company from common HTML patterns
      let jobTitle = $("h1").first().text().trim() ||
                     $('[class*="job-title"]').first().text().trim() ||
                     $('[class*="title"]').first().text().trim() ||
                     "Job Title Not Found";

      let company = $('[class*="company"]').first().text().trim() ||
                    $('[class*="employer"]').first().text().trim() ||
                    "Company Not Found";

      // Clean up extracted text
      const cleanText = $.text().replace(/\s+/g, " ").trim();

      // If extraction failed from HTML, try to parse from plain text
      if (jobTitle === "Job Title Not Found" || company === "Company Not Found") {
        const lines = args.jobContent.split("\n").filter(line => line.trim());
        if (lines.length > 0 && jobTitle === "Job Title Not Found") {
          jobTitle = lines[0].trim();
        }
        if (lines.length > 1 && company === "Company Not Found") {
          company = lines[1].trim();
        }
      }

      // Call internal AI action for analysis
      const analysis: any = await ctx.runAction(internal.ai.analyzeJob, {
        jobTitle,
        company,
        jobContent: cleanText || args.jobContent,
        jobUrl: args.jobUrl,
      });

      // Return the scan result without persisting
      return {
        report: analysis,
        jobInput: args.jobContent,
        jobUrl: args.jobUrl,
      };
    } catch (error) {
      console.error("Job scan error:", error);
      throw new Error(`Failed to scan job listing: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});
