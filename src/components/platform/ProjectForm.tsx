"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Id } from "../../../convex/_generated/dataModel";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROJECT_STATUSES = [
  "planning",
  "in-progress",
  "on-hold",
  "completed",
  "cancelled",
] as const;

const projectFormSchema = z.object({
  title: z.string().min(1, "Project title is required").max(200, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  clientId: z.string().min(1, "Client ID is required"),
  status: z.enum(PROJECT_STATUSES),
  progress: z.number().min(0, "Progress must be at least 0").max(100, "Progress cannot exceed 100"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export interface ProjectFormData extends ProjectFormValues {
  _id?: Id<"projects">;
}

export interface Milestone {
  id?: string;
  title: string;
  description?: string;
  status: string;
  dueDate: string;
  order: number;
}

export interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSubmit: (data: ProjectFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
  submitLabel?: string;
  showMilestones?: boolean;
}

export const ProjectForm = React.forwardRef<HTMLFormElement, ProjectFormProps>(
  (
    {
      initialData,
      onSubmit,
      onCancel,
      isSubmitting = false,
      className,
      submitLabel = "Save Project",
      showMilestones = false,
    },
    ref
  ) => {
    const form = useForm<ProjectFormValues>({
      resolver: zodResolver(projectFormSchema),
      defaultValues: initialData || {
        title: "",
        description: "",
        clientId: "",
        status: "planning",
        progress: 0,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
      },
    });

    const handleSubmit = async (data: ProjectFormValues) => {
      await onSubmit(data);
    };

    return (
      <Form {...form}>
        <form
          ref={ref}
          onSubmit={(e) => {
            void form.handleSubmit(handleSubmit)(e);
          }}
          className={cn("space-y-6", className)}
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Website Redesign"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Complete redesign of company website with modern UI/UX"
                    className="min-h-[100px]"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Optional project description visible to the client
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="user_xxxxxxxxxxxxx"
                    {...field}
                    disabled={isSubmitting || !!initialData?._id}
                  />
                </FormControl>
                <FormDescription>
                  Clerk user ID of the client (cannot be changed after creation)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROJECT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace("-", " ").charAt(0).toUpperCase() +
                            status.replace("-", " ").slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showMilestones && (
            <div className="rounded-lg border border-border bg-bg-secondary/50 p-4">
              <h3 className="mb-2 text-sm font-medium text-text-primary">
                Milestones
              </h3>
              <p className="text-sm text-text-muted">
                Milestones can be managed after the project is created
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    );
  }
);

ProjectForm.displayName = "ProjectForm";
