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

    const tasks = db
      .prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC")
      .all(projectId);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to list tasks:", error);
    return NextResponse.json(
      { error: "Failed to list tasks" },
      { status: 500 },
    );
  }
}
