import { NextResponse } from "next/server";
import { initializeDb, getDb } from "@/lib/db";
import { generateId } from "@/lib/utils/id";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;
    const db = getDb();

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const before = url.searchParams.get("before");

    const query = before
      ? `SELECT * FROM chat_messages WHERE project_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM chat_messages WHERE project_id = ? ORDER BY created_at DESC LIMIT ?`;

    const params_arr = before
      ? [projectId, before, limit]
      : [projectId, limit];

    const messages = db.prepare(query).all(...params_arr);

    // Return in chronological order
    return NextResponse.json((messages as unknown[]).reverse());
  } catch (error) {
    console.error("Failed to list chat messages:", error);
    return NextResponse.json(
      { error: "Failed to list chat messages" },
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
    const db = getDb();
    const body = await request.json();

    const { content, role = "user", messageType = "text", metadata } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const id = generateId();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO chat_messages (id, project_id, role, content, message_type, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      projectId,
      role,
      content,
      messageType,
      metadata ? JSON.stringify(metadata) : null,
      now,
    );

    const message = {
      id,
      projectId,
      role,
      content,
      messageType,
      metadata: metadata || null,
      createdAt: now,
    };

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Failed to create chat message:", error);
    return NextResponse.json(
      { error: "Failed to create chat message" },
      { status: 500 },
    );
  }
}
