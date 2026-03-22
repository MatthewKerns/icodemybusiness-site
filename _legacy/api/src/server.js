/* ==========================================================================
   ICMB API Service - Port 3004
   Provides Agent-OS compatible API endpoints
   ========================================================================== */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3004", "http://localhost:8080"],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Health & Status Endpoints
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ICMB API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      clients: '/api/clients',
      projects: '/api/projects',
      deliverables: '/api/deliverables',
      briefings: '/api/briefings',
      communications: '/api/communications',
      metrics: '/api/metrics'
    }
  });
});

// ============================================================================
// Client Management Endpoints
// ============================================================================

app.get('/api/clients', async (req, res) => {
  try {
    // In production, this would fetch from Convex
    const mockClients = [
      {
        id: 'client_1',
        name: 'Arise Group',
        type: 'active',
        projects: 2,
        monthlyValue: 5000,
        lastContact: new Date(Date.now() - 86400000).toISOString(),
        healthScore: 95
      },
      {
        id: 'client_2',
        name: 'TechStart Solutions',
        type: 'active',
        projects: 1,
        monthlyValue: 3500,
        lastContact: new Date(Date.now() - 172800000).toISOString(),
        healthScore: 88
      },
      {
        id: 'client_3',
        name: 'GreenTech Innovations',
        type: 'prospective',
        projects: 0,
        monthlyValue: 0,
        lastContact: new Date(Date.now() - 259200000).toISOString(),
        healthScore: 0
      }
    ];

    res.json({
      success: true,
      data: mockClients,
      total: mockClients.length
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    // Mock single client with detailed info
    const mockClient = {
      id: req.params.id,
      name: 'Arise Group',
      type: 'active',
      industry: 'Healthcare',
      contactName: 'John Smith',
      contactEmail: 'john@arisegroup.com',
      contactPhone: '+1 555-0100',
      projects: [
        { id: 'proj_1', name: 'Dashboard Redesign', status: 'in_progress' },
        { id: 'proj_2', name: 'API Integration', status: 'planning' }
      ],
      monthlyValue: 5000,
      totalLifetimeValue: 45000,
      startDate: '2023-01-15',
      lastContact: new Date(Date.now() - 86400000).toISOString(),
      healthScore: 95,
      notes: 'Key strategic client. Focus on long-term partnership.',
      tags: ['enterprise', 'healthcare', 'priority']
    };

    res.json({
      success: true,
      data: mockClient
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Project Management Endpoints
// ============================================================================

app.get('/api/projects', async (req, res) => {
  try {
    const { status, clientId, priority } = req.query;

    // Mock projects data
    let projects = [
      {
        id: 'proj_1',
        name: 'Dashboard Redesign',
        clientId: 'client_1',
        clientName: 'Arise Group',
        status: 'in_progress',
        priority: 'high',
        type: 'development',
        progress: 65,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        team: ['Matthew Kerns', 'Sarah Chen'],
        budget: 15000,
        spent: 9750
      },
      {
        id: 'proj_2',
        name: 'API Integration',
        clientId: 'client_1',
        clientName: 'Arise Group',
        status: 'planning',
        priority: 'medium',
        type: 'integration',
        progress: 15,
        dueDate: new Date(Date.now() + 21 * 86400000).toISOString(),
        team: ['Matthew Kerns'],
        budget: 8000,
        spent: 1200
      },
      {
        id: 'proj_3',
        name: 'E-commerce Platform',
        clientId: 'client_2',
        clientName: 'TechStart Solutions',
        status: 'in_progress',
        priority: 'high',
        type: 'development',
        progress: 40,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        team: ['Matthew Kerns', 'Alex Johnson'],
        budget: 25000,
        spent: 10000
      }
    ];

    // Apply filters
    if (status) {
      projects = projects.filter(p => p.status === status);
    }
    if (clientId) {
      projects = projects.filter(p => p.clientId === clientId);
    }
    if (priority) {
      projects = projects.filter(p => p.priority === priority);
    }

    res.json({
      success: true,
      data: projects,
      total: projects.length
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const mockProject = {
      id: req.params.id,
      name: 'Dashboard Redesign',
      clientId: 'client_1',
      clientName: 'Arise Group',
      description: 'Complete redesign of client dashboard with modern UI/UX',
      status: 'in_progress',
      priority: 'high',
      type: 'development',
      startDate: '2024-02-01',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      completedDate: null,
      progress: 65,
      team: [
        { id: 'user_1', name: 'Matthew Kerns', role: 'Lead Developer' },
        { id: 'user_2', name: 'Sarah Chen', role: 'UI/UX Designer' }
      ],
      milestones: [
        { name: 'Design Approval', status: 'completed', dueDate: '2024-02-15' },
        { name: 'Frontend Development', status: 'in_progress', dueDate: '2024-03-01' },
        { name: 'Backend Integration', status: 'pending', dueDate: '2024-03-15' },
        { name: 'Testing & Launch', status: 'pending', dueDate: '2024-03-20' }
      ],
      budget: 15000,
      spent: 9750,
      timeTracked: 124.5, // hours
      deliverables: [
        { id: 'del_1', name: 'Design Mockups', status: 'delivered' },
        { id: 'del_2', name: 'Frontend Components', status: 'in_progress' },
        { id: 'del_3', name: 'API Endpoints', status: 'pending' }
      ]
    };

    res.json({
      success: true,
      data: mockProject
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Deliverables Endpoints
// ============================================================================

app.get('/api/deliverables', async (req, res) => {
  try {
    const { projectId, status } = req.query;

    let deliverables = [
      {
        id: 'del_1',
        name: 'Design Mockups',
        projectId: 'proj_1',
        projectName: 'Dashboard Redesign',
        clientId: 'client_1',
        clientName: 'Arise Group',
        type: 'design',
        status: 'delivered',
        assignedTo: 'Sarah Chen',
        dueDate: '2024-02-15',
        completedDate: '2024-02-14',
        fileUrl: '/files/mockups-v2.fig',
        version: 2,
        feedback: 'Excellent work! Client loved the modern design.'
      },
      {
        id: 'del_2',
        name: 'Frontend Components',
        projectId: 'proj_1',
        projectName: 'Dashboard Redesign',
        clientId: 'client_1',
        clientName: 'Arise Group',
        type: 'code',
        status: 'in_progress',
        assignedTo: 'Matthew Kerns',
        dueDate: '2024-03-01',
        completedDate: null,
        fileUrl: null,
        version: 1,
        feedback: null
      },
      {
        id: 'del_3',
        name: 'API Documentation',
        projectId: 'proj_2',
        projectName: 'API Integration',
        clientId: 'client_1',
        clientName: 'Arise Group',
        type: 'document',
        status: 'pending',
        assignedTo: 'Matthew Kerns',
        dueDate: '2024-03-10',
        completedDate: null,
        fileUrl: null,
        version: 1,
        feedback: null
      }
    ];

    // Apply filters
    if (projectId) {
      deliverables = deliverables.filter(d => d.projectId === projectId);
    }
    if (status) {
      deliverables = deliverables.filter(d => d.status === status);
    }

    res.json({
      success: true,
      data: deliverables,
      total: deliverables.length
    });
  } catch (error) {
    console.error('Error fetching deliverables:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Multi-Company Briefing Endpoints (For Agent-OS)
// ============================================================================

app.get('/api/briefings/daily', async (req, res) => {
  try {
    const briefing = {
      date: new Date().toISOString(),
      company: 'iCodeMyBusiness',
      summary: {
        activeProjects: 3,
        pendingTasks: 8,
        clientRequests: 2,
        upcomingMeetings: 2,
        revenueThisMonth: 13500
      },
      priorities: [
        {
          type: 'project',
          title: 'Complete Dashboard Redesign Frontend',
          client: 'Arise Group',
          deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
          priority: 'high'
        },
        {
          type: 'meeting',
          title: 'Client Discovery Call',
          client: 'Potential - Sarah Chen',
          time: new Date(Date.now() + 3600000).toISOString(),
          priority: 'high'
        },
        {
          type: 'deliverable',
          title: 'Submit API Documentation',
          client: 'Arise Group',
          deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
          priority: 'medium'
        }
      ],
      communications: [
        {
          from: 'John Smith (Arise Group)',
          type: 'email',
          subject: 'Re: Dashboard Progress Update',
          preview: 'Looking forward to seeing the new components...',
          received: new Date(Date.now() - 3600000).toISOString(),
          requiresResponse: true
        },
        {
          from: 'Sarah Chen',
          type: 'calendly',
          subject: 'Discovery Call Scheduled',
          preview: 'Confirmed for tomorrow at 10:30 AM',
          received: new Date(Date.now() - 7200000).toISOString(),
          requiresResponse: false
        }
      ],
      metrics: {
        weeklyProgress: {
          tasksCompleted: 12,
          tasksTotal: 20,
          hoursWorked: 32,
          hoursPlanned: 40
        },
        clientHealth: [
          { client: 'Arise Group', score: 95, trend: 'stable' },
          { client: 'TechStart Solutions', score: 88, trend: 'up' }
        ]
      }
    };

    res.json({
      success: true,
      data: briefing
    });
  } catch (error) {
    console.error('Error generating briefing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Communications Endpoints
// ============================================================================

app.get('/api/communications', async (req, res) => {
  try {
    const { channel, unread } = req.query;

    let communications = [
      {
        id: 'comm_1',
        channel: 'email',
        from: 'John Smith',
        fromEmail: 'john@arisegroup.com',
        subject: 'Re: Dashboard Progress Update',
        body: 'Looking forward to seeing the new components. Can we schedule a demo for next week?',
        receivedAt: new Date(Date.now() - 3600000).toISOString(),
        isRead: false,
        requiresResponse: true,
        clientId: 'client_1',
        projectId: 'proj_1',
        suggestedReply: 'Hi John, The components are progressing well. I can show you a demo on Thursday at 2 PM. Would that work?'
      },
      {
        id: 'comm_2',
        channel: 'linkedin',
        from: 'Sarah Chen',
        fromEmail: null,
        subject: 'Connection Request',
        body: 'Hi Matthew, I saw your post about AI automation and would love to connect to discuss potential collaboration.',
        receivedAt: new Date(Date.now() - 7200000).toISOString(),
        isRead: true,
        requiresResponse: true,
        clientId: null,
        projectId: null,
        suggestedReply: 'Hi Sarah, Thanks for connecting! I\'d be happy to discuss collaboration opportunities. When would be a good time for a call?'
      }
    ];

    // Apply filters
    if (channel) {
      communications = communications.filter(c => c.channel === channel);
    }
    if (unread === 'true') {
      communications = communications.filter(c => !c.isRead);
    }

    res.json({
      success: true,
      data: communications,
      total: communications.length,
      unreadCount: communications.filter(c => !c.isRead).length
    });
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Business Metrics Endpoints
// ============================================================================

app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = {
      revenue: {
        mrr: 13500,
        arr: 162000,
        growth: 12.5, // percentage
        churn: 2.1, // percentage
        newMrrThisMonth: 3500,
        churnedMrrThisMonth: 0
      },
      projects: {
        active: 3,
        completed: 12,
        inPipeline: 5,
        averageValue: 12000,
        averageCompletionTime: 21, // days
        onTimeDelivery: 92 // percentage
      },
      clients: {
        total: 8,
        active: 6,
        new: 2,
        churnedThisQuarter: 0,
        averageLTV: 27000,
        nps: 72
      },
      productivity: {
        hoursThisWeek: 32,
        billableHours: 28,
        utilizationRate: 87.5, // percentage
        tasksCompleted: 24,
        averageTaskTime: 1.3 // hours
      },
      pipeline: {
        leads: 12,
        qualifiedLeads: 5,
        proposalsSent: 3,
        conversionRate: 35, // percentage
        averageDealSize: 15000,
        estimatedPipelineValue: 75000
      }
    };

    res.json({
      success: true,
      data: metrics,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// WebSocket Events for Real-time Updates
// ============================================================================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Subscribe to specific data channels
  socket.on('subscribe', (channels) => {
    channels.forEach(channel => {
      socket.join(channel);
      console.log(`Client ${socket.id} subscribed to ${channel}`);
    });
  });

  // Unsubscribe from channels
  socket.on('unsubscribe', (channels) => {
    channels.forEach(channel => {
      socket.leave(channel);
      console.log(`Client ${socket.id} unsubscribed from ${channel}`);
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Function to emit events (called when data changes)
export function emitDataUpdate(channel, eventType, data) {
  const event = {
    id: `evt_${Date.now()}`,
    source: 'icmb-api',
    type: eventType,
    datacontenttype: 'application/json',
    time: new Date().toISOString(),
    data: data
  };

  io.to(channel).emit('dataUpdate', event);
  console.log(`Event emitted to ${channel}:`, eventType);
}

// ============================================================================
// Error Handling
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 3004;

httpServer.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════╗
  ║                                                        ║
  ║     ICMB API Service Started Successfully              ║
  ║                                                        ║
  ║     Port: ${PORT}                                        ║
  ║     Health: http://localhost:${PORT}/health              ║
  ║     Docs: http://localhost:${PORT}/api-docs              ║
  ║                                                        ║
  ║     WebSocket: ws://localhost:${PORT}                    ║
  ║                                                        ║
  ╚════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;