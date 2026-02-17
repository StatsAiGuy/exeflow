"use client";

import { cn } from "@/lib/utils";

type Status = "running" | "paused" | "stopped" | "complete" | "setup" | "planning" | "error";

const statusConfig: Record<Status, { color: string; label: string; pulse?: boolean }> = {
  running: { color: "bg-green-500", label: "Running", pulse: true },
  paused: { color: "bg-yellow-500", label: "Paused" },
  stopped: { color: "bg-gray-500", label: "Stopped" },
  complete: { color: "bg-blue-500", label: "Complete" },
  setup: { color: "bg-purple-500", label: "Setup" },
  planning: { color: "bg-orange-500", label: "Planning", pulse: true },
  error: { color: "bg-red-500", label: "Error" },
};

interface StatusBadgeProps {
  status: string;
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({ status, showLabel = true, className }: StatusBadgeProps) {
  const config = statusConfig[status as Status] || {
    color: "bg-gray-400",
    label: status,
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              config.color,
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            config.color,
          )}
        />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">
          {config.label}
        </span>
      )}
    </div>
  );
}
