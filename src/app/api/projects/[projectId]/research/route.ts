import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { getProject, updateProject } from "@/lib/projects/manager";
import { researchStack } from "@/lib/research/stack-researcher";
import { researchConnections } from "@/lib/research/connection-researcher";
import { getDefaultModelConfig } from "@/lib/research/model-researcher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    const project = getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    // Research stack
    const stackResult = await researchStack(
      project.description,
      project.projectType,
      projectId,
    );

    // Research connections (use stack description if available)
    const stackDesc = stackResult
      ? JSON.stringify(stackResult.stack)
      : "Not yet determined";
    const connectionResult = await researchConnections(
      project.description,
      project.projectType,
      stackDesc,
      projectId,
    );

    // Get default model config
    const { config: modelConfig } = getDefaultModelConfig();

    // Update project with research results
    if (stackResult) {
      updateProject(projectId, {
        stack: stackResult.stack,
        modelConfig,
      });
    }

    return NextResponse.json({
      stack: stackResult,
      connections: connectionResult,
      modelConfig,
    });
  } catch (error) {
    console.error("Research failed:", error);
    return NextResponse.json(
      { error: "Failed to research project" },
      { status: 500 },
    );
  }
}
