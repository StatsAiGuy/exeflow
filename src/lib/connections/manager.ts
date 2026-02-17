import { getDb, withRetry } from "@/lib/db";
import { generateId } from "@/lib/utils/id";
import type { Connection, ConnectionStatus } from "@/types/connection";

export function addConnection(
  projectId: string | null,
  name: string,
  type: "mcp" | "builtin",
  config: object,
): Connection {
  const db = getDb();
  const id = generateId();

  withRetry(() => {
    db.prepare(
      `INSERT INTO connections (id, project_id, name, type, config, status, installed_at)
       VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))`,
    ).run(id, projectId, name, type, JSON.stringify(config));
  });

  return {
    id,
    projectId,
    name,
    type,
    config: config as Connection["config"],
    status: "active",
    installedAt: new Date().toISOString(),
  };
}

export function getConnections(projectId?: string | null): Connection[] {
  const db = getDb();
  const query = projectId
    ? "SELECT * FROM connections WHERE project_id = ? OR project_id IS NULL ORDER BY name"
    : "SELECT * FROM connections ORDER BY name";
  const params = projectId ? [projectId] : [];

  const rows = db.prepare(query).all(...params) as ConnectionRow[];
  return rows.map(rowToConnection);
}

export function getConnection(id: string): Connection | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM connections WHERE id = ?").get(id) as ConnectionRow | undefined;
  if (!row) return null;
  return rowToConnection(row);
}

export function updateConnectionStatus(id: string, status: ConnectionStatus): void {
  const db = getDb();
  db.prepare("UPDATE connections SET status = ? WHERE id = ?").run(status, id);
}

export function removeConnection(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM connections WHERE id = ?").run(id);
  return result.changes > 0;
}

interface ConnectionRow {
  id: string;
  project_id: string | null;
  name: string;
  type: string;
  config: string;
  status: string;
  installed_at: string;
}

function rowToConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    type: row.type as Connection["type"],
    config: JSON.parse(row.config),
    status: row.status as ConnectionStatus,
    installedAt: row.installed_at,
  };
}
