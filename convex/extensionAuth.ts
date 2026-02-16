"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import crypto from "crypto";

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

/**
 * Sign up a new extension user
 */
export const signup = internalAction({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Check if email already exists
    const existing = await ctx.runQuery(internal.extensionAuthHelpers.getUserByEmail, { email });
    if (existing) {
      return { success: false, error: "An account with this email already exists" };
    }

    // Hash password
    const salt = generateSalt();
    const passwordHash = hashPassword(args.password, salt);

    // Generate session token (30-day expiry)
    const token = generateToken();
    const tokenExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;

    // Create user
    await ctx.runMutation(internal.extensionAuthHelpers.createUser, {
      email,
      passwordHash,
      salt,
      name: args.name?.trim(),
      token,
      tokenExpiry,
    });

    return {
      success: true,
      token,
      email,
      name: args.name?.trim() || "",
    };
  },
});

/**
 * Sign in an existing extension user
 */
export const signin = internalAction({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; token?: string; email?: string; name?: string }> => {
    const email = args.email.toLowerCase().trim();

    // Find user
    const user: any = await ctx.runQuery(internal.extensionAuthHelpers.getUserByEmail, { email });
    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    // Verify password
    const passwordHash = hashPassword(args.password, user.salt);
    if (passwordHash !== user.passwordHash) {
      return { success: false, error: "Invalid email or password" };
    }

    // Generate new session token
    const token = generateToken();
    const tokenExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;

    // Update token
    await ctx.runMutation(internal.extensionAuthHelpers.updateToken, {
      userId: user._id,
      token,
      tokenExpiry,
    });

    return {
      success: true,
      token,
      email: user.email,
      name: user.name || "",
    };
  },
});

/**
 * Handle Google OAuth sign-in for extension.
 * Creates or updates an extensionUser with a new session token.
 */
export const googleAuth = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Check if user already exists
    const existing: any = await ctx.runQuery(internal.extensionAuthHelpers.getUserByEmail, { email });

    const token = generateToken();
    const tokenExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;

    if (existing) {
      // Update token for existing user
      await ctx.runMutation(internal.extensionAuthHelpers.updateToken, {
        userId: existing._id,
        token,
        tokenExpiry,
      });

      return {
        success: true,
        token,
        email: existing.email,
        name: existing.name || args.name || "",
      };
    }

    // Create new user (Google users don't have passwords)
    const salt = generateSalt();
    const dummyHash = crypto.randomBytes(64).toString("hex");

    await ctx.runMutation(internal.extensionAuthHelpers.createUser, {
      email,
      passwordHash: dummyHash,
      salt,
      name: args.name?.trim(),
      token,
      tokenExpiry,
    });

    return {
      success: true,
      token,
      email,
      name: args.name?.trim() || "",
    };
  },
});
