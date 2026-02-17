import type { AgentRole } from "@/types/agent";
import type { ModelConfig, ModelId, ModelShorthand } from "@/types/project";
import { DEFAULT_MODEL_CONFIG, MODEL_MAP } from "@/types/project";

export function getModelForRole(
  role: AgentRole,
  config?: ModelConfig | null,
  complexity?: "simple" | "complex",
): ModelId {
  const effectiveConfig = config || DEFAULT_MODEL_CONFIG;

  switch (role) {
    case "lead":
      return effectiveConfig.lead;
    case "researcher":
      return effectiveConfig.researcher;
    case "executor":
      return complexity === "complex"
        ? effectiveConfig.executorComplex
        : effectiveConfig.executorRoutine;
    case "reviewer":
      return effectiveConfig.reviewer;
    case "tester":
      return effectiveConfig.tester;
    case "security":
      return effectiveConfig.security;
    case "planner":
      return effectiveConfig.lead; // Planner uses same model as lead
    case "proposer":
      return effectiveConfig.reviewer; // Proposer uses same model as reviewer
    default:
      return effectiveConfig.executorRoutine;
  }
}

export function resolveModelShorthand(shorthand: ModelShorthand): ModelId {
  return MODEL_MAP[shorthand];
}

export function getModelDisplayName(modelId: ModelId): string {
  if (modelId.includes("opus")) return "Opus";
  if (modelId.includes("sonnet")) return "Sonnet";
  if (modelId.includes("haiku")) return "Haiku";
  return modelId;
}
