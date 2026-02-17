"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Loader2,
  FileCode,
  GitBranch,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus, TaskComplexity } from "@/types/task";

const statusConfig: Record<
  TaskStatus,
  { icon: React.ElementType; label: string; className: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { icon: Circle, label: "Pending", className: "text-gray-400", variant: "outline" },
  in_progress: { icon: Loader2, label: "In Progress", className: "text-blue-500", variant: "default" },
  completed: { icon: CheckCircle, label: "Completed", className: "text-green-500", variant: "secondary" },
  blocked: { icon: AlertCircle, label: "Blocked", className: "text-red-500", variant: "destructive" },
  skipped: { icon: Clock, label: "Skipped", className: "text-gray-400", variant: "outline" },
};

const complexityConfig: Record<TaskComplexity, { label: string; className: string }> = {
  simple: { label: "Simple", className: "border-green-500/30 text-green-600 dark:text-green-400" },
  medium: { label: "Medium", className: "border-yellow-500/30 text-yellow-600 dark:text-yellow-400" },
  complex: { label: "Complex", className: "border-red-500/30 text-red-600 dark:text-red-400" },
};

interface TaskDetailProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dependencies?: Task[];
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function TaskDetail({
  task,
  open,
  onOpenChange,
  dependencies = [],
}: TaskDetailProps) {
  if (!task) return null;

  const status = statusConfig[task.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const complexity = complexityConfig[task.complexity];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <StatusIcon
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                status.className,
                task.status === "in_progress" && "animate-spin",
              )}
            />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-snug">
                {task.subject}
              </SheetTitle>
              <SheetDescription className="mt-1">
                Task ID: {task.id}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {complexity && (
              <Badge variant="outline" className={complexity.className}>
                {complexity.label}
              </Badge>
            )}
            {task.priority > 0 && (
              <Badge variant="secondary">Priority: {task.priority}</Badge>
            )}
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 pb-6">
            {task.description && (
              <DetailSection title="Description">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {task.description}
                </p>
              </DetailSection>
            )}

            {task.agentId && (
              <DetailSection title="Assigned Agent">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{task.agentId}</span>
                </div>
              </DetailSection>
            )}

            {task.expectedFiles && task.expectedFiles.length > 0 && (
              <DetailSection title="Expected Files">
                <ul className="space-y-1">
                  {task.expectedFiles.map((file, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <code className="text-xs text-foreground">{file}</code>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}

            {dependencies.length > 0 && (
              <DetailSection title="Dependencies">
                <ul className="space-y-1.5">
                  {dependencies.map((dep) => {
                    const depStatus = statusConfig[dep.status] || statusConfig.pending;
                    const DepIcon = depStatus.icon;
                    return (
                      <li key={dep.id} className="flex items-center gap-2">
                        <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <DepIcon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            depStatus.className,
                            dep.status === "in_progress" && "animate-spin",
                          )}
                        />
                        <span className="truncate text-sm">{dep.subject}</span>
                      </li>
                    );
                  })}
                </ul>
              </DetailSection>
            )}

            <DetailSection title="Timeline">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Created{" "}
                    {formatDistanceToNow(new Date(task.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {task.updatedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Updated{" "}
                      {formatDistanceToNow(new Date(task.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
                {task.completedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    <span>
                      Completed{" "}
                      {formatDistanceToNow(new Date(task.completedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </DetailSection>

            {task.milestoneId && (
              <DetailSection title="Metadata">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Milestone: {task.milestoneId}</p>
                  {task.cycleId && <p>Cycle: {task.cycleId}</p>}
                </div>
              </DetailSection>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
