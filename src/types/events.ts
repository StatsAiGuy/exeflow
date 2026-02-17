export type EventType =
  | "project_created"
  | "project_started"
  | "project_paused"
  | "project_resumed"
  | "project_stopped"
  | "project_completed"
  | "cycle_started"
  | "cycle_completed"
  | "phase_started"
  | "phase_completed"
  | "agent_spawned"
  | "agent_completed"
  | "agent_failed"
  | "agent_init"
  | "agent_streaming"
  | "agent_text"
  | "agent_task_started"
  | "agent_task_notification"
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "checkpoint_created"
  | "checkpoint_answered"
  | "tool_call"
  | "tool_progress"
  | "error"
  | "warning"
  | "milestone_completed"
  | "notification"
  | "orchestrator_state_changed";

export interface ExeflowEvent {
  id: number;
  projectId: string | null;
  eventType: EventType;
  agentId: string | null;
  data: Record<string, unknown> | null;
  timestamp: string;
}

export type CheckpointType = "clarification" | "approval" | "review" | "decision";
export type CheckpointStatus = "pending" | "answered" | "dismissed";

export interface Checkpoint {
  id: string;
  projectId: string;
  cycleId: string | null;
  agentId: string | null;
  type: CheckpointType;
  question: string;
  context: Record<string, unknown> | null;
  response: string | null;
  status: CheckpointStatus;
  createdAt: string;
  answeredAt: string | null;
}

export type ChatMessageRole = "user" | "agent" | "system";
export type ChatMessageType =
  | "text"
  | "checkpoint"
  | "file_change"
  | "tool_activity"
  | "error";

export interface ChatMessage {
  id: string;
  projectId: string;
  role: ChatMessageRole;
  content: string;
  messageType: ChatMessageType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type OrchestratorState =
  | "initializing"
  | "researching"
  | "planning"
  | "executing"
  | "reviewing"
  | "testing"
  | "proposing"
  | "checkpoint"
  | "completed"
  | "abandoned"
  | "paused_user_requested"
  | "paused_awaiting_input"
  | "paused_loop_detected"
  | "paused_error"
  | "paused_network";

export type ExecutionCycleStatus = "running" | "completed" | "paused" | "failed";

export interface ExecutionCycle {
  id: string;
  projectId: string;
  planId: string | null;
  cycleNumber: number;
  phase: string;
  status: ExecutionCycleStatus;
  startedAt: string;
  completedAt: string | null;
  summary: string | null;
}

export type NotificationLevel = "info" | "warning" | "error" | "critical";

export interface Notification {
  id: string;
  projectId: string;
  level: NotificationLevel;
  title: string;
  message: string;
  actionRequired: boolean;
  actionUrl: string | null;
  dismissed: boolean;
  createdAt: string;
}
