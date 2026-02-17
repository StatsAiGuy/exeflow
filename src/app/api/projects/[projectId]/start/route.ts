import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { startProject } from "@/lib/engine/manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;

    const result = await startProject(projectId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({ status: "started" });
  } catch (error) {
    console.error("Failed to start project:", error);
    return NextResponse.json(
      { error: "Failed to start execution loop" },
      { status: 500 },
    );
  }
}
