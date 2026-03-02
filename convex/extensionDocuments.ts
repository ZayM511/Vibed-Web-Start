import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createDocument = internalMutation({
  args: {
    userId: v.string(),
    storageId: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    fileFormat: v.string(),
    fileType: v.union(
      v.literal("resume"),
      v.literal("cover_letter"),
      v.literal("portfolio")
    ),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get the current max order for this file type
    const existingDocs = await ctx.db
      .query("documents")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("fileType", args.fileType)
      )
      .collect();

    const maxOrder = existingDocs.reduce(
      (max, doc) => Math.max(max, doc.order || 0),
      0
    );

    return await ctx.db.insert("documents", {
      userId: args.userId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileFormat: args.fileFormat,
      fileType: args.fileType,
      storageId: args.storageId,
      uploadedAt: args.createdAt || Date.now(),
      order: maxOrder + 1,
    });
  },
});

export const getUserDocuments = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const deleteDocument = internalMutation({
  args: {
    userId: v.string(),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");
    if (document.userId !== args.userId) throw new Error("Unauthorized");

    // Delete from storage
    try {
      await ctx.storage.delete(document.storageId as any);
    } catch {
      // Storage blob may already be deleted — continue
    }

    // Delete record
    await ctx.db.delete(args.documentId);
    return args.documentId;
  },
});

export const getDocumentUrl = internalQuery({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
