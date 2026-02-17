export type AgentRole =
  | "lead"
  | "researcher"
  | "executor"
  | "reviewer"
  | "tester"
  | "security"
  | "planner"
  | "proposer";

export type AgentStatus = "running" | "completed" | "failed" | "waiting";

export interface Agent {
  id: string;
  projectId: string;
  cycleId: string | null;
  parentAgentId: string | null;
  role: AgentRole;
  model: string;
  claudeSessionId: string | null;
  status: AgentStatus;
  promptSummary: string | null;
  resultSummary: string | null;
  tokensInput: number;
  tokensOutput: number;
  startedAt: string;
  completedAt: string | null;
}

export interface AgentSpawnOptions {
  role: AgentRole;
  phase: Phase;
  model: string;
  prompt: string;
  cwd: string;
  allowedTools?: string[];
  maxTurns?: number;
  mcpServers?: Record<string, McpServerConfig>;
  outputSchema?: object;
  projectId: string;
  cycleId?: string;
  parentAgentId?: string;
}

export interface McpServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export type Phase = "plan" | "execute" | "review" | "test" | "propose";

export interface AgentResult {
  agentId: string;
  sessionId: string | null;
  status: AgentStatus;
  output: unknown;
  tokensInput: number;
  tokensOutput: number;
  duration: number;
  fileCheckpointId: string | null;
}
