/**
 * Chrome Extension API Functions
 * These functions are called from the extension's HTTP endpoints
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Analyze a job posting for scams and ghost jobs
 * Called from the /scan-job HTTP endpoint
 */
export const analyzeJob = query({
  args: {
    url: v.string(),
    title: v.string(),
    company: v.string(),
    description: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    // Create a simple analysis based on the job data
    // You can enhance this with your AI/ML models

    const redFlags: string[] = [];
    let legitimacyScore = 100;

    // Check for vague job descriptions
    if (args.description.length < 200) {
      redFlags.push("Job description is unusually short");
      legitimacyScore -= 15;
    }

    // Check for missing company info
    if (!args.company || args.company.trim() === "") {
      redFlags.push("Company name not specified");
      legitimacyScore -= 20;
    }

    // Check for common scam indicators
    const scamKeywords = [
      "quick cash",
      "work from home easy",
      "no experience needed make $",
      "guaranteed income",
      "pay upfront",
      "send money",
    ];

    const descLower = args.description.toLowerCase();
    scamKeywords.forEach((keyword) => {
      if (descLower.includes(keyword)) {
        redFlags.push(`Contains suspicious phrase: "${keyword}"`);
        legitimacyScore -= 25;
      }
    });

    // Check for entry-level mismatch
    if (descLower.includes("entry level") || descLower.includes("entry-level")) {
      const experienceMatch = args.description.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
      if (experienceMatch) {
        const years = parseInt(experienceMatch[1]);
        if (years >= 3) {
          redFlags.push(`Labeled "Entry Level" but requires ${years}+ years of experience`);
          legitimacyScore -= 10;
        }
      }
    }

    // Check for missing salary information
    if (!descLower.includes("$") && !descLower.includes("salary")) {
      redFlags.push("No salary information provided");
      legitimacyScore -= 5;
    }

    // Ensure score is between 0 and 100
    legitimacyScore = Math.max(0, Math.min(100, legitimacyScore));

    // Determine if it's a scam or ghost job
    const isScam = legitimacyScore < 40;
    const isGhostJob = legitimacyScore < 70 && redFlags.length > 2;

    return {
      legitimacyScore,
      redFlags,
      isScam,
      isGhostJob,
      confidence: legitimacyScore / 100,
    };
  },
});

/**
 * Update user's filter settings
 * Called from the /sync-settings HTTP endpoint
 */
export const updateFilterSettings = mutation({
  args: {
    userId: v.string(),
    filterSettings: v.any(),
  },
  handler: async (ctx, args) => {
    // Check if user settings already exist
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        filterSettings: args.filterSettings,
        updatedAt: Date.now(),
      });
    } else {
      // Create new settings
      await ctx.db.insert("userSettings", {
        userId: args.userId,
        filterSettings: args.filterSettings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Get user's filter settings
 */
export const getFilterSettings = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return settings?.filterSettings || null;
  },
});
