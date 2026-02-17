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

    const agents = db
      .prepare("SELECT * FROM agents WHERE project_id = ? ORDER BY created_at DESC")
      .all(projectId);

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Failed to list agents:", error);
    return NextResponse.json(
      { error: "Failed to list agents" },
      { status: 500 },
    );
  }
}
