export type ProjectStatus =
  | "setup"
  | "planning"
  | "running"
  | "paused"
  | "stopped"
  | "complete";

export interface Project {
  id: string;
  name: string;
  description: string;
  projectType: string;
  status: ProjectStatus;
  projectPath: string;
  stack: ProjectStack | null;
  connections: string | null;
  modelConfig: ModelConfig | null;
  gitRepo: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ProjectStack {
  framework: { choice: string; version?: string; reasoning: string };
  database?: { choice: string; reasoning: string };
  auth?: { choice: string; reasoning: string };
  deployment?: { choice: string; reasoning: string };
  styling?: { choice: string; reasoning: string };
}

export interface ModelConfig {
  executorComplex: ModelId;
  executorRoutine: ModelId;
  reviewer: ModelId;
  tester: ModelId;
  researcher: ModelId;
  security: ModelId;
  lead: ModelId;
}

export type ModelId =
  | "claude-opus-4-6"
  | "claude-sonnet-4-5-20250929"
  | "claude-haiku-4-5-20251001";

export type ModelShorthand = "opus" | "sonnet" | "haiku";

export const MODEL_MAP: Record<ModelShorthand, ModelId> = {
  opus: "claude-opus-4-6",
  sonnet: "claude-sonnet-4-5-20250929",
  haiku: "claude-haiku-4-5-20251001",
};

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  lead: "claude-opus-4-6",
  executorComplex: "claude-opus-4-6",
  executorRoutine: "claude-haiku-4-5-20251001",
  reviewer: "claude-haiku-4-5-20251001",
  tester: "claude-haiku-4-5-20251001",
  researcher: "claude-sonnet-4-5-20250929",
  security: "claude-sonnet-4-5-20250929",
};
