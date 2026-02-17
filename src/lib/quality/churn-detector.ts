import { getDb } from "@/lib/db";

export interface ChurnResult {
  churningFiles: ChurnedFile[];
  hasChurn: boolean;
}

export interface ChurnedFile {
  filePath: string;
  modifyCount: number;
  totalLinesChanged: number;
  netChange: number;
}

export function detectChurn(projectId: string, cycleId?: string): ChurnResult {
  const db = getDb();

  // Look at tool calls that modified files (Edit, Write) in this project
  const query = cycleId
    ? `SELECT input_summary FROM tool_calls
       WHERE project_id = ? AND tool_name IN ('Edit', 'Write')
       AND agent_id IN (SELECT id FROM agents WHERE cycle_id = ?)`
    : `SELECT input_summary FROM tool_calls
       WHERE project_id = ? AND tool_name IN ('Edit', 'Write')`;

  const params = cycleId ? [projectId, cycleId] : [projectId];
  const calls = db.prepare(query).all(...params) as Array<{
    input_summary: string | null;
  }>;

  // Count file modifications
  const fileCounts = new Map<string, number>();
  for (const call of calls) {
    if (!call.input_summary) continue;
    try {
      const parsed = JSON.parse(call.input_summary);
      const filePath = parsed.file_path || parsed.filePath;
      if (filePath) {
        fileCounts.set(filePath, (fileCounts.get(filePath) || 0) + 1);
      }
    } catch {
      // Not valid JSON, skip
    }
  }

  const churningFiles: ChurnedFile[] = [];
  for (const [filePath, count] of fileCounts) {
    if (count >= 3) {
      churningFiles.push({
        filePath,
        modifyCount: count,
        totalLinesChanged: 0, // Would need git blame for precise tracking
        netChange: 0,
      });
    }
  }

  return {
    churningFiles,
    hasChurn: churningFiles.length > 0,
  };
}
