import { NextResponse } from "next/server";
import { initializeDb, getDb, withRetry } from "@/lib/db";
import { getProject } from "@/lib/projects/manager";
import { generateId } from "@/lib/utils/id";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;

    const db = getDb();
    const plan = db
      .prepare(
        "SELECT * FROM plans WHERE project_id = ? ORDER BY version DESC LIMIT 1",
      )
      .get(projectId) as Record<string, unknown> | undefined;

    if (!plan) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: plan.id,
      projectId: plan.project_id,
      version: plan.version,
      content: plan.content ? JSON.parse(plan.content as string) : null,
      status: plan.status,
      createdAt: plan.created_at,
      approvedAt: plan.approved_at,
    });
  } catch (error) {
    console.error("Failed to get plan:", error);
    return NextResponse.json(
      { error: "Failed to get plan" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    const body = await request.json();

    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const db = getDb();

    // Get current version
    const current = db
      .prepare(
        "SELECT MAX(version) as max_version FROM plans WHERE project_id = ?",
      )
      .get(projectId) as { max_version: number | null } | undefined;

    const version = (current?.max_version || 0) + 1;
    const id = generateId();

    withRetry(() => {
      db.prepare(
        `INSERT INTO plans (id, project_id, version, content, status, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      ).run(id, projectId, version, JSON.stringify(body.content), body.status || "draft");
    });

    return NextResponse.json({
      id,
      projectId,
      version,
      content: body.content,
      status: body.status || "draft",
    });
  } catch (error) {
    console.error("Failed to save plan:", error);
    return NextResponse.json(
      { error: "Failed to save plan" },
      { status: 500 },
    );
  }
}
