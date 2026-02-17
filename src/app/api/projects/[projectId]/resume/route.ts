import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { resumeProject } from "@/lib/engine/manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    const result = await resumeProject(projectId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({ status: "resumed" });
  } catch (error) {
    console.error("Failed to resume:", error);
    return NextResponse.json(
      { error: "Failed to resume execution loop" },
      { status: 500 },
    );
  }
}
