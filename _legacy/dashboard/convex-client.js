// Convex client setup for dashboard
import { ConvexClient } from "convex/browser";

// Initialize Convex client
// Note: You'll need to replace this with your actual Convex deployment URL
const CONVEX_URL = process.env.CONVEX_URL || "https://your-project.convex.cloud";

export const convex = new ConvexClient(CONVEX_URL);

// Authentication state management
let currentUser = null;

// Initialize Clerk authentication
export async function initAuth() {
  // This will be replaced with actual Clerk integration
  // For now, using mock authentication
  const mockUser = {
    clerkId: "user_mock123",
    email: "matthew@icodemybusiness.com",
    name: "Matthew Kerns",
    role: "admin",
  };

  try {
    // Get or create user in Convex
    const userId = await convex.mutation("auth:getOrCreateUser", {
      clerkId: mockUser.clerkId,
      email: mockUser.email,
      name: mockUser.name,
    });

    currentUser = { ...mockUser, id: userId };
    console.log("User authenticated:", currentUser);
    return currentUser;
  } catch (error) {
    console.error("Authentication failed:", error);
    return null;
  }
}

// Get current user
export function getCurrentUser() {
  return currentUser;
}

// Lead Management Functions
export const leadFunctions = {
  // Create a new lead
  create: async (leadData) => {
    return await convex.mutation("leads:createLead", leadData);
  },

  // Get all leads with optional filtering
  getAll: async (filters = {}) => {
    return await convex.query("leads:getLeads", filters);
  },

  // Get single lead
  getById: async (id) => {
    return await convex.query("leads:getLead", { id });
  },

  // Update lead status
  updateStatus: async (id, status, notes) => {
    return await convex.mutation("leads:updateLeadStatus", { id, status, notes });
  },

  // Update lead score
  updateScore: async (id, score) => {
    return await convex.mutation("leads:updateLeadScore", { id, score });
  },

  // Search leads
  search: async (searchTerm) => {
    return await convex.query("leads:searchLeads", { searchTerm });
  },

  // Get lead statistics
  getStats: async () => {
    return await convex.query("leads:getLeadStats");
  },

  // Subscribe to lead updates (real-time)
  subscribe: (callback) => {
    return convex.subscribe("leads:getLeads", {}, callback);
  },
};

// Client Management Functions
export const clientFunctions = {
  // Create a new client
  create: async (clientData) => {
    return await convex.mutation("clients:createClient", clientData);
  },

  // Get all clients
  getAll: async (filters = {}) => {
    return await convex.query("clients:getClients", filters);
  },

  // Get single client with related data
  getById: async (id) => {
    return await convex.query("clients:getClient", { id });
  },

  // Update client
  update: async (id, updates) => {
    return await convex.mutation("clients:updateClient", { id, ...updates });
  },

  // Get client health score
  getHealth: async (id) => {
    return await convex.query("clients:getClientHealth", { id });
  },

  // Get client statistics
  getStats: async () => {
    return await convex.query("clients:getClientStats");
  },

  // Subscribe to client updates
  subscribe: (callback) => {
    return convex.subscribe("clients:getClients", {}, callback);
  },
};

// Project Management Functions
export const projectFunctions = {
  // Create a new project
  create: async (projectData) => {
    return await convex.mutation("projects:createProject", projectData);
  },

  // Create from template
  createFromTemplate: async (clientId, templateType, name) => {
    return await convex.mutation("projects:createProjectFromTemplate", {
      clientId,
      templateType,
      name,
    });
  },

  // Get all projects
  getAll: async (filters = {}) => {
    return await convex.query("projects:getProjects", filters);
  },

  // Get single project with related data
  getById: async (id) => {
    return await convex.query("projects:getProject", { id });
  },

  // Update project status
  updateStatus: async (id, status) => {
    return await convex.mutation("projects:updateProjectStatus", { id, status });
  },

  // Update project details
  update: async (id, updates) => {
    return await convex.mutation("projects:updateProject", { id, ...updates });
  },

  // Get project timeline
  getTimeline: async (id) => {
    return await convex.query("projects:getProjectTimeline", { id });
  },

  // Get project statistics
  getStats: async () => {
    return await convex.query("projects:getProjectStats");
  },

  // Subscribe to project updates
  subscribe: (callback) => {
    return convex.subscribe("projects:getProjects", {}, callback);
  },
};

