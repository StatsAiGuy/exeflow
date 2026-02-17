import { NextResponse } from "next/server";
import { initializeDb, getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    initializeDb();
    const db = getDb();

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const undismissedOnly = url.searchParams.get("undismissed") === "true";

    let query = "SELECT * FROM notifications";
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (projectId) {
      conditions.push("project_id = ?");
      params.push(projectId);
    }
    if (undismissedOnly) {
      conditions.push("dismissed = 0");
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY created_at DESC LIMIT 100";

    const notifications = db.prepare(query).all(...params);
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Failed to list notifications:", error);
    return NextResponse.json(
      { error: "Failed to list notifications" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    initializeDb();
    const db = getDb();
    const body = await request.json();

    const { notificationId, dismissed } = body;
    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 },
      );
    }

    db.prepare(
      `UPDATE notifications SET dismissed = ? WHERE id = ?`,
    ).run(dismissed ? 1 : 0, notificationId);

    return NextResponse.json({ status: "updated" });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}
