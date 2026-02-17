import { getDb, withRetry } from "@/lib/db";
import { generateId } from "@/lib/utils/id";
import { eventBus } from "@/lib/events/emitter";
import type { Checkpoint, CheckpointType } from "@/types/events";

export function createCheckpoint(
  projectId: string,
  type: CheckpointType,
  question: string,
  context?: Record<string, unknown>,
  cycleId?: string,
  agentId?: string,
): Checkpoint {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  const checkpoint: Checkpoint = {
    id,
    projectId,
    cycleId: cycleId || null,
    agentId: agentId || null,
    type,
    question,
    context: context || null,
    response: null,
    status: "pending",
    createdAt: now,
    answeredAt: null,
  };

  withRetry(() => {
    db.prepare(
      `INSERT INTO checkpoints (id, project_id, cycle_id, agent_id, type, question, context, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    ).run(
      id,
      projectId,
      checkpoint.cycleId,
      checkpoint.agentId,
      type,
      question,
      context ? JSON.stringify(context) : null,
      now,
    );
  });

  eventBus.emit("checkpoint_created", projectId, {
    checkpointId: id,
    type,
    question,
  });

  return checkpoint;
}

export function answerCheckpoint(
  checkpointId: string,
  response: string,
): Checkpoint | null {
  const db = getDb();
  const now = new Date().toISOString();

  withRetry(() => {
    db.prepare(
      `UPDATE checkpoints SET response = ?, status = 'answered', answered_at = ? WHERE id = ?`,
    ).run(response, now, checkpointId);
  });

  const row = db
    .prepare("SELECT * FROM checkpoints WHERE id = ?")
    .get(checkpointId) as CheckpointRow | undefined;

  if (!row) return null;

  const checkpoint = rowToCheckpoint(row);

  eventBus.emit("checkpoint_answered", checkpoint.projectId, {
    checkpointId,
    response,
  });

  return checkpoint;
}

export function getPendingCheckpoints(projectId: string): Checkpoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM checkpoints WHERE project_id = ? AND status = 'pending' ORDER BY created_at ASC",
    )
    .all(projectId) as CheckpointRow[];
  return rows.map(rowToCheckpoint);
}

export function getCheckpoint(id: string): Checkpoint | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM checkpoints WHERE id = ?")
    .get(id) as CheckpointRow | undefined;
  if (!row) return null;
  return rowToCheckpoint(row);
}

interface CheckpointRow {
  id: string;
  project_id: string;
  cycle_id: string | null;
  agent_id: string | null;
  type: string;
  question: string;
  context: string | null;
  response: string | null;
  status: string;
  created_at: string;
  answered_at: string | null;
}

function rowToCheckpoint(row: CheckpointRow): Checkpoint {
  return {
    id: row.id,
    projectId: row.project_id,
    cycleId: row.cycle_id,
    agentId: row.agent_id,
    type: row.type as CheckpointType,
    question: row.question,
    context: row.context ? JSON.parse(row.context) : null,
    response: row.response,
    status: row.status as Checkpoint["status"],
    createdAt: row.created_at,
    answeredAt: row.answered_at,
  };
}
