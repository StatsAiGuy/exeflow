"use client";

import { useQuery } from "@tanstack/react-query";
import type { Plan } from "@/types/plan";

interface PlanApiResponse {
  id: string;
  project_id: string;
  version: number;
  content: string;
  status: string;
  created_at: string;
  approved_at: string | null;
}

function transformPlan(raw: PlanApiResponse): Plan {
  let content;
  try {
    content = typeof raw.content === "string" ? JSON.parse(raw.content) : raw.content;
  } catch {
    content = { milestones: [], milestoneOrder: [] };
  }

  return {
    id: raw.id,
    projectId: raw.project_id,
    version: raw.version,
    content,
    status: raw.status as Plan["status"],
    createdAt: raw.created_at,
    approvedAt: raw.approved_at,
  };
}

async function fetchPlan(projectId: string): Promise<Plan> {
  const res = await fetch(`/api/projects/${projectId}/plan`);
  if (!res.ok) throw new Error("Failed to fetch plan");
  const data = await res.json();
  return transformPlan(data);
}

export function usePlan(projectId: string | null) {
  return useQuery({
    queryKey: ["plan", projectId],
    queryFn: () => fetchPlan(projectId!),
    enabled: !!projectId,
  });
}
