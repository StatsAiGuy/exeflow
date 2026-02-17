"use client";

import { useQuery } from "@tanstack/react-query";

export interface AgentSession {
  id: string;
  project_id: string;
  cycle_id: string | null;
  parent_agent_id: string | null;
  role: string;
  model: string;
  claude_session_id: string | null;
  status: string;
  prompt_summary: string | null;
  result_summary: string | null;
  tokens_input: number;
  tokens_output: number;
  started_at: string;
  completed_at: string | null;
}

export function useAgents(projectId: string | null) {
  return useQuery({
    queryKey: ["agents", projectId],
    queryFn: async (): Promise<AgentSession[]> => {
      const res = await fetch(`/api/projects/${projectId}/agents`);
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 5000,
  });
}
