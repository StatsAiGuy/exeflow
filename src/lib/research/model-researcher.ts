import type { ModelConfig } from "@/types/project";
import { DEFAULT_MODEL_CONFIG } from "@/types/project";

export interface ModelResearchResult {
  config: ModelConfig;
  reasoning: string;
}

export function getDefaultModelConfig(): ModelResearchResult {
  return {
    config: DEFAULT_MODEL_CONFIG,
    reasoning:
      "Default Haiku+Opus strategy: Opus for complex tasks requiring deep reasoning (lead, complex execution), Haiku for routine tasks (simple execution, review, testing), Sonnet for research and security review.",
  };
}

export function adjustModelConfig(
  baseConfig: ModelConfig,
  projectComplexity: string,
): ModelConfig {
  // For highly complex projects, upgrade more roles to Opus
  if (projectComplexity === "high") {
    return {
      ...baseConfig,
      executorRoutine: "claude-sonnet-4-5-20250929", // Upgrade routine to Sonnet
      reviewer: "claude-sonnet-4-5-20250929",        // Upgrade reviewer to Sonnet
    };
  }

  // For simple projects, use more Haiku
  if (projectComplexity === "low") {
    return {
      ...baseConfig,
      executorComplex: "claude-sonnet-4-5-20250929", // Downgrade complex to Sonnet
      researcher: "claude-haiku-4-5-20251001",       // Downgrade researcher to Haiku
    };
  }

  return baseConfig;
}
