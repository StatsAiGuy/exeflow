import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { pauseLoop } from "@/lib/engine/loop-controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    pauseLoop(projectId);
    return NextResponse.json({ status: "paused" });
  } catch (error) {
    console.error("Failed to pause loop:", error);
    return NextResponse.json(
      { error: "Failed to pause execution loop" },
      { status: 500 },
    );
  }
}
