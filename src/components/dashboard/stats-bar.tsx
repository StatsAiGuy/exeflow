"use client";

import { FolderKanban, Bot, Zap, CheckCircle } from "lucide-react";
import { NumberTicker } from "@/components/shared/number-ticker";
import type { Project } from "@/types/project";

interface StatsBarProps {
  projects: Project[];
}

export function StatsBar({ projects }: StatsBarProps) {
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "running").length;
  const completedProjects = projects.filter((p) => p.status === "complete").length;

  const stats = [
    {
      label: "Total Projects",
      value: totalProjects,
      icon: FolderKanban,
    },
    {
      label: "Active",
      value: activeProjects,
      icon: Zap,
    },
    {
      label: "Completed",
      value: completedProjects,
      icon: CheckCircle,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
        >
          <stat.icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <NumberTicker
              value={stat.value}
              className="text-2xl font-bold text-foreground"
            />
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
