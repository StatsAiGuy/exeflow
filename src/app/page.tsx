"use client";

import { Header } from "@/components/layout/header";
import { ProjectGrid } from "@/components/dashboard/project-grid";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { useProjects } from "@/lib/hooks/use-projects";

export default function DashboardPage() {
  const { data: projects } = useProjects();

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />
      <div className="space-y-6 p-6">
        {projects && projects.length > 0 && <StatsBar projects={projects} />}
        <ProjectGrid />
      </div>
    </div>
  );
}
