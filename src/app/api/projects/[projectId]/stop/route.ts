import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { stopProject } from "@/lib/engine/manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    stopProject(projectId);
    return NextResponse.json({ status: "stopped" });
  } catch (error) {
    console.error("Failed to stop:", error);
    return NextResponse.json(
      { error: "Failed to stop execution loop" },
      { status: 500 },
    );
  }
}
