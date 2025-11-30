import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get or create user profile
 */
export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const existingProfile = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.tokenIdentifier))
      .first();

    return existingProfile;
  },
});

/**
 * Create or update user profile
 */
export const upsertUserProfile = mutation({
  args: {
    location: v.optional(v.string()),
    hideLocationFromReviews: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: You must be logged in");
    }

    const existingProfile = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.tokenIdentifier))
      .first();

    const now = Date.now();

    if (existingProfile) {
      // Update existing profile
      const updateData: any = {
        updatedAt: now,
      };

      if (args.location !== undefined) {
        updateData.location = args.location;
      }

      if (args.hideLocationFromReviews !== undefined) {
        updateData.hideLocationFromReviews = args.hideLocationFromReviews;
      }

      // Mark profile as completed if location is provided
      if (args.location && !existingProfile.profileCompletedAt) {
        updateData.profileCompletedAt = now;
      }

      await ctx.db.patch(existingProfile._id, updateData);

      return existingProfile._id;
    } else {
      // Create new profile
      const profileId = await ctx.db.insert("users", {
        clerkUserId: identity.tokenIdentifier,
        location: args.location,
        hideLocationFromReviews: args.hideLocationFromReviews ?? false,
        profileCompletedAt: args.location ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });

      return profileId;
    }
  },
});

/**
 * Check if user profile is complete
 */
export const isProfileComplete = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const profile = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.tokenIdentifier))
      .first();

    // Profile is complete if location is provided
    return profile?.location ? true : false;
  },
});

/**
 * Get user profile by clerk user ID (for displaying in reviews)
 */
export const getUserProfileByClerkId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    return profile;
  },
});
