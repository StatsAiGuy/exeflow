import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { getProject } from "@/lib/projects/manager";
import {
  addConnection,
  getConnections,
  removeConnection,
} from "@/lib/connections/manager";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    const connections = getConnections(projectId);
    return NextResponse.json(connections);
  } catch (error) {
    console.error("Failed to get connections:", error);
    return NextResponse.json(
      { error: "Failed to get connections" },
      { status: 500 },
    );
  }
}

export async function POST(
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

    const connection = addConnection(
      projectId,
      body.name,
      body.type || "mcp",
      body.config || {},
    );
    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error("Failed to add connection:", error);
    return NextResponse.json(
      { error: "Failed to add connection" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    initializeDb();
    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId required" },
        { status: 400 },
      );
    }

    removeConnection(connectionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove connection:", error);
    return NextResponse.json(
      { error: "Failed to remove connection" },
      { status: 500 },
    );
  }
}
