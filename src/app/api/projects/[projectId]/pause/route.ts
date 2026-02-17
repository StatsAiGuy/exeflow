import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { pauseProject } from "@/lib/engine/manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    pauseProject(projectId);
    return NextResponse.json({ status: "paused" });
  } catch (error) {
    console.error("Failed to pause:", error);
    return NextResponse.json(
      { error: "Failed to pause execution loop" },
      { status: 500 },
    );
  }
}
