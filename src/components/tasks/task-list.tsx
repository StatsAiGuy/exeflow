"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Circle,
  CheckCircle,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTasks } from "@/lib/hooks/use-tasks";
import { TaskDetail } from "./task-detail";
import type { Task, TaskStatus, TaskComplexity } from "@/types/task";

interface TaskListProps {
  projectId: string;
}

const statusGroups: {
  key: TaskStatus;
  label: string;
  icon: React.ElementType;
  iconClass: string;
}[] = [
  { key: "in_progress", label: "In Progress", icon: Loader2, iconClass: "text-blue-500" },
  { key: "pending", label: "Pending", icon: Circle, iconClass: "text-gray-400" },
  { key: "blocked", label: "Blocked", icon: AlertCircle, iconClass: "text-red-500" },
  { key: "completed", label: "Completed", icon: CheckCircle, iconClass: "text-green-500" },
];

const complexityConfig: Record<TaskComplexity, { label: string; className: string }> = {
  simple: { label: "Simple", className: "border-green-500/30 text-green-600 dark:text-green-400" },
  medium: { label: "Medium", className: "border-yellow-500/30 text-yellow-600 dark:text-yellow-400" },
  complex: { label: "Complex", className: "border-red-500/30 text-red-600 dark:text-red-400" },
};

const statusBadgeConfig: Record<TaskStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  blocked: { label: "Blocked", variant: "destructive" },
  skipped: { label: "Skipped", variant: "outline" },
};

function TaskListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <div className="space-y-1.5">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const statusBadge = statusBadgeConfig[task.status] || statusBadgeConfig.pending;
  const complexity = complexityConfig[task.complexity];

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug">{task.subject}</h4>
        <Badge variant={statusBadge.variant} className="shrink-0 text-[10px] px-1.5 py-0">
          {statusBadge.label}
        </Badge>
      </div>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {complexity && (
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", complexity.className)}>
            {complexity.label}
          </Badge>
        )}
        {task.agentId && (
          <span className="text-[10px] text-muted-foreground">
            Agent: {task.agentId}
          </span>
        )}
      </div>
    </motion.button>
  );
}

function StatusGroup({
  groupConfig,
  tasks,
  onTaskClick,
}: {
  groupConfig: (typeof statusGroups)[number];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  if (tasks.length === 0) return null;

  const Icon = groupConfig.icon;

  return (
    <div className="space-y-2">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
      >
        <motion.div
          initial={false}
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            groupConfig.iconClass,
            groupConfig.key === "in_progress" && "animate-spin",
          )}
        />
        <span className="text-sm font-medium">{groupConfig.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
          {tasks.length}
        </Badge>
      </button>

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
            <div className="space-y-1.5 pl-6">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TaskList({ projectId }: TaskListProps) {
  const { data: tasks = [], isLoading, error } = useTasks(projectId);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  }, []);

  const handleDetailClose = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      // Delay clearing the task to let the sheet animate out
      setTimeout(() => setSelectedTask(null), 300);
    }
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      blocked: [],
      skipped: [],
    };

    for (const task of tasks) {
      const bucket = groups[task.status];
      if (bucket) {
        bucket.push(task);
      } else {
        groups.pending.push(task);
      }
    }

    return groups;
  }, [tasks]);

  const dependencies = useMemo(() => {
    if (!selectedTask) return [];
    // Find tasks that the selected task depends on (if any dependency data exists)
    return [];
  }, [selectedTask]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskListSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load tasks.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tasks available for this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Tasks
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-1">
              {statusGroups.map((group, idx) => {
                const groupTasks = grouped[group.key] || [];
                if (groupTasks.length === 0) return null;
                return (
                  <div key={group.key}>
                    {idx > 0 && grouped[statusGroups[idx - 1]?.key]?.length > 0 && (
                      <Separator className="my-3" />
                    )}
                    <StatusGroup
                      groupConfig={group}
                      tasks={groupTasks}
                      onTaskClick={handleTaskClick}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <TaskDetail
        task={selectedTask}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        dependencies={dependencies}
      />
    </>
  );
}
