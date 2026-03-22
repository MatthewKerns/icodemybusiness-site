import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Board configurations
const BOARD_CONFIGS = {
  leads: {
    columns: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
    defaultColumn: "new",
  },
  projects: {
    columns: ["backlog", "planning", "in_progress", "review", "completed"],
    defaultColumn: "backlog",
  },
  tasks: {
    columns: ["todo", "in_progress", "blocked", "review", "done"],
    defaultColumn: "todo",
  },
  content: {
    columns: ["ideas", "drafting", "review", "approved", "published"],
    defaultColumn: "ideas",
  },
};

// Create a new board card
export const createCard = mutation({
  args: {
    boardId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    column: v.optional(v.string()),
    color: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    assignedTo: v.optional(v.array(v.string())),
    dueDate: v.optional(v.number()),
    linkedEntityId: v.optional(v.string()),
    linkedEntityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const boardConfig = BOARD_CONFIGS[args.boardId as keyof typeof BOARD_CONFIGS];
    if (!boardConfig) throw new Error("Invalid board ID");

    const column = args.column || boardConfig.defaultColumn;
    if (!boardConfig.columns.includes(column)) {
      throw new Error(`Invalid column for board ${args.boardId}`);
    }

    // Get the highest position in the column
    const cardsInColumn = await ctx.db
      .query("boardCards")
      .withIndex("by_board_column", (q) =>
        q.eq("boardId", args.boardId).eq("column", column)
      )
      .collect();

    const maxPosition = cardsInColumn.reduce((max, card) =>
      Math.max(max, card.position), 0
    );

    const now = Date.now();

    const cardId = await ctx.db.insert("boardCards", {
      boardId: args.boardId,
      column,
      title: args.title,
      description: args.description,
      position: maxPosition + 1,
      color: args.color,
      tags: args.tags,
      assignedTo: args.assignedTo,
      dueDate: args.dueDate,
      linkedEntityId: args.linkedEntityId,
      linkedEntityType: args.linkedEntityType,
      createdAt: now,
      updatedAt: now,
    });

    // Notify assigned users
    if (args.assignedTo && args.assignedTo.length > 0) {
      for (const userId of args.assignedTo) {
        await ctx.db.insert("notifications", {
          userId,
          type: "info",
          category: "board",
          title: "New Card Assignment",
          message: `You've been assigned to: ${args.title}`,
          isRead: false,
          actionUrl: `/dashboard/boards/${args.boardId}`,
          actionLabel: "View Board",
          entityType: "boardCard",
          entityId: cardId,
          createdAt: now,
        });
      }
    }

    return cardId;
  },
});

