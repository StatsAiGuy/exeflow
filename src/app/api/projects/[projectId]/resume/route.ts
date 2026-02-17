import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { resumeLoop } from "@/lib/engine/loop-controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    resumeLoop(projectId);
    return NextResponse.json({ status: "resumed" });
  } catch (error) {
    console.error("Failed to resume loop:", error);
    return NextResponse.json(
      { error: "Failed to resume execution loop" },
      { status: 500 },
    );
  }
}
