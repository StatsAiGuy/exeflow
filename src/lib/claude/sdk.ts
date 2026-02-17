import type { AgentSpawnOptions, AgentResult } from "@/types/agent";
import { getDb } from "@/lib/db";
import { generateId } from "@/lib/utils/id";
import { eventBus } from "@/lib/events/emitter";
import { enforceExeflowPermissions } from "./permissions";

// The actual Claude Agent SDK will be imported once @anthropic-ai/claude-agent-sdk is installed.
// For now, this is the typed wrapper interface that the orchestrator calls.

export interface SdkSession {
  agentId: string;
  sessionId: string | null;
  abort: () => void;
}

export interface SdkStreamEvent {
  type: "system" | "assistant" | "result";
  subtype?: string;
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  checkpointId?: string;
  modelUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  result?: unknown;
}

const DEFAULT_ALLOWED_TOOLS = [
  "Skill",
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "Task",
  "NotebookEdit",
];

export async function spawnAgent(options: AgentSpawnOptions): Promise<AgentResult> {
  const agentId = generateId();
  const startTime = Date.now();

  // Record agent in database
  const db = getDb();
  db.prepare(
    `INSERT INTO agents (id, project_id, cycle_id, parent_agent_id, role, model, status, prompt_summary, started_at)
     VALUES (?, ?, ?, ?, ?, ?, 'running', ?, datetime('now'))`,
  ).run(
    agentId,
    options.projectId,
    options.cycleId || null,
    options.parentAgentId || null,
    options.role,
    options.model,
    options.prompt.slice(0, 500),
  );

  eventBus.emit("agent_spawned", options.projectId, {
    agentId,
    role: options.role,
    model: options.model,
    phase: options.phase,
  });

  try {
    // TODO: Replace with actual Claude Agent SDK call when @anthropic-ai/claude-agent-sdk is installed
    // const { query, createSdkMcpServer } = await import("@anthropic-ai/claude-agent-sdk");
    //
    // const session = query({
    //   prompt: options.prompt,
    //   options: {
    //     model: options.model,
    //     cwd: options.cwd,
    //     systemPrompt: { type: "preset", preset: "claude_code" },
    //     settingSources: ["user", "project", "local"],
    //     plugins: [
    //       { type: "local", path: ".claude/plugins/everything-claude-code" },
    //     ],
    //     permissionMode: "bypassPermissions",
    //     ...(options.outputSchema && {
    //       outputFormat: {
    //         type: "json_schema" as const,
    //         schema: options.outputSchema,
    //       },
    //     }),
    //     enableFileCheckpointing: true,
    //     fallbackModel: "claude-haiku-4-5-20251001",
    //     canUseTool: (toolName: string, toolInput: Record<string, unknown>) =>
    //       enforceExeflowPermissions(toolName, toolInput, options.cwd),
    //     allowedTools: options.allowedTools ?? DEFAULT_ALLOWED_TOOLS,
    //     maxTurns: options.maxTurns,
    //     mcpServers: options.mcpServers,
    //   },
    //   abortController: new AbortController(),
    // });
    //
    // let fileCheckpointId: string | null = null;
    // let result: unknown = null;
    // let tokensInput = 0;
    // let tokensOutput = 0;
    //
    // for await (const message of session) {
    //   if (message.type === "assistant" && message.subtype === "file_checkpoint") {
    //     fileCheckpointId = message.checkpointId;
    //   }
    //   if (message.type === "result") {
    //     result = message.result;
    //     tokensInput = message.modelUsage?.inputTokens ?? 0;
    //     tokensOutput = message.modelUsage?.outputTokens ?? 0;
    //   }
    // }

    // Placeholder result until SDK is integrated
    const result: AgentResult = {
      agentId,
      sessionId: null,
      status: "completed",
      output: null,
      tokensInput: 0,
      tokensOutput: 0,
      duration: Date.now() - startTime,
      fileCheckpointId: null,
    };

    // Update agent record
    db.prepare(
      `UPDATE agents SET status = 'completed', tokens_input = ?, tokens_output = ?,
       completed_at = datetime('now'), result_summary = ?
       WHERE id = ?`,
    ).run(result.tokensInput, result.tokensOutput, JSON.stringify(result.output)?.slice(0, 1000), agentId);

    eventBus.emit("agent_completed", options.projectId, {
      agentId,
      role: options.role,
      duration: result.duration,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
    });

    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    db.prepare(
      `UPDATE agents SET status = 'failed', completed_at = datetime('now'),
       result_summary = ? WHERE id = ?`,
    ).run(errMsg.slice(0, 1000), agentId);

    eventBus.emit("agent_failed", options.projectId, {
      agentId,
      role: options.role,
      error: errMsg,
    });

    return {
      agentId,
      sessionId: null,
      status: "failed",
      output: { error: errMsg },
      tokensInput: 0,
      tokensOutput: 0,
      duration: Date.now() - startTime,
      fileCheckpointId: null,
    };
  }
}
