import { spawnAgent } from "@/lib/claude/sdk";
import { getModelForRole } from "@/lib/engine/model-delegator";

export interface ConnectionRecommendation {
  name: string;
  mcpPackage: string;
  whyNeeded: string;
  score: number;
  alternatives: string[];
  credentialFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    sensitive: boolean;
    required: boolean;
    helpUrl?: string;
  }>;
}

export async function researchConnections(
  projectDescription: string,
  projectType: string,
  stackDescription: string,
  projectId: string,
): Promise<ConnectionRecommendation[]> {
  const prompt = `You are a connection research agent. Recommend MCP servers for this project.

## Project
${projectDescription}

## Project Type
${projectType}

## Tech Stack
${stackDescription}

## Instructions
1. Search registry.modelcontextprotocol.io and smithery.ai for relevant MCP servers
2. Evaluate each server: relevance (0-30), reliability (0-25), popularity (0-20), setup complexity (0-15)
3. Recommend servers scoring >= 60
4. For each, specify the required credentials

Output ONLY valid JSON: an array of connection recommendations.`;

  const result = await spawnAgent({
    role: "researcher",
    phase: "plan",
    model: getModelForRole("researcher"),
    prompt,
    cwd: process.cwd(),
    maxTurns: 10,
    allowedTools: ["WebSearch", "WebFetch", "Read"],
    projectId,
  });

  if (result.status === "failed" || !result.output) {
    return [];
  }

  try {
    const output = result.output as { connections?: ConnectionRecommendation[] } | ConnectionRecommendation[];
    return Array.isArray(output) ? output : (output.connections || []);
  } catch {
    return [];
  }
}
