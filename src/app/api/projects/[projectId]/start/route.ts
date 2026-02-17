import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { startLoop } from "@/lib/engine/loop-controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    startLoop(projectId);
    return NextResponse.json({ status: "started" });
  } catch (error) {
    console.error("Failed to start loop:", error);
    return NextResponse.json(
      { error: "Failed to start execution loop" },
      { status: 500 },
    );
  }
}
