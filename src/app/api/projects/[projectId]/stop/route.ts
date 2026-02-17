import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { stopLoop } from "@/lib/engine/loop-controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    stopLoop(projectId);
    return NextResponse.json({ status: "stopped" });
  } catch (error) {
    console.error("Failed to stop loop:", error);
    return NextResponse.json(
      { error: "Failed to stop execution loop" },
      { status: 500 },
    );
  }
}
