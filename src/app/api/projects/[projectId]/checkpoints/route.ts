import { NextResponse } from "next/server";
import { initializeDb, getDb } from "@/lib/db";

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
    await params;
    const db = getDb();
    const body = await request.json();

    const { checkpointId, response } = body;

    if (!checkpointId || !response) {
      return NextResponse.json(
        { error: "checkpointId and response are required" },
        { status: 400 },
      );
    }

    db.prepare(
      `UPDATE checkpoints SET response = ?, status = 'answered', answered_at = datetime('now') WHERE id = ?`,
    ).run(response, checkpointId);

    return NextResponse.json({ status: "answered" });
  } catch (error) {
    console.error("Failed to answer checkpoint:", error);
    return NextResponse.json(
      { error: "Failed to answer checkpoint" },
      { status: 500 },
    );
  }
}
