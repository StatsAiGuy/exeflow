"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Milestone as MilestoneIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { usePlan } from "@/lib/hooks/use-plan";
import { useTasks } from "@/lib/hooks/use-tasks";
import { PlanItem } from "./plan-item";
import { ProgressBar } from "./progress-bar";
import type { PlanMilestone } from "@/types/plan";
import type { Task, TaskStatus, TaskComplexity } from "@/types/task";

interface PlanTreeProps {
  projectId: string;
}

function getTaskStatus(
  planTaskId: string,
  tasks: Task[],
): { status: TaskStatus; complexity: TaskComplexity } {
  const match = tasks.find((t) => t.id === planTaskId || t.subject === planTaskId);
  if (match) {
    return { status: match.status, complexity: match.complexity };
  }
  return { status: "pending", complexity: "simple" };
}

function getMilestoneCompletionStats(
  milestone: PlanMilestone,
  tasks: Task[],
): { completed: number; total: number } {
  const total = milestone.tasks.length;
  const milestoneTasks = tasks.filter((t) => t.milestoneId === milestone.id);

  if (milestoneTasks.length > 0) {
    const completed = milestoneTasks.filter((t) => t.status === "completed").length;
    return { completed, total: Math.max(total, milestoneTasks.length) };
  }

  return { completed: 0, total };
}

function getMilestoneStatus(
  milestone: PlanMilestone,
  tasks: Task[],
): TaskStatus {
  const milestoneTasks = tasks.filter((t) => t.milestoneId === milestone.id);
  if (milestoneTasks.length === 0) return "pending";

  const allCompleted = milestoneTasks.every((t) => t.status === "completed");
  if (allCompleted) return "completed";

  const anyInProgress = milestoneTasks.some((t) => t.status === "in_progress");
  if (anyInProgress) return "in_progress";

  const anyBlocked = milestoneTasks.some((t) => t.status === "blocked");
  if (anyBlocked) return "blocked";

  return "pending";
}

function PlanTreeSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <div className="ml-6 space-y-1">
            <Skeleton className="h-8 w-[90%]" />
            <Skeleton className="h-8 w-[85%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MilestoneNode({
  milestone,
  tasks,
}: {
  milestone: PlanMilestone;
  tasks: Task[];
}) {
  const [expanded, setExpanded] = useState(true);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const stats = getMilestoneCompletionStats(milestone, tasks);
  const milestoneStatus = getMilestoneStatus(milestone, tasks);

  return (
    <div className="space-y-1">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/50"
      >
        <motion.div
          initial={false}
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
        <MilestoneIcon className={cn(
          "h-4 w-4 shrink-0",
          milestoneStatus === "completed" && "text-green-500",
          milestoneStatus === "in_progress" && "text-blue-500",
          milestoneStatus === "blocked" && "text-red-500",
          milestoneStatus === "pending" && "text-gray-400",
        )} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {milestone.title}
        </span>
      </button>

      <div className="ml-9">
        <ProgressBar completed={stats.completed} total={stats.total} />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pt-1">
              {milestone.tasks.map((planTask) => {
                const matchedTask = tasks.find(
                  (t) => t.id === planTask.id || t.subject === planTask.title,
                );
                const status = matchedTask?.status ?? "pending";
                const complexity = matchedTask?.complexity ?? (planTask.complexity === "complex" ? "complex" : "simple");

                return (
                  <PlanItem
                    key={planTask.id}
                    title={planTask.title}
                    status={status}
                    complexity={complexity}
                    indented
                  />
                );
              })}
              {milestone.tasks.length === 0 && (
                <p className="ml-6 py-2 text-xs text-muted-foreground">
                  No tasks in this milestone
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PlanTree({ projectId }: PlanTreeProps) {
  const { data: plan, isLoading: planLoading, error: planError } = usePlan(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(projectId);

  const isLoading = planLoading || tasksLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanTreeSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (planError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load plan. The project may not have a plan yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!plan || !plan.content?.milestones?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No plan available for this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const milestones = plan.content.milestones;
  const orderedMilestones = plan.content.milestoneOrder?.length
    ? plan.content.milestoneOrder
        .map((id) => milestones.find((m) => m.id === id))
        .filter(Boolean) as typeof milestones
    : milestones;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-1">
            {orderedMilestones.map((milestone, idx) => (
              <div key={milestone.id}>
                {idx > 0 && <Separator className="my-2" />}
                <MilestoneNode milestone={milestone} tasks={tasks} />
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
