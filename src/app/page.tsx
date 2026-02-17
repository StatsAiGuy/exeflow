"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ProjectGrid } from "@/components/dashboard/project-grid";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { useProjects } from "@/lib/hooks/use-projects";

export default function DashboardPage() {
  const router = useRouter();
  const { data: projects } = useProjects();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((res) => res.json())
      .then((data) => {
        if (!data.complete) {
          router.replace("/onboarding");
        } else {
          setCheckingOnboarding(false);
        }
      })
      .catch(() => {
        setCheckingOnboarding(false);
      });
  }, [router]);

  if (checkingOnboarding) {
    return (
      <div className="flex flex-col">
        <Header title="Dashboard" />
        <div className="flex items-center justify-center h-64">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

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
