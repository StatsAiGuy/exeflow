import { getDb, withRetry } from "@/lib/db";
import { eventBus } from "@/lib/events/emitter";
import type { OrchestratorState } from "@/types/events";

export interface LoopState {
  projectId: string;
  state: OrchestratorState;
  cycleNumber: number;
  planJson: string | null;
  contextJson: string | null;
  stuckTimerStart: number | null;
}

export function getLoopState(projectId: string): LoopState | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM orchestrator_state WHERE project_id = ?")
    .get(projectId) as OrchestratorStateRow | undefined;

  if (!row) return null;

  return {
    projectId: row.project_id,
    state: row.state as OrchestratorState,
    cycleNumber: row.cycle_number,
    planJson: row.plan_json,
    contextJson: row.context_json,
    stuckTimerStart: row.stuck_timer_start,
  };
}

export function setLoopState(
  projectId: string,
  state: OrchestratorState,
  updates?: Partial<Omit<LoopState, "projectId" | "state">>,
): void {
  const db = getDb();
  const existing = getLoopState(projectId);

  withRetry(() => {
    if (existing) {
      db.prepare(
        `UPDATE orchestrator_state
         SET state = ?, cycle_number = ?, plan_json = ?, context_json = ?, stuck_timer_start = ?, updated_at = ?
         WHERE project_id = ?`,
      ).run(
        state,
        updates?.cycleNumber ?? existing.cycleNumber,
        updates?.planJson ?? existing.planJson,
        updates?.contextJson ?? existing.contextJson,
        updates?.stuckTimerStart ?? existing.stuckTimerStart,
        Date.now(),
        projectId,
      );
    } else {
      db.prepare(
        `INSERT INTO orchestrator_state (project_id, state, cycle_number, plan_json, context_json, stuck_timer_start, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        projectId,
        state,
        updates?.cycleNumber ?? 0,
        updates?.planJson ?? null,
        updates?.contextJson ?? null,
        updates?.stuckTimerStart ?? null,
        Date.now(),
      );
    }
  });
}

export function startLoop(projectId: string): void {
  setLoopState(projectId, "initializing", { cycleNumber: 0 });
  eventBus.emit("project_started", projectId, { state: "initializing" });

  // Update project status
  const db = getDb();
  db.prepare("UPDATE projects SET status = 'running', updated_at = datetime('now') WHERE id = ?").run(projectId);
}

export function pauseLoop(projectId: string, reason: OrchestratorState = "paused_user_requested"): void {
  setLoopState(projectId, reason);
  eventBus.emit("project_paused", projectId, { reason });

  const db = getDb();
  db.prepare("UPDATE projects SET status = 'paused', updated_at = datetime('now') WHERE id = ?").run(projectId);
}

export function resumeLoop(projectId: string): void {
  const state = getLoopState(projectId);
  if (!state) return;

  // Resume to checkpoint state so orchestrator re-evaluates
  setLoopState(projectId, "checkpoint");
  eventBus.emit("project_resumed", projectId, {
    previousState: state.state,
  });

  const db = getDb();
  db.prepare("UPDATE projects SET status = 'running', updated_at = datetime('now') WHERE id = ?").run(projectId);
}

export function stopLoop(projectId: string): void {
  setLoopState(projectId, "abandoned");
  eventBus.emit("project_stopped", projectId, {});

  const db = getDb();
  db.prepare("UPDATE projects SET status = 'stopped', updated_at = datetime('now') WHERE id = ?").run(projectId);
}

export function completeLoop(projectId: string): void {
  setLoopState(projectId, "completed");
  eventBus.emit("project_completed", projectId, {});

  const db = getDb();
  db.prepare("UPDATE projects SET status = 'complete', updated_at = datetime('now') WHERE id = ?").run(projectId);
}

interface OrchestratorStateRow {
  project_id: string;
  state: string;
  cycle_number: number;
  plan_json: string | null;
  context_json: string | null;
  stuck_timer_start: number | null;
  updated_at: number;
}
