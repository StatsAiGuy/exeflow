"use client";

import {
  Circle,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskComplexity } from "@/types/task";

type ItemStatus = TaskStatus | "skipped";

const statusIconMap: Record<ItemStatus, { icon: React.ElementType; className: string }> = {
  pending: { icon: Circle, className: "text-gray-400" },
  in_progress: { icon: Loader2, className: "text-blue-500 animate-spin" },
  completed: { icon: CheckCircle, className: "text-green-500" },
  blocked: { icon: AlertCircle, className: "text-red-500" },
  skipped: { icon: Clock, className: "text-gray-400" },
};

const statusLabelMap: Record<ItemStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  blocked: { label: "Blocked", variant: "destructive" },
  skipped: { label: "Skipped", variant: "outline" },
};

const complexityConfig: Record<TaskComplexity, { label: string; className: string }> = {
  simple: { label: "Simple", className: "border-green-500/30 text-green-600 dark:text-green-400" },
  medium: { label: "Medium", className: "border-yellow-500/30 text-yellow-600 dark:text-yellow-400" },
  complex: { label: "Complex", className: "border-red-500/30 text-red-600 dark:text-red-400" },
};

interface PlanItemProps {
  title: string;
  status: ItemStatus;
  complexity?: TaskComplexity;
  indented?: boolean;
  className?: string;
}

export function PlanItem({
  title,
  status,
  complexity,
  indented = false,
  className,
}: PlanItemProps) {
  const iconConfig = statusIconMap[status] || statusIconMap.pending;
  const labelConfig = statusLabelMap[status] || statusLabelMap.pending;
  const Icon = iconConfig.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50",
        indented && "ml-6",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", iconConfig.className)} />
      <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
      <div className="flex items-center gap-2">
        {complexity && (
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", complexityConfig[complexity]?.className)}
          >
            {complexityConfig[complexity]?.label}
          </Badge>
        )}
        <Badge variant={labelConfig.variant} className="text-[10px] px-1.5 py-0">
          {labelConfig.label}
        </Badge>
      </div>
    </div>
  );
}
