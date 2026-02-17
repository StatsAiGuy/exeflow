"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ChatMessage } from "@/types/events";
import { useSSE } from "@/lib/hooks/use-sse";

async function fetchChatMessages(projectId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/projects/${projectId}/chat`);
  if (!res.ok) throw new Error("Failed to fetch chat messages");
  return res.json();
}

async function sendChatMessage(
  projectId: string,
  content: string,
): Promise<ChatMessage> {
  const res = await fetch(`/api/projects/${projectId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

async function answerCheckpoint(
  projectId: string,
  checkpointId: string,
  action: "approve" | "reject" | "edit",
  reason?: string,
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/checkpoints`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checkpointId, action, reason }),
  });
  if (!res.ok) throw new Error("Failed to answer checkpoint");
}

export function useChatMessages(projectId: string | null) {
  const queryClient = useQueryClient();
  const { events } = useSSE(projectId);

  // Refetch messages when new SSE events arrive that are chat-related
  const lastEventId = events.length > 0 ? events[events.length - 1].id : null;

  return useQuery({
    queryKey: ["chat-messages", projectId, lastEventId],
    queryFn: () => fetchChatMessages(projectId!),
    enabled: !!projectId,
    refetchInterval: false,
  });
}

export function useSendMessage(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!projectId) throw new Error("No project selected");
      return sendChatMessage(projectId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", projectId],
      });
    },
  });
}

export function useAnswerCheckpoint(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checkpointId,
      action,
      reason,
    }: {
      checkpointId: string;
      action: "approve" | "reject" | "edit";
      reason?: string;
    }) => {
      if (!projectId) throw new Error("No project selected");
      return answerCheckpoint(projectId, checkpointId, action, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", projectId],
      });
    },
  });
}

export function useChat(projectId: string | null) {
  const messages = useChatMessages(projectId);
  const sendMessage = useSendMessage(projectId);
  const answerCheckpointMutation = useAnswerCheckpoint(projectId);

  const send = useCallback(
    (content: string) => {
      if (content.trim()) {
        sendMessage.mutate(content.trim());
      }
    },
    [sendMessage],
  );

  return {
    messages: messages.data ?? [],
    isLoading: messages.isLoading,
    isError: messages.isError,
    error: messages.error,
    send,
    isSending: sendMessage.isPending,
    answerCheckpoint: answerCheckpointMutation.mutate,
    isAnswering: answerCheckpointMutation.isPending,
  };
}
