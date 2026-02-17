import { NextResponse } from "next/server";
import { initializeDb, getDb } from "@/lib/db";
import { answerCheckpoint } from "@/lib/engine/checkpoint";
import { resumeProject } from "@/lib/engine/manager";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    const db = getDb();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const query = status
      ? `SELECT * FROM checkpoints WHERE project_id = ? AND status = ? ORDER BY created_at DESC`
      : `SELECT * FROM checkpoints WHERE project_id = ? ORDER BY created_at DESC`;

    const params_arr = status ? [projectId, status] : [projectId];
    const checkpoints = db.prepare(query).all(...params_arr);

    return NextResponse.json(checkpoints);
  } catch (error) {
    console.error("Failed to list checkpoints:", error);
    return NextResponse.json(
      { error: "Failed to list checkpoints" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    const body = await request.json();

    // Accept both frontend format (action + reason) and direct response format
    const { checkpointId, action, reason, response } = body;

    if (!checkpointId) {
      return NextResponse.json(
        { error: "checkpointId is required" },
        { status: 400 },
      );
    }

    // Build the response string from the action/reason or direct response
    let responseText: string;
    if (response) {
      responseText = response;
    } else if (action === "approve") {
      responseText = reason ? `Approved: ${reason}` : "Approved";
    } else if (action === "reject") {
      responseText = `REJECTED: ${reason || "No reason provided"}`;
    } else if (action === "edit") {
      responseText = reason || "User provided edits";
    } else {
      responseText = reason || action || "Acknowledged";
    }

    // Use the proper answerCheckpoint function (updates DB + emits events)
    const checkpoint = answerCheckpoint(checkpointId, responseText);
    if (!checkpoint) {
      return NextResponse.json(
        { error: "Checkpoint not found" },
        { status: 404 },
      );
    }

    // Auto-resume the project after answering a checkpoint
    // The orchestrator is paused at paused_awaiting_input and needs to restart
    const db = getDb();
    const project = db.prepare("SELECT status FROM projects WHERE id = ?").get(projectId) as { status: string } | undefined;
    if (project?.status === "paused") {
      await resumeProject(projectId);
    }

    return NextResponse.json({ status: "answered", checkpoint });
  } catch (error) {
    console.error("Failed to answer checkpoint:", error);
    return NextResponse.json(
      { error: "Failed to answer checkpoint" },
      { status: 500 },
    );
  }
}
