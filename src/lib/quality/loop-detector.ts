import { getDb } from "@/lib/db";

export type LoopType = "oscillation" | "no_progress" | "same_error";

export interface LoopDetectionResult {
  detected: boolean;
  type: LoopType | null;
  evidence: string | null;
}

export function detectLoop(projectId: string): LoopDetectionResult {
  const db = getDb();

  const recentPhases = db
    .prepare(
      `SELECT phase_name, task_description, file_changes_hash, outcome, review_score
       FROM phase_history
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT 6`,
    )
    .all(projectId) as Array<{
    phase_name: string;
    task_description: string;
    file_changes_hash: string | null;
    outcome: string;
    review_score: number | null;
  }>;

  if (recentPhases.length < 3) {
    return { detected: false, type: null, evidence: null };
  }

  // Oscillation: same file-change hash appearing 2+ times
  const hashes = recentPhases
    .map((p) => p.file_changes_hash)
    .filter((h): h is string => h !== null);
  const hashCounts = new Map<string, number>();
  for (const hash of hashes) {
    hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
  }
  for (const [hash, count] of hashCounts) {
    if (count >= 2) {
      return {
        detected: true,
        type: "oscillation",
        evidence: `File change hash "${hash.slice(0, 8)}..." appeared ${count} times in last 6 phases`,
      };
    }
  }

  // No progress: 3+ consecutive phase rejections/failures
  const recentOutcomes = recentPhases.slice(0, 3).map((p) => p.outcome);
  if (recentOutcomes.every((o) => o === "failure")) {
    return {
      detected: true,
      type: "no_progress",
      evidence: `Last 3 phases all failed: ${recentPhases
        .slice(0, 3)
        .map((p) => p.phase_name)
        .join(", ")}`,
    };
  }

  // Same error: same task description failing repeatedly
  const failedTasks = recentPhases
    .filter((p) => p.outcome === "failure")
    .map((p) => p.task_description);
  const taskCounts = new Map<string, number>();
  for (const task of failedTasks) {
    taskCounts.set(task, (taskCounts.get(task) || 0) + 1);
  }
  for (const [task, count] of taskCounts) {
    if (count >= 2) {
      return {
        detected: true,
        type: "same_error",
        evidence: `Task "${task.slice(0, 50)}..." failed ${count} times`,
      };
    }
  }

  return { detected: false, type: null, evidence: null };
}
