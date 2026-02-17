import { spawnAgent } from "@/lib/claude/sdk";
import { getModelForRole } from "@/lib/engine/model-delegator";
import { ResearchResultSchema } from "@/lib/claude/output-schemas";
import { getCapabilitiesSummary, getCachedCapabilities } from "./machine-analyzer";
import type { ProjectStack } from "@/types/project";
import fs from "fs";
import path from "path";
import { getLearningDir } from "@/lib/claude/paths";

export interface StackResearchResult {
  stack: ProjectStack;
  connections: Array<{
    name: string;
    mcpPackage: string;
    whyNeeded: string;
    score: number;
    alternatives: string[];
  }>;
  modelRecommendation: {
    executorComplex: string;
    executorRoutine: string;
    reasoning: string;
  };
  risks: string[];
  estimatedComplexity: string;
}

export async function researchStack(
  projectDescription: string,
  projectType: string,
  projectId: string,
): Promise<StackResearchResult | null> {
  const caps = getCachedCapabilities();
  const capsSummary = caps ? getCapabilitiesSummary(caps) : "Machine specs not available";

  // Load learnings from same project type
  const learnings = loadLearnings(projectType);

  const prompt = buildResearcherPrompt(projectDescription, projectType, capsSummary, learnings);

  const result = await spawnAgent({
    role: "researcher",
    phase: "plan",
    model: getModelForRole("researcher"),
    prompt,
    cwd: process.cwd(),
    maxTurns: 15,
    allowedTools: ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
    outputSchema: ResearchResultSchema,
    projectId,
  });

  if (result.status === "failed" || !result.output) {
    return null;
  }

  return result.output as StackResearchResult;
}

function loadLearnings(projectType: string): string {
  try {
    const learningPath = path.join(getLearningDir(projectType), "patterns.json");
    if (fs.existsSync(learningPath)) {
      const data = JSON.parse(fs.readFileSync(learningPath, "utf8"));
      return JSON.stringify(data, null, 2);
    }
  } catch {
    // No learnings available
  }
  return "No previous learnings for this project type.";
}

function buildResearcherPrompt(
  description: string,
  projectType: string,
  machineSpecs: string,
  learnings: string,
): string {
  return `You are a technology research agent for an exeflow project.

## Project Idea
${description}

## Project Type
${projectType}

## Machine Specs
${machineSpecs}

## Learnings from Similar Projects
${learnings}

## Instructions
1. Use WebSearch to find current best practices for this type of project
2. Evaluate frameworks, databases, auth solutions, and deployment options
3. For MCP connections: search for relevant MCP servers
4. Provide clear recommendations with trade-offs explained
5. Do NOT install anything — only research and recommend

Output ONLY valid JSON matching the research result schema.`;
}
