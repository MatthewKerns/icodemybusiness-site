"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

const STATUS_CONFIG = {
  planning: { label: "Planning", variant: "outline" as const, color: "text-blue-500" },
  active: { label: "Active", variant: "default" as const, color: "text-green-500" },
  on_hold: { label: "On Hold", variant: "secondary" as const, color: "text-yellow-500" },
  completed: { label: "Completed", variant: "secondary" as const, color: "text-gold" },
  cancelled: { label: "Cancelled", variant: "destructive" as const, color: "text-red-500" },
};

const MILESTONE_STATUS_CONFIG = {
  upcoming: { label: "Upcoming", icon: Clock, color: "text-text-muted" },
  in_progress: { label: "In Progress", icon: TrendingUp, color: "text-gold" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500" },
};

export default function PortalDashboard() {
  const { user, isLoaded } = useUser();
  const projects = useQuery(api.projects.listProjects,
    isLoaded && user ? { clientId: user.id } : "skip"
  );

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  if (projects === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.status === "active");
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-h1 font-bold text-text-primary">
            Welcome back, {user.firstName || "Client"}
          </h1>
          <p className="mt-2 text-text-muted">
            Track your projects, milestones, and deliverables
          </p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-bg-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-text-muted">
                Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text-primary">
                {totalProjects}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-bg-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-text-muted">
                Active Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">
                {activeProjects.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-bg-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-text-muted">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {completedProjects}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        {projects.length === 0 ? (
          <Card className="border-border bg-bg-secondary">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-4 h-12 w-12 text-text-dim" />
              <h3 className="mb-2 text-h3 font-semibold text-text-primary">
                No projects yet
              </h3>
              <p className="text-center text-text-muted">
                Your consultant will set up your projects soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <h2 className="text-h2 font-bold text-text-primary">Your Projects</h2>

            <div className="grid gap-6 lg:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickLinkCard
            title="View All Projects"
            description="See detailed project information"
            href="/portal/projects"
            icon={FileText}
          />
          <QuickLinkCard
            title="Deliverables"
            description="Download your project files"
            href="/portal/deliverables"
            icon={FileText}
          />
          <QuickLinkCard
            title="Activity Log"
            description="Track all project updates"
            href="/portal/activity"
            icon={Calendar}
          />
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const milestones = useQuery(api.milestones.getMilestonesTimeline, {
    projectId: project._id,
  });
  const deliverables = useQuery(api.deliverables.getDeliverablesByProject, {
    projectId: project._id,
  });
  const activities = useQuery(api.activities.listActivities, {
    projectId: project._id,
    limit: 3,
  });

  const statusConfig = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planning;

  const upcomingMilestones = milestones?.filter((m) => m.status !== "completed").slice(0, 3) || [];
  const completedDeliverables = deliverables?.filter((d) => d.status === "completed").length || 0;
  const totalDeliverables = deliverables?.length || 0;

  const startDate = new Date(project.startDate);
  const endDate = project.endDate ? new Date(project.endDate) : null;

  return (
    <Card
      className={cn(
        "border-border bg-bg-secondary transition-all duration-300",
        "hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-h3 text-text-primary">
              {project.title}
            </CardTitle>
            {project.description && (
              <CardDescription className="mt-2 text-text-muted">
                {project.description}
              </CardDescription>
            )}
          </div>
          <Badge variant={statusConfig.variant} className="ml-2">
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress */}
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-text-muted">Progress</span>
            <span className="font-semibold text-gold">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Calendar className="h-4 w-4" />
          <span>
            {startDate.toLocaleDateString()}
            {endDate && ` - ${endDate.toLocaleDateString()}`}
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-black/20 p-4">
          <div>
            <div className="text-xs text-text-muted">Milestones</div>
            <div className="mt-1 text-lg font-semibold text-text-primary">
              {milestones?.filter((m) => m.status === "completed").length || 0} / {milestones?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Deliverables</div>
            <div className="mt-1 text-lg font-semibold text-text-primary">
              {completedDeliverables} / {totalDeliverables}
            </div>
          </div>
        </div>

        {/* Upcoming Milestones */}
        {upcomingMilestones.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text-primary">
              Upcoming Milestones
            </h4>
            <div className="space-y-2">
              {upcomingMilestones.map((milestone) => {
                const config = MILESTONE_STATUS_CONFIG[milestone.status as keyof typeof MILESTONE_STATUS_CONFIG] || MILESTONE_STATUS_CONFIG.upcoming;
                const Icon = config.icon;
                const dueDate = new Date(milestone.dueDate);

                return (
                  <div
                    key={milestone._id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-black/10 p-3"
                  >
                    <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {milestone.title}
                      </div>
                      <div className="text-xs text-text-muted">
                        Due {dueDate.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {activities && activities.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-text-primary">
              Recent Activity
            </h4>
            <div className="space-y-2">
              {activities.map((activity) => {
                const activityDate = new Date(activity.timestamp);
                return (
                  <div
                    key={activity._id}
                    className="text-sm text-text-muted"
                  >
                    <span className="font-medium text-text-primary">
                      {activity.eventType}
                    </span>
                    {" • "}
                    {activityDate.toLocaleDateString()}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickLinkCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <a href={href}>
      <Card
        className={cn(
          "border-border bg-bg-secondary transition-all duration-300",
          "hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.1)] cursor-pointer"
        )}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gold/10 p-2">
              <Icon className="h-5 w-5 text-gold" />
            </div>
            <div>
              <CardTitle className="text-base text-text-primary">
                {title}
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-text-muted">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </a>
  );
}
