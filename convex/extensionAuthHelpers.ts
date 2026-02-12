import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("extensionUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const createUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    name: v.optional(v.string()),
    token: v.string(),
    tokenExpiry: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("extensionUsers", {
      email: args.email,
      passwordHash: args.passwordHash,
      salt: args.salt,
      name: args.name,
      token: args.token,
      tokenExpiry: args.tokenExpiry,
      createdAt: Date.now(),
    });
  },
});

export const updateToken = internalMutation({
  args: {
    userId: v.id("extensionUsers"),
    token: v.string(),
    tokenExpiry: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      token: args.token,
      tokenExpiry: args.tokenExpiry,
    });
  },
});
