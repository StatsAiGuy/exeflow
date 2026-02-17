import { eventBus } from "@/lib/events/emitter";
import { getDb } from "@/lib/db";
import { generateId } from "@/lib/utils/id";
import type { ExeflowEvent, ChatMessageType } from "@/types/events";

/**
 * Chat bridge: Listens to event bus events and writes them as chat messages.
 *
 * This bridges the gap between the orchestration engine (which emits events)
 * and the chat panel UI (which displays chat_messages). Agent spawns, phase
 * transitions, tool calls, checkpoints, and errors all become visible in chat.
 */

let unsubscribe: (() => void) | null = null;

export function startChatBridge(): void {
  if (unsubscribe) return;

  unsubscribe = eventBus.onAll((event: ExeflowEvent) => {
    if (!event.projectId) return;

    const message = eventToChatMessage(event);
    if (!message) return;

    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO chat_messages (id, project_id, role, content, message_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        generateId(),
        event.projectId,
        message.role,
        message.content,
        message.messageType,
        message.metadata ? JSON.stringify(message.metadata) : null,
        event.timestamp,
      );
    } catch {
      // Don't let chat bridge errors block the engine
    }
  });
}

export function stopChatBridge(): void {
  unsubscribe?.();
  unsubscribe = null;
}

interface ChatEntry {
  role: "system" | "agent";
  content: string;
  messageType: ChatMessageType;
  metadata?: Record<string, unknown>;
}

function eventToChatMessage(event: ExeflowEvent): ChatEntry | null {
  const data = event.data ?? {};

  switch (event.eventType) {
    case "phase_started":
      return {
        role: "system",
        content: `Entering ${formatPhase(data.state as string)} phase...`,
        messageType: "text",
        metadata: { phase: data.state },
      };

    case "agent_spawned":
      return {
        role: "system",
        content: `Spawning ${formatRole(data.role as string)} (${formatModel(data.model as string)})`,
        messageType: "text",
        metadata: {
          agentId: data.agentId,
          role: data.role,
          model: data.model,
          phase: data.phase,
        },
      };

    case "agent_completed":
      return {
        role: "system",
        content: `${formatRole(data.role as string)} completed in ${formatDuration(data.duration as number)} (${data.tokensInput ?? 0} in / ${data.tokensOutput ?? 0} out tokens${data.costUsd ? `, $${(data.costUsd as number).toFixed(4)}` : ""})`,
        messageType: "text",
        metadata: {
          agentId: data.agentId,
          role: data.role,
          duration: data.duration,
          tokensInput: data.tokensInput,
          tokensOutput: data.tokensOutput,
        },
      };

    case "agent_failed":
      return {
        role: "system",
        content: `${formatRole(data.role as string)} failed: ${data.error}`,
        messageType: "error",
        metadata: {
          agentId: data.agentId,
          role: data.role,
          error: data.error,
        },
      };

    case "tool_call":
      return {
        role: "agent",
        content: `Using ${data.toolName}`,
        messageType: "tool_activity",
        metadata: {
          agentId: data.agentId,
          toolName: data.toolName,
          toolUseId: data.toolUseId,
        },
      };

    case "agent_text":
      return {
        role: "agent",
        content: (data.text as string) || "",
        messageType: "text",
        metadata: {
          agentId: data.agentId,
          messageId: data.messageId,
        },
      };

    case "checkpoint_created":
      return {
        role: "system",
        content: (data.question as string) || "Checkpoint needed",
        messageType: "checkpoint",
        metadata: {
          checkpointId: data.checkpointId,
          type: data.type,
        },
      };

    case "cycle_started":
      return {
        role: "system",
        content: `Cycle ${data.cycleNumber} started — ${formatPhase(data.phase as string)} phase`,
        messageType: "text",
        metadata: {
          cycleId: data.cycleId,
          cycleNumber: data.cycleNumber,
          phase: data.phase,
        },
      };

    case "milestone_completed":
      return {
        role: "system",
        content: `Milestone completed: ${data.title || "Milestone"}`,
        messageType: "text",
        metadata: { milestoneId: data.milestoneId },
      };

    case "error":
      return {
        role: "system",
        content: `Error: ${data.message || data.error || "Unknown error"}`,
        messageType: "error",
        metadata: data,
      };

    default:
      return null;
  }
}

// --- Formatting helpers ---

function formatPhase(phase: string): string {
  const map: Record<string, string> = {
    initializing: "Initializing",
    researching: "Research",
    planning: "Plan",
    executing: "Execute",
    reviewing: "Review",
    testing: "Test",
    proposing: "Propose",
    checkpoint: "Checkpoint",
  };
  return map[phase] || phase;
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    lead: "Lead Agent",
    researcher: "Researcher",
    executor: "Executor",
    reviewer: "Reviewer",
    tester: "Tester",
    security: "Security Reviewer",
    planner: "Planner",
    proposer: "Proposer",
  };
  return map[role] || role;
}

function formatModel(model: string): string {
  if (model.includes("opus")) return "Opus";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku")) return "Haiku";
  return model;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
