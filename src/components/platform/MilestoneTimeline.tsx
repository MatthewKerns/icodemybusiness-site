"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

const MILESTONE_STATUS_CONFIG = {
  completed: {
    label: "Completed",
    variant: "secondary" as const,
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500",
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: Clock,
    color: "text-gold",
    bgColor: "bg-gold",
  },
  upcoming: {
    label: "Upcoming",
    variant: "outline" as const,
    icon: Circle,
    color: "text-text-muted",
    bgColor: "bg-text-muted",
  },
};

const timelineItemVariants = cva(
  "relative flex gap-4 pb-8 last:pb-0",
  {
    variants: {
      status: {
        completed: "",
        in_progress: "",
        upcoming: "",
      },
    },
    defaultVariants: {
      status: "upcoming",
    },
  }
);

export interface Milestone {
  _id: Id<"milestones">;
  projectId: Id<"projects">;
  title: string;
  description?: string;
  status: string;
  dueDate: number;
  order: number;
  createdAt: number;
}

export interface MilestoneTimelineProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timelineItemVariants> {
  milestones: Milestone[];
  showDescription?: boolean;
}

export const MilestoneTimeline = React.forwardRef<
  HTMLDivElement,
  MilestoneTimelineProps
>(({ milestones, showDescription = true, className, ...props }, ref) => {
  const sortedMilestones = React.useMemo(() => {
    return [...milestones].sort((a, b) => a.dueDate - b.dueDate);
  }, [milestones]);

  if (sortedMilestones.length === 0) {
    return (
      <div
        ref={ref}
        className={cn("text-center text-sm text-text-muted py-8", className)}
        {...props}
      >
        No milestones available
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("space-y-0", className)} {...props}>
      {sortedMilestones.map((milestone, index) => {
        const statusConfig =
          MILESTONE_STATUS_CONFIG[
            milestone.status as keyof typeof MILESTONE_STATUS_CONFIG
          ] || MILESTONE_STATUS_CONFIG.upcoming;
        const Icon = statusConfig.icon;
        const isLast = index === sortedMilestones.length - 1;
        const dueDate = new Date(milestone.dueDate);
        const isOverdue =
          milestone.status !== "completed" && dueDate < new Date();

        return (
          <div
            key={milestone._id}
            className={cn(
              timelineItemVariants({ status: milestone.status as any }),
              "group"
            )}
          >
            {/* Timeline Line & Icon */}
            <div className="relative flex flex-col items-center">
              {/* Icon Container */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-bg-secondary transition-colors",
                  milestone.status === "completed"
                    ? "border-green-500 bg-green-500/10"
                    : milestone.status === "in_progress"
                    ? "border-gold bg-gold/10"
                    : "border-border bg-black/20"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    statusConfig.color
                  )}
                />
              </div>

              {/* Connecting Line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute top-10 h-full w-0.5 transition-colors",
                    milestone.status === "completed"
                      ? "bg-green-500/30"
                      : "bg-border"
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4
                    className={cn(
                      "text-base font-semibold leading-none tracking-tight",
                      milestone.status === "completed"
                        ? "text-text-muted line-through"
                        : "text-text-primary"
                    )}
                  >
                    {milestone.title}
                  </h4>

                  {showDescription && milestone.description && (
                    <p className="mt-2 text-sm text-text-muted">
                      {milestone.description}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                    <span className={cn(isOverdue && "text-red-500 font-medium")}>
                      Due: {dueDate.toLocaleDateString()}
                    </span>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>

                <Badge variant={statusConfig.variant} className="shrink-0">
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

MilestoneTimeline.displayName = "MilestoneTimeline";
