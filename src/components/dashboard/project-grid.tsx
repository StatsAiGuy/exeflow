"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard } from "./project-card";
import { ProjectGridSkeleton } from "@/components/shared/skeleton-loader";
import { useProjects } from "@/lib/hooks/use-projects";

export function ProjectGrid() {
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) {
    return <ProjectGridSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">
          Failed to load projects. Is the database initialized?
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects?.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}

      {/* New Project Card */}
      <Link href="/projects/new">
        <Card className="flex min-h-[140px] cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-accent/50">
          <CardContent className="flex flex-col items-center gap-2 p-6">
            <Plus className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              New Project
            </span>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
