"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/types/project";

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch("/api/projects");
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      projectType: string;
    }) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProjectAction(projectId: string) {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/start`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start project");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/pause`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to pause project");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/resume`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to resume project");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/stop`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to stop project");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  return {
    start: startMutation,
    pause: pauseMutation,
    resume: resumeMutation,
    stop: stopMutation,
  };
}