// Get all cards for a board
export const getBoardCards = query({
  args: {
    boardId: v.string(),
  },
  handler: async (ctx, args) => {
    const boardConfig = BOARD_CONFIGS[args.boardId as keyof typeof BOARD_CONFIGS];
    if (!boardConfig) return { columns: [], cards: [] };

    const cards = await ctx.db
      .query("boardCards")
      .withIndex("by_board_column", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Organize cards by column
    const cardsByColumn = boardConfig.columns.reduce((acc, column) => {
      acc[column] = cards
        .filter(card => card.column === column)
        .sort((a, b) => a.position - b.position);
      return acc;
    }, {} as Record<string, typeof cards>);

    return {
      columns: boardConfig.columns,
      cardsByColumn,
      totalCards: cards.length,
    };
  },
});

// Move card to different column or position
export const moveCard = mutation({
  args: {
    cardId: v.id("boardCards"),
    newColumn: v.string(),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const boardConfig = BOARD_CONFIGS[card.boardId as keyof typeof BOARD_CONFIGS];
    if (!boardConfig || !boardConfig.columns.includes(args.newColumn)) {
      throw new Error("Invalid column");
    }

    const oldColumn = card.column;
    const oldPosition = card.position;
    const now = Date.now();

    // If moving within the same column
    if (oldColumn === args.newColumn) {
      // Get all cards in the column
      const cardsInColumn = await ctx.db
        .query("boardCards")
        .withIndex("by_board_column", (q) =>
          q.eq("boardId", card.boardId).eq("column", oldColumn)
        )
        .collect();

      // Reorder positions
      for (const c of cardsInColumn) {
        if (c._id === args.cardId) continue;

        let newPos = c.position;
        if (oldPosition < args.newPosition) {
          // Moving down
          if (c.position > oldPosition && c.position <= args.newPosition) {
            newPos = c.position - 1;
          }
        } else {
          // Moving up
          if (c.position < oldPosition && c.position >= args.newPosition) {
            newPos = c.position + 1;
          }
        }

        if (newPos !== c.position) {
          await ctx.db.patch(c._id, { position: newPos, updatedAt: now });
        }
      }
    } else {
      // Moving to different column
      // Update positions in old column
      const cardsInOldColumn = await ctx.db
        .query("boardCards")
        .withIndex("by_board_column", (q) =>
          q.eq("boardId", card.boardId).eq("column", oldColumn)
        )
        .filter((q) => q.gt(q.field("position"), oldPosition))
        .collect();

      for (const c of cardsInOldColumn) {
        await ctx.db.patch(c._id, { position: c.position - 1, updatedAt: now });
      }

      // Update positions in new column
      const cardsInNewColumn = await ctx.db
        .query("boardCards")
        .withIndex("by_board_column", (q) =>
          q.eq("boardId", card.boardId).eq("column", args.newColumn)
        )
        .filter((q) => q.gte(q.field("position"), args.newPosition))
        .collect();

      for (const c of cardsInNewColumn) {
        await ctx.db.patch(c._id, { position: c.position + 1, updatedAt: now });
      }
    }

    // Update the card itself
    await ctx.db.patch(args.cardId, {
      column: args.newColumn,
      position: args.newPosition,
      updatedAt: now,
    });

    // Log the movement
    await ctx.db.insert("activityLogs", {
      action: "moved",
      entityType: "boardCard",
      entityId: args.cardId,
      entityName: card.title,
      changes: {
        column: { from: oldColumn, to: args.newColumn },
        position: { from: oldPosition, to: args.newPosition },
      },
      timestamp: now,
    });

    // If this is a lead board and moved to "won", create a client
    if (card.boardId === "leads" && args.newColumn === "won" && card.linkedEntityId) {
      const lead = await ctx.db.get(card.linkedEntityId as Id<"leads">);
      if (lead) {
        await ctx.db.patch(card.linkedEntityId as Id<"leads">, {
          status: "won",
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Update card details
export const updateCard = mutation({
  args: {
    cardId: v.id("boardCards"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    assignedTo: v.optional(v.array(v.string())),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { cardId, ...updates } = args;
    const now = Date.now();

    const card = await ctx.db.get(cardId);
    if (!card) throw new Error("Card not found");

    await ctx.db.patch(cardId, {
      ...updates,
      updatedAt: now,
    });

    // If assignees changed, notify new assignees
    if (updates.assignedTo) {
      const oldAssignees = card.assignedTo || [];
      const newAssignees = updates.assignedTo.filter(
        userId => !oldAssignees.includes(userId)
      );

      for (const userId of newAssignees) {
        await ctx.db.insert("notifications", {
          userId,
          type: "info",
          category: "board",
          title: "New Card Assignment",
          message: `You've been assigned to: ${card.title}`,
          isRead: false,
          actionUrl: `/dashboard/boards/${card.boardId}`,
          actionLabel: "View Board",
          entityType: "boardCard",
          entityId: cardId,
          createdAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Delete a card
export const deleteCard = mutation({
  args: {
    cardId: v.id("boardCards"),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const now = Date.now();

    // Update positions of cards after this one
    const cardsAfter = await ctx.db
      .query("boardCards")
      .withIndex("by_board_column", (q) =>
        q.eq("boardId", card.boardId).eq("column", card.column)
      )
      .filter((q) => q.gt(q.field("position"), card.position))
      .collect();

    for (const c of cardsAfter) {
      await ctx.db.patch(c._id, { position: c.position - 1, updatedAt: now });
    }

    // Log deletion
    await ctx.db.insert("activityLogs", {
      action: "deleted",
      entityType: "boardCard",
      entityId: args.cardId,
      entityName: card.title,
      timestamp: now,
    });

    // Delete the card
    await ctx.db.delete(args.cardId);

    return { success: true };
  },
});

// Add attachment to card
export const addAttachment = mutation({
  args: {
    cardId: v.id("boardCards"),
    name: v.string(),
    url: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) throw new Error("Card not found");

    const attachments = card.attachments || [];
    attachments.push({
      name: args.name,
      url: args.url,
      type: args.type,
    });

    await ctx.db.patch(args.cardId, {
      attachments,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get board statistics
export const getBoardStats = query({
  args: {
    boardId: v.string(),
  },
  handler: async (ctx, args) => {
    const boardConfig = BOARD_CONFIGS[args.boardId as keyof typeof BOARD_CONFIGS];
    if (!boardConfig) return null;

    const cards = await ctx.db
      .query("boardCards")
      .withIndex("by_board_column", (q) => q.eq("boardId", args.boardId))
      .collect();

    const stats = {
      totalCards: cards.length,
      byColumn: {} as Record<string, number>,
      overdue: 0,
      unassigned: 0,
      highPriority: 0,
    };

    const now = Date.now();

    for (const card of cards) {
      // Count by column
      stats.byColumn[card.column] = (stats.byColumn[card.column] || 0) + 1;

      // Count overdue
      if (card.dueDate && card.dueDate < now) {
        stats.overdue++;
      }

      // Count unassigned
      if (!card.assignedTo || card.assignedTo.length === 0) {
        stats.unassigned++;
      }

      // Count high priority (based on tags)
      if (card.tags && card.tags.includes("high-priority")) {
        stats.highPriority++;
      }
    }

    // Calculate completion rate for boards with "done" or "completed" columns
    const completionColumn = boardConfig.columns.find(c =>
      c === "done" || c === "completed" || c === "won" || c === "published"
    );

    const completionRate = completionColumn && cards.length > 0
      ? (stats.byColumn[completionColumn] || 0) / cards.length * 100
      : 0;

    return {
      ...stats,
      completionRate: Math.round(completionRate),
      columns: boardConfig.columns,
    };
  },
});

// Create card from entity (lead, project, etc.)
export const createCardFromEntity = mutation({
  args: {
    boardId: v.string(),
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let title = "";
    let description = "";
    let column = "";
    let tags: string[] = [];

    // Get entity details based on type
    if (args.entityType === "lead") {
      const lead = await ctx.db.get(args.entityId as Id<"leads">);
      if (!lead) throw new Error("Lead not found");

      title = lead.name;
      description = `${lead.company || "No company"} - ${lead.email || "No email"}`;
      column = lead.status;
      tags = lead.tags || [];
    } else if (args.entityType === "project") {
      const project = await ctx.db.get(args.entityId as Id<"projects">);
      if (!project) throw new Error("Project not found");

      const client = await ctx.db.get(project.clientId);
      title = project.name;
      description = `Client: ${client?.companyName || "Unknown"}`;
      column = project.status;
      tags = [project.priority, project.type];
    }

    const boardConfig = BOARD_CONFIGS[args.boardId as keyof typeof BOARD_CONFIGS];
    if (!boardConfig || !boardConfig.columns.includes(column)) {
      column = boardConfig?.defaultColumn || "new";
    }

    // Get the highest position in the column
    const cardsInColumn = await ctx.db
      .query("boardCards")
      .withIndex("by_board_column", (q) =>
        q.eq("boardId", args.boardId).eq("column", column)
      )
      .collect();

    const maxPosition = cardsInColumn.reduce((max, card) =>
      Math.max(max, card.position), 0
    );

    const cardId = await ctx.db.insert("boardCards", {
      boardId: args.boardId,
      column,
      title,
      description,
      position: maxPosition + 1,
      tags,
      linkedEntityId: args.entityId,
      linkedEntityType: args.entityType,
      createdAt: now,
      updatedAt: now,
    });

    return cardId;
  },
});

// Bulk move cards
export const bulkMoveCards = mutation({
  args: {
    cardIds: v.array(v.id("boardCards")),
    newColumn: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the target column's current max position
    const firstCard = await ctx.db.get(args.cardIds[0]);
    if (!firstCard) throw new Error("Card not found");

    const cardsInNewColumn = await ctx.db
      .query("boardCards")
      .withIndex("by_board_column", (q) =>
        q.eq("boardId", firstCard.boardId).eq("column", args.newColumn)
      )
      .collect();

    let maxPosition = cardsInNewColumn.reduce((max, card) =>
      Math.max(max, card.position), 0
    );

    // Move each card
    for (const cardId of args.cardIds) {
      const card = await ctx.db.get(cardId);
      if (!card) continue;

      maxPosition++;
      await ctx.db.patch(cardId, {
        column: args.newColumn,
        position: maxPosition,
        updatedAt: now,
      });

      // Log the movement
      await ctx.db.insert("activityLogs", {
        action: "moved",
        entityType: "boardCard",
        entityId: cardId,
        entityName: card.title,
        changes: {
          column: { from: card.column, to: args.newColumn },
        },
        timestamp: now,
      });
    }

    return { success: true, movedCount: args.cardIds.length };
  },
});