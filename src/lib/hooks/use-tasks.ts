"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types/task";

interface TaskApiResponse {
  id: string;
  project_id: string;
  milestone_id: string | null;
  cycle_id: string | null;
  agent_id: string | null;
  subject: string;
  description: string | null;
  status: string;
  priority: number;
  complexity: string;
  expected_files: string[] | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
}

function transformTask(raw: TaskApiResponse): Task {
  return {
    id: raw.id,
    projectId: raw.project_id,
    milestoneId: raw.milestone_id,
    cycleId: raw.cycle_id,
    agentId: raw.agent_id,
    subject: raw.subject,
    description: raw.description,
    status: raw.status as Task["status"],
    priority: raw.priority,
    complexity: raw.complexity as Task["complexity"],
    expectedFiles: raw.expected_files,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    completedAt: raw.completed_at,
  };
}

async function fetchTasks(projectId: string): Promise<Task[]> {
  const res = await fetch(`/api/projects/${projectId}/tasks`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const data: TaskApiResponse[] = await res.json();
  return data.map(transformTask);
}

async function fetchTask(projectId: string, taskId: string): Promise<Task> {
  const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`);
  if (!res.ok) throw new Error("Failed to fetch task");
  const data: TaskApiResponse = await res.json();
  return transformTask(data);
}

export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => fetchTasks(projectId!),
    enabled: !!projectId,
  });
}

export function useTask(projectId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ["task", projectId, taskId],
    queryFn: () => fetchTask(projectId!, taskId!),
    enabled: !!projectId && !!taskId,
  });
}

export function useUpdateTaskStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: Task["status"];
    }) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update task status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["plan", projectId] });
    },
  });
}
