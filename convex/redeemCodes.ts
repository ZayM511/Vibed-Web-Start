import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

function generateCode(): string {
  const seg = () =>
    Array.from({ length: 4 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join("");
  return `${seg()}-${seg()}-${seg()}-${seg()}`;
}

// ── Queries ──

export const getCodes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("redeemCodes").order("desc").collect();
  },
});

export const getCodeStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("redeemCodes").collect();
    return {
      total: all.length,
      available: all.filter((c) => c.status === "available").length,
      redeemed: all.filter((c) => c.status === "redeemed").length,
      revoked: all.filter((c) => c.status === "revoked").length,
    };
  },
});

// ── Mutations (Admin) ──

export const generateCodes = mutation({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const count = Math.min(Math.max(1, args.count), 10000);
    const existing = new Set(
      (await ctx.db.query("redeemCodes").collect()).map((c) => c.code)
    );
    let created = 0;
    let attempts = 0;
    while (created < count && attempts < count * 3) {
      const code = generateCode();
      if (!existing.has(code)) {
        existing.add(code);
        await ctx.db.insert("redeemCodes", {
          code,
          status: "available",
          createdAt: Date.now(),
        });
        created++;
      }
      attempts++;
    }
    return { created };
  },
});

export const revokeCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("redeemCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    if (record && record.status === "available") {
      await ctx.db.patch(record._id, { status: "revoked" });
    }
  },
});

export const restoreCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("redeemCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    if (record && record.status === "revoked") {
      await ctx.db.patch(record._id, { status: "available" });
    }
  },
});

export const deleteCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("redeemCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
    if (record) {
      await ctx.db.delete(record._id);
    }
  },
});

// ── Redemption (called by HTTP endpoint) ──

export const redeemCode = internalMutation({
  args: {
    code: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const code = args.code.toUpperCase().trim();

    // Find the code
    const record = await ctx.db
      .query("redeemCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!record) {
      return { success: false, error: "Invalid license code." };
    }
    if (record.status === "redeemed") {
      return { success: false, error: "This code has already been redeemed." };
    }
    if (record.status === "revoked") {
      return { success: false, error: "This code has been revoked." };
    }

    // Determine tier based on how many codes this email has redeemed
    const existingLicenses = await ctx.db
      .query("lifetimeLicenses")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    const tier = Math.min(existingLicenses.length + 1, 3);

    // Mark code as redeemed
    await ctx.db.patch(record._id, {
      status: "redeemed",
      redeemedBy: email,
      redeemedAt: Date.now(),
    });

    // Create lifetime license
    await ctx.db.insert("lifetimeLicenses", {
      email,
      code,
      tier,
      grantedAt: Date.now(),
    });

    return { success: true, tier, name: args.name, email };
  },
});
