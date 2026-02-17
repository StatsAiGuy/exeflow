"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Notification {
  id: string;
  project_id: string;
  level: string;
  title: string;
  message: string;
  action_required: number;
  action_url: string | null;
  dismissed: number;
  created_at: string;
}

export function useNotifications(projectId?: string) {
  return useQuery<Notification[]>({
    queryKey: ["notifications", projectId],
    queryFn: async () => {
      const params = new URLSearchParams({ undismissed: "true" });
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!res.ok) throw new Error("Failed to dismiss");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
