import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal query to check feature cache
export const getCachedFeatures = internalQuery({
  args: { contentHash: v.string() },
  handler: async (ctx, args) => {
    const cache = await ctx.db
      .query("featureCache")
      .withIndex("by_hash", (q) => q.eq("jobContentHash", args.contentHash))
      .first();

    if (cache && cache.expiresAt > Date.now()) {
      return cache.features;
    }
    return null;
  },
});

// Internal mutation to save features to cache
export const cacheFeatures = internalMutation({
  args: {
    contentHash: v.string(),
    features: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("featureCache", {
      jobContentHash: args.contentHash,
      features: args.features,
      computedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  },
});
