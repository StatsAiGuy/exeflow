import { getDb } from "@/lib/db";

export interface VerificationResult {
  verified: boolean;
  hallucinations: HallucinationReport[];
}

export interface HallucinationReport {
  claim: string;
  type: "fabricated_file" | "fabricated_tool_output" | "false_test_claim" | "missing_action";
  evidence: string;
}

/**
 * Verify agent claims against the verified action log.
 * Compares what the agent says it did vs what the tool calls actually show.
 */
export function verifyAgentActions(
  sessionId: string,
  agentClaims: AgentClaims,
): VerificationResult {
  const db = getDb();

  const actions = db
    .prepare(
      `SELECT tool_name, tool_input_json, tool_output_json, verified
       FROM agent_actions
       WHERE session_id = ?
       ORDER BY timestamp ASC`,
    )
    .all(sessionId) as Array<{
    tool_name: string;
    tool_input_json: string;
    tool_output_json: string | null;
    verified: number;
  }>;

  const hallucinations: HallucinationReport[] = [];

  // Check files_created claims
  if (agentClaims.filesCreated) {
    const writeActions = actions
      .filter((a) => a.tool_name === "Write" || a.tool_name === "Edit")
      .map((a) => {
        try {
          const input = JSON.parse(a.tool_input_json);
          return (input.file_path || input.filePath || "") as string;
        } catch {
          return "";
        }
      })
      .filter(Boolean);

    for (const claimed of agentClaims.filesCreated) {
      const found = writeActions.some(
        (actual) => actual.endsWith(claimed) || claimed.endsWith(actual),
      );
      if (!found) {
        hallucinations.push({
          claim: `Created file: ${claimed}`,
          type: "fabricated_file",
          evidence: `No Write/Edit tool call found targeting "${claimed}". Write actions targeted: ${writeActions.join(", ") || "none"}`,
        });
      }
    }
  }

  // Check files_modified claims
  if (agentClaims.filesModified) {
    const editActions = actions
      .filter((a) => a.tool_name === "Edit")
      .map((a) => {
        try {
          const input = JSON.parse(a.tool_input_json);
          return (input.file_path || input.filePath || "") as string;
        } catch {
          return "";
        }
      })
      .filter(Boolean);

    for (const claimed of agentClaims.filesModified) {
      const found = editActions.some(
        (actual) => actual.endsWith(claimed) || claimed.endsWith(actual),
      );
      if (!found) {
        hallucinations.push({
          claim: `Modified file: ${claimed}`,
          type: "fabricated_file",
          evidence: `No Edit tool call found targeting "${claimed}". Edit actions targeted: ${editActions.join(", ") || "none"}`,
        });
      }
    }
  }

  // Check test pass claims
  if (agentClaims.testsPassing !== undefined) {
    const bashActions = actions.filter((a) => a.tool_name === "Bash");
    const testRuns = bashActions.filter((a) => {
      try {
        const input = JSON.parse(a.tool_input_json);
        const cmd = (input.command || "") as string;
        return cmd.includes("npm test") || cmd.includes("vitest") || cmd.includes("jest");
      } catch {
        return false;
      }
    });

    if (testRuns.length === 0 && agentClaims.testsPassing) {
      hallucinations.push({
        claim: "Tests passing",
        type: "false_test_claim",
        evidence: "Agent claimed tests pass but no test command was executed",
      });
    }

    // Check if test output indicates failure while agent claims pass
    for (const run of testRuns) {
      if (run.tool_output_json && agentClaims.testsPassing) {
        try {
          const output = JSON.parse(run.tool_output_json) as string;
          if (output.includes("FAIL") || output.includes("failed") || output.includes("Error")) {
            hallucinations.push({
              claim: "Tests passing",
              type: "false_test_claim",
              evidence: `Test output contains failure indicators but agent claimed tests pass`,
            });
            break;
          }
        } catch {
          // non-JSON output, skip
        }
      }
    }
  }

  return {
    verified: hallucinations.length === 0,
    hallucinations,
  };
}

/**
 * Record a verified tool action from an agent session.
 */
export function recordAction(
  sessionId: string,
  projectId: string,
  toolName: string,
  toolInput: Record<string, unknown>,
  toolOutput?: unknown,
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO agent_actions (session_id, project_id, tool_name, tool_input_json, tool_output_json, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    projectId,
    toolName,
    JSON.stringify(toolInput),
    toolOutput !== undefined ? JSON.stringify(toolOutput) : null,
    Date.now(),
  );
}

export interface AgentClaims {
  filesCreated?: string[];
  filesModified?: string[];
  testsPassing?: boolean;
  testsAdded?: number;
  summary?: string;
}

/**
 * Parse agent claims from a structured agent result or free-text summary.
 */
export function parseAgentClaims(agentOutput: unknown): AgentClaims {
  if (!agentOutput || typeof agentOutput !== "object") {
    return {};
  }

  const output = agentOutput as Record<string, unknown>;
  return {
    filesCreated: Array.isArray(output.files_created)
      ? (output.files_created as string[])
      : undefined,
    filesModified: Array.isArray(output.files_modified)
      ? (output.files_modified as string[])
      : undefined,
    testsPassing:
      typeof output.tests_passing === "boolean" ? output.tests_passing : undefined,
    testsAdded:
      typeof output.tests_added === "number" ? output.tests_added : undefined,
    summary: typeof output.summary === "string" ? output.summary : undefined,
  };
}
