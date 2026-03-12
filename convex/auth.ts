import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get or create user from Clerk authentication
export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update last login
      await ctx.db.patch(existingUser._id, {
        lastLogin: now,
        updatedAt: now,
      });
      return existingUser._id;
    }

    // Determine role based on email domain or specific emails
    let role = "client";
    const adminEmails = ["matthew@icodemybusiness.com", "admin@icodemybusiness.com"];
    const adminDomains = ["icodemybusiness.com", "infinityvault.io"];

    if (adminEmails.includes(args.email)) {
      role = "admin";
    } else {
      const domain = args.email.split("@")[1];
      if (adminDomains.includes(domain)) {
        role = "admin";
      }
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      role,
      permissions: getDefaultPermissions(role),
      avatar: args.imageUrl,
      isActive: true,
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
    });

    // Send welcome notification
    await ctx.db.insert("notifications", {
      userId,
      type: "success",
      category: "system",
      title: "Welcome to iCodeMyBusiness",
      message: `Your account has been created with ${role} access.`,
      isRead: false,
      createdAt: now,
    });

    return userId;
  },
});

// Get current user
export const getCurrentUser = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    // Get unread notifications count
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_read_status", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    return {
      ...user,
      unreadNotificationCount: unreadNotifications.length,
    };
  },
});

// Check if user has permission
export const hasPermission = query({
  args: {
    userId: v.id("users"),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.isActive) return false;

    // Admins have all permissions
    if (user.role === "admin") return true;

    // Check specific permissions
    return user.permissions?.includes(args.permission) || false;
  },
});

// Update user role
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.string(),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if updater has permission
    const updater = await ctx.db.get(args.updatedBy);
    if (!updater || updater.role !== "admin") {
      throw new Error("Only admins can update user roles");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();

    await ctx.db.patch(args.userId, {
      role: args.newRole,
      permissions: getDefaultPermissions(args.newRole),
      updatedAt: now,
    });

    // Log the change
    await ctx.db.insert("activityLogs", {
      userId: args.updatedBy,
      action: "updated",
      entityType: "user",
      entityId: args.userId,
      entityName: user.name,
      changes: {
        role: { from: user.role, to: args.newRole },
      },
      timestamp: now,
    });

    return { success: true };
  },
});

// Add custom permission to user
export const addPermission = mutation({
  args: {
    userId: v.id("users"),
    permission: v.string(),
    addedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if adder has permission
    const adder = await ctx.db.get(args.addedBy);
    if (!adder || adder.role !== "admin") {
      throw new Error("Only admins can add permissions");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const permissions = user.permissions || [];
    if (!permissions.includes(args.permission)) {
      permissions.push(args.permission);

      await ctx.db.patch(args.userId, {
        permissions,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Remove permission from user
export const removePermission = mutation({
  args: {
    userId: v.id("users"),
    permission: v.string(),
    removedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if remover has permission
    const remover = await ctx.db.get(args.removedBy);
    if (!remover || remover.role !== "admin") {
      throw new Error("Only admins can remove permissions");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const permissions = (user.permissions || []).filter(p => p !== args.permission);

    await ctx.db.patch(args.userId, {
      permissions,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Deactivate user
export const deactivateUser = mutation({
  args: {
    userId: v.id("users"),
    deactivatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if deactivator has permission
    const deactivator = await ctx.db.get(args.deactivatedBy);
    if (!deactivator || deactivator.role !== "admin") {
      throw new Error("Only admins can deactivate users");
    }

    const now = Date.now();

    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: now,
    });

    // Log the deactivation
    const user = await ctx.db.get(args.userId);
    await ctx.db.insert("activityLogs", {
      userId: args.deactivatedBy,
      action: "deactivated",
      entityType: "user",
      entityId: args.userId,
      entityName: user?.name,
      timestamp: now,
    });

    return { success: true };
  },
});

// Get all users (admin only)
export const getAllUsers = query({
  args: {
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if requester is admin
    const requester = await ctx.db.get(args.requesterId);
    if (!requester || requester.role !== "admin") {
      throw new Error("Only admins can view all users");
    }

    const users = await ctx.db.query("users").collect();

    // Add activity information
    const usersWithActivity = await Promise.all(
      users.map(async (user) => {
        const recentActivity = await ctx.db
          .query("activityLogs")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .order("desc")
          .take(1);

        return {
          ...user,
          lastActivity: recentActivity[0]?.timestamp,
        };
      })
    );

    return usersWithActivity;
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    preferences: v.object({
      emailNotifications: v.optional(v.boolean()),
      smsNotifications: v.optional(v.boolean()),
      theme: v.optional(v.string()),
      language: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      preferences: {
        ...user.preferences,
        ...args.preferences,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Helper function to get default permissions by role
function getDefaultPermissions(role: string): string[] {
  const permissionsByRole: Record<string, string[]> = {
    admin: [
      "view_all_leads",
      "edit_all_leads",
      "delete_leads",
      "view_all_clients",
      "edit_all_clients",
      "delete_clients",
      "view_all_projects",
      "edit_all_projects",
      "delete_projects",
      "manage_users",
      "manage_integrations",
      "view_analytics",
      "manage_billing",
      "export_data",
    ],
    manager: [
      "view_all_leads",
      "edit_all_leads",
      "view_all_clients",
      "edit_all_clients",
      "view_all_projects",
      "edit_all_projects",
      "view_analytics",
      "export_data",
    ],
    developer: [
      "view_assigned_projects",
      "edit_assigned_projects",
      "view_assigned_deliverables",
      "edit_assigned_deliverables",
      "create_deliverables",
      "view_documents",
    ],
    client: [
      "view_own_projects",
      "view_own_deliverables",
      "submit_requests",
      "view_documents",
      "send_messages",
    ],
  };

  return permissionsByRole[role] || [];
}

// Create API key for external access
export const createApiKey = mutation({
  args: {
    name: v.string(),
    permissions: v.array(v.string()),
    expiresInDays: v.optional(v.number()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if creator is admin
    const creator = await ctx.db.get(args.createdBy);
    if (!creator || creator.role !== "admin") {
      throw new Error("Only admins can create API keys");
    }

    const now = Date.now();

    // Generate a random API key
    const key = generateApiKey();
    const hashedKey = hashApiKey(key);

    const expiresAt = args.expiresInDays
      ? now + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    await ctx.db.insert("apiKeys", {
      name: args.name,
      key: key.slice(0, 8) + "...", // Store partial key for identification
      hashedKey,
      permissions: args.permissions,
      expiresAt,
      isActive: true,
      createdBy: args.createdBy,
      createdAt: now,
    });

    // Return the full key only once
    return { apiKey: key, expiresAt };
  },
});

// Validate API key
export const validateApiKey = query({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const hashedKey = hashApiKey(args.apiKey);

    const apiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("hashedKey", hashedKey))
      .first();

    if (!apiKeyDoc || !apiKeyDoc.isActive) {
      return { valid: false };
    }

    // Check expiration
    if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt < Date.now()) {
      return { valid: false };
    }

    // Update usage stats
    await ctx.db.patch(apiKeyDoc._id, {
      lastUsed: Date.now(),
      usageCount: (apiKeyDoc.usageCount || 0) + 1,
    });

    return {
      valid: true,
      permissions: apiKeyDoc.permissions,
    };
  },
});

// Helper function to generate API key
function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "icmb_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Helper function to hash API key
function hashApiKey(key: string): string {
  // Simple hash for demo - in production use crypto.createHash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}