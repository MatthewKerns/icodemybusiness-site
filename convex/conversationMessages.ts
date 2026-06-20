import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";

export const storeMessages = internalMutation({
  args: {
    retellCallId: v.string(),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_retellCallId", (q) => q.eq("retellCallId", args.retellCallId))
      .first();

    if (!conversation) {
      // Conversation not found — skip storing messages
      console.warn(`storeMessages: no conversation found for retellCallId=${args.retellCallId}`);
      return;
    }

    for (const msg of args.messages) {
      await ctx.db.insert("conversationMessages", {
        conversationId: conversation._id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      });
    }
  },
});

export const getMessagesByConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    return await ctx.db
      .query("conversationMessages")
      .withIndex("by_conversationId_timestamp", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .take(500);
  },
});
