import { spawnAgent } from "@/lib/claude/sdk";
import { getModelForRole } from "@/lib/engine/model-delegator";
import type { MachineCapabilities } from "@/lib/system/capability-scanner";
import { getCapabilitiesSummary } from "./machine-analyzer";

export interface SetupRecommendation {
  recommendations: Array<{
    category: string;
    item: string;
    reason: string;
    priority: "essential" | "recommended" | "optional";
  }>;
  mcpServers: Array<{
    name: string;
    package: string;
    description: string;
    essential: boolean;
  }>;
  warnings: string[];
}

export async function researchOptimalSetup(
  capabilities: MachineCapabilities,
): Promise<SetupRecommendation | null> {
  const capsSummary = getCapabilitiesSummary(capabilities);

  const prompt = `You are a setup research agent for exeflow (autonomous vibecoding platform).

## Machine Specs
${capsSummary}

## Instructions
Research the optimal vibecoding setup for this machine:
1. Recommended MCPs for general development (Context7, Playwright, GitHub, etc.)
2. Environment optimizations for this OS/hardware
3. Any warnings about limitations (low RAM, missing tools, etc.)

Output ONLY valid JSON with: recommendations array, mcpServers array, warnings array.`;

  const result = await spawnAgent({
    role: "researcher",
    phase: "plan",
    model: getModelForRole("researcher"),
    prompt,
    cwd: process.cwd(),
    maxTurns: 10,
    allowedTools: ["WebSearch", "WebFetch"],
    projectId: "global",
  });

  if (result.status === "failed" || !result.output) {
    return null;
  }

  return result.output as SetupRecommendation;
}
