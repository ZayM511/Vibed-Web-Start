import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserDocuments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .collect();
  },
});

export const getDocumentsByType = query({
  args: {
    fileType: v.union(
      v.literal("resume"),
      v.literal("cover_letter"),
      v.literal("portfolio")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("fileType", args.fileType)
      )
      .collect();

    // Sort by order field
    return docs.sort((a, b) => a.order - b.order);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

export const createDocument = mutation({
  args: {
    storageId: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    fileFormat: v.string(),
    fileType: v.union(
      v.literal("resume"),
      v.literal("cover_letter"),
      v.literal("portfolio")
    ),
    notes: v.optional(v.string()),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get the current max order for this file type
    const existingDocs = await ctx.db
      .query("documents")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", identity.tokenIdentifier).eq("fileType", args.fileType)
      )
      .collect();

    const maxOrder = existingDocs.reduce((max, doc) => Math.max(max, doc.order || 0), 0);

    return await ctx.db.insert("documents", {
      userId: identity.tokenIdentifier,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileFormat: args.fileFormat,
      fileType: args.fileType,
      storageId: args.storageId,
      uploadedAt: Date.now(),
      order: maxOrder + 1,
      notes: args.notes,
      version: args.version,
    });
  },
});

export const updateDocument = mutation({
  args: {
    documentId: v.id("documents"),
    fileName: v.optional(v.string()),
    notes: v.optional(v.string()),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");
    if (document.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.documentId, {
      fileName: args.fileName,
      notes: args.notes,
      version: args.version,
    });

    return args.documentId;
  },
});

export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");
    if (document.userId !== identity.tokenIdentifier) {
      throw new Error("Unauthorized");
    }

    // Delete from storage
    await ctx.storage.delete(document.storageId);

    // Delete record
    await ctx.db.delete(args.documentId);

    return args.documentId;
  },
});

export const getDocumentUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const reorderDocuments = mutation({
  args: {
    documentIds: v.array(v.id("documents")),
    fileType: v.union(
      v.literal("resume"),
      v.literal("cover_letter"),
      v.literal("portfolio")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Update order for each document
    for (let i = 0; i < args.documentIds.length; i++) {
      const documentId = args.documentIds[i];
      const document = await ctx.db.get(documentId);

      if (!document) continue;
      if (document.userId !== identity.tokenIdentifier) {
        throw new Error("Unauthorized");
      }
      if (document.fileType !== args.fileType) {
        throw new Error("Document type mismatch");
      }

      await ctx.db.patch(documentId, {
        order: i,
      });
    }

    return args.documentIds;
  },
});
