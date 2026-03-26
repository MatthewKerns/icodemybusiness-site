"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckCircle2, FileText, TrendingUp } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

const STATUS_CONFIG = {
  planning: { label: "Planning", variant: "outline" as const, color: "text-blue-500" },
  active: { label: "Active", variant: "default" as const, color: "text-green-500" },
  on_hold: { label: "On Hold", variant: "secondary" as const, color: "text-yellow-500" },
  completed: { label: "Completed", variant: "secondary" as const, color: "text-gold" },
  cancelled: { label: "Cancelled", variant: "destructive" as const, color: "text-red-500" },
};

interface Project {
  _id: Id<"projects">;
  title: string;
  description?: string;
  clientId: string;
  status: string;
  progress: number;
  startDate: number;
  endDate?: number;
  createdAt: number;
}

interface ProjectDashboardProps {
  project: Project;
  showDetails?: boolean;
  className?: string;
}

export const ProjectDashboard = React.forwardRef<
  HTMLDivElement,
  ProjectDashboardProps
>(({ project, showDetails = true, className }, ref) => {
  const milestones = useQuery(api.milestones.getMilestonesTimeline, {
    projectId: project._id,
  });
  const deliverables = useQuery(api.deliverables.getDeliverablesByProject, {
    projectId: project._id,
  });

  const statusConfig = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planning;

  const completedMilestones = milestones?.filter((m) => m.status === "completed").length || 0;
  const totalMilestones = milestones?.length || 0;
  const inProgressMilestones = milestones?.filter((m) => m.status === "in_progress").length || 0;

  const completedDeliverables = deliverables?.filter((d) => d.status === "completed").length || 0;
  const totalDeliverables = deliverables?.length || 0;

  const startDate = new Date(project.startDate);
  const endDate = project.endDate ? new Date(project.endDate) : null;

  return (
    <Card
      ref={ref}
      className={cn(
        "border-border bg-bg-secondary",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-h3 text-text-primary">
              {project.title}
            </CardTitle>
            {project.description && showDetails && (
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
        {/* Current Phase & Progress */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gold" />
              <span className="text-sm font-medium text-text-muted">Progress</span>
            </div>
            <span className="text-lg font-bold text-gold">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* Timeline */}
        {showDetails && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Calendar className="h-4 w-4" />
            <span>
              {startDate.toLocaleDateString()}
              {endDate && ` - ${endDate.toLocaleDateString()}`}
            </span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border bg-black/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold" />
                <CardTitle className="text-xs font-medium text-text-muted">
                  Milestones
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-text-primary">
                  {completedMilestones}
                </span>
                <span className="text-sm text-text-muted">
                  / {totalMilestones}
                </span>
              </div>
              {inProgressMilestones > 0 && (
                <p className="mt-1 text-xs text-gold">
                  {inProgressMilestones} in progress
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-black/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gold" />
                <CardTitle className="text-xs font-medium text-text-muted">
                  Deliverables
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-text-primary">
                  {completedDeliverables}
                </span>
                <span className="text-sm text-text-muted">
                  / {totalDeliverables}
                </span>
              </div>
              {totalDeliverables > 0 && completedDeliverables < totalDeliverables && (
                <p className="mt-1 text-xs text-text-muted">
                  {totalDeliverables - completedDeliverables} pending
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
});

ProjectDashboard.displayName = "ProjectDashboard";