// Board Management Functions
export const boardFunctions = {
  // Create a new card
  createCard: async (cardData) => {
    return await convex.mutation("boards:createCard", cardData);
  },

  // Get all cards for a board
  getBoardCards: async (boardId) => {
    return await convex.query("boards:getBoardCards", { boardId });
  },

  // Move card to different column or position
  moveCard: async (cardId, newColumn, newPosition) => {
    return await convex.mutation("boards:moveCard", {
      cardId,
      newColumn,
      newPosition,
    });
  },

  // Update card details
  updateCard: async (cardId, updates) => {
    return await convex.mutation("boards:updateCard", { cardId, ...updates });
  },

  // Delete a card
  deleteCard: async (cardId) => {
    return await convex.mutation("boards:deleteCard", { cardId });
  },

  // Get board statistics
  getBoardStats: async (boardId) => {
    return await convex.query("boards:getBoardStats", { boardId });
  },

  // Create card from entity
  createFromEntity: async (boardId, entityType, entityId) => {
    return await convex.mutation("boards:createCardFromEntity", {
      boardId,
      entityType,
      entityId,
    });
  },

  // Subscribe to board updates
  subscribe: (boardId, callback) => {
    return convex.subscribe("boards:getBoardCards", { boardId }, callback);
  },
};

// Notification Functions
export const notificationFunctions = {
  // Get user notifications
  getUserNotifications: async (userId, limit = 50) => {
    return await convex.query("notifications:getUserNotifications", { userId, limit });
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    return await convex.mutation("notifications:markAsRead", { id: notificationId });
  },

  // Mark all as read
  markAllAsRead: async (userId) => {
    return await convex.mutation("notifications:markAllAsRead", { userId });
  },

  // Subscribe to new notifications
  subscribe: (userId, callback) => {
    return convex.subscribe("notifications:getUserNotifications", { userId, limit: 10 }, callback);
  },
};

// Real-time subscription manager
class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
  }

  add(key, unsubscribe) {
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)();
    }
    this.subscriptions.set(key, unsubscribe);
  }

  remove(key) {
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)();
      this.subscriptions.delete(key);
    }
  }

  clear() {
    for (const unsubscribe of this.subscriptions.values()) {
      unsubscribe();
    }
    this.subscriptions.clear();
  }
}

export const subscriptions = new SubscriptionManager();

// Dashboard data fetching utilities
export const dashboardData = {
  // Get all dashboard metrics
  getMetrics: async () => {
    const [leadStats, clientStats, projectStats] = await Promise.all([
      leadFunctions.getStats(),
      clientFunctions.getStats(),
      projectFunctions.getStats(),
    ]);

    return {
      leads: leadStats,
      clients: clientStats,
      projects: projectStats,
    };
  },

  // Get recent activity
  getRecentActivity: async (limit = 20) => {
    return await convex.query("activityLogs:getRecentActivity", { limit });
  },

  // Get upcoming appointments
  getUpcomingAppointments: async (limit = 10) => {
    return await convex.query("appointments:getUpcoming", { limit });
  },

  // Initialize real-time dashboard updates
  initRealTimeUpdates: (callbacks) => {
    // Subscribe to multiple data sources
    if (callbacks.onLeadsUpdate) {
      const unsubscribe = leadFunctions.subscribe(callbacks.onLeadsUpdate);
      subscriptions.add("leads", unsubscribe);
    }

    if (callbacks.onClientsUpdate) {
      const unsubscribe = clientFunctions.subscribe(callbacks.onClientsUpdate);
      subscriptions.add("clients", unsubscribe);
    }

    if (callbacks.onProjectsUpdate) {
      const unsubscribe = projectFunctions.subscribe(callbacks.onProjectsUpdate);
      subscriptions.add("projects", unsubscribe);
    }

    if (callbacks.onNotification && currentUser) {
      const unsubscribe = notificationFunctions.subscribe(
        currentUser.id,
        callbacks.onNotification
      );
      subscriptions.add("notifications", unsubscribe);
    }
  },

  // Clean up subscriptions
  cleanup: () => {
    subscriptions.clear();
  },
};

// Export everything as default for easy import
export default {
  convex,
  initAuth,
  getCurrentUser,
  leads: leadFunctions,
  clients: clientFunctions,
  projects: projectFunctions,
  boards: boardFunctions,
  notifications: notificationFunctions,
  dashboard: dashboardData,
  subscriptions,
};