import {
  query,
  type SDKMessage,
  type SDKResultSuccess,
  type SDKResultError,
  type SDKAssistantMessage,
  type McpServerConfig as SdkMcpServerConfig,
  type PermissionResult,
} from "@anthropic-ai/claude-agent-sdk";
import type { AgentSpawnOptions, AgentResult } from "@/types/agent";
import { getDb } from "@/lib/db";
import { generateId } from "@/lib/utils/id";
import { eventBus } from "@/lib/events/emitter";
import { enforceExeflowPermissions } from "./permissions";
import { getExeflowMcpServer } from "./mcp-server";

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

/**
 * Spawn a Claude Code agent session via the Agent SDK.
 *
 * This is the core function that powers all agent execution in exeflow.
 * It calls the real Claude Agent SDK's query() function, streams events,
 * and captures structured output.
 */
export async function spawnAgent(
  options: AgentSpawnOptions,
): Promise<AgentResult> {
  const agentId = generateId();
  const startTime = Date.now();
  const abortController = new AbortController();

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
    // Build MCP server config merging project MCPs + exeflow internal MCP
    const mcpServers: Record<string, SdkMcpServerConfig> = {};

    // Add project-specific MCP servers (Supabase, Vercel, etc.)
    if (options.mcpServers) {
      for (const [name, config] of Object.entries(options.mcpServers)) {
        if (config.url) {
          mcpServers[name] = { type: "http", url: config.url };
        } else if (config.command) {
          mcpServers[name] = {
            command: config.command,
            args: config.args,
            env: config.env,
          };
        }
      }
    }

    // Add exeflow's in-process MCP server
    mcpServers["exeflow-internal"] = getExeflowMcpServer();

    // Spawn the real Claude Code session
    const session = query({
      prompt: options.prompt,
      options: {
        model: options.model,
        cwd: options.cwd,

        // Full Claude Code system prompt + CLAUDE.md loading
        systemPrompt: { type: "preset", preset: "claude_code" },
        settingSources: ["user", "project", "local"],

        // Automation mode — no interactive permission prompts
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,

        // Structured output: guarantees valid JSON matching schema
        ...(options.outputSchema && {
          outputFormat: {
            type: "json_schema" as const,
            schema: options.outputSchema,
          },
        }),

        // File checkpointing for rollback on failure
        enableFileCheckpointing: true,

        // Model failover
        fallbackModel: "claude-haiku-4-5-20251001",

        // Programmatic permission enforcement
        canUseTool: async (
          toolName: string,
          toolInput: Record<string, unknown>,
        ): Promise<PermissionResult> => {
          return enforceExeflowPermissions(toolName, toolInput, options.cwd);
        },

        // Tool access
        allowedTools: options.allowedTools ?? DEFAULT_ALLOWED_TOOLS,

        // Turn limit
        maxTurns: options.maxTurns,

        // MCP servers
        mcpServers,

        // Don't persist session to disk (we track everything in our own DB)
        persistSession: false,

        // Stream partial messages for real-time UI updates
        includePartialMessages: true,

        // Abort controller for cancellation
        abortController,
      },
    });

    // Iterate the async generator: process events, store in DB, emit to SSE
    let sessionId: string | null = null;
    let fileCheckpointId: string | null = null;
    let resultOutput: unknown = null;
    let structuredOutput: unknown = null;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let numTurns = 0;
    let resultStatus: "completed" | "failed" = "completed";
    let errorMessages: string[] = [];

    for await (const message of session) {
      // Capture session ID from first message
      if ("session_id" in message && message.session_id && !sessionId) {
        sessionId = message.session_id;
      }

      switch (message.type) {
        case "system": {
          handleSystemMessage(message, options.projectId, agentId);
          break;
        }

        case "assistant": {
          handleAssistantMessage(
            message as SDKAssistantMessage,
            options.projectId,
            agentId,
          );
          break;
        }

        case "tool_progress": {
          eventBus.emit("tool_progress", options.projectId, {
            agentId,
            toolName: message.tool_name,
            toolUseId: message.tool_use_id,
            elapsedSeconds: message.elapsed_time_seconds,
          });
          break;
        }

        case "stream_event": {
          // Partial assistant messages — for real-time streaming in chat
          eventBus.emit("agent_streaming", options.projectId, {
            agentId,
            event: message.event,
          });
          break;
        }

        case "result": {
          const resultMsg = message as SDKResultSuccess | SDKResultError;

          numTurns = resultMsg.num_turns;
          totalCostUsd = resultMsg.total_cost_usd;

          // Aggregate token usage from all models
          if (resultMsg.modelUsage) {
            for (const usage of Object.values(resultMsg.modelUsage)) {
              totalInputTokens += usage.inputTokens;
              totalOutputTokens += usage.outputTokens;
            }
          }

          if (resultMsg.subtype === "success") {
            const success = resultMsg as SDKResultSuccess;
            resultOutput = success.result;
            structuredOutput = success.structured_output ?? null;
          } else {
            const error = resultMsg as SDKResultError;
            resultStatus = "failed";
            errorMessages = error.errors || [];
            resultOutput = {
              error: error.subtype,
              errors: errorMessages,
              permissionDenials: error.permission_denials,
            };
          }
          break;
        }
      }
    }

    // Use structured_output if available (from outputFormat), otherwise raw result
    const finalOutput = structuredOutput ?? resultOutput;

    const result: AgentResult = {
      agentId,
      sessionId,
      status: resultStatus,
      output: finalOutput,
      tokensInput: totalInputTokens,
      tokensOutput: totalOutputTokens,
      duration: Date.now() - startTime,
      fileCheckpointId,
    };

    // Update agent record
    db.prepare(
      `UPDATE agents SET status = ?, tokens_input = ?, tokens_output = ?,
       claude_session_id = ?, completed_at = datetime('now'), result_summary = ?
       WHERE id = ?`,
    ).run(
      resultStatus,
      totalInputTokens,
      totalOutputTokens,
      sessionId,
      JSON.stringify(finalOutput)?.slice(0, 1000),
      agentId,
    );

    eventBus.emit("agent_completed", options.projectId, {
      agentId,
      role: options.role,
      status: resultStatus,
      duration: result.duration,
      tokensInput: totalInputTokens,
      tokensOutput: totalOutputTokens,
      costUsd: totalCostUsd,
      numTurns,
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

// --- Event handlers for different SDK message types ---

function handleSystemMessage(
  message: SDKMessage,
  projectId: string,
  agentId: string,
): void {
  if (!("subtype" in message)) return;

  switch (message.subtype) {
    case "init": {
      const initMsg = message as Extract<SDKMessage, { subtype: "init" }>;
      eventBus.emit("agent_init", projectId, {
        agentId,
        model: initMsg.model,
        tools: initMsg.tools,
        mcpServers: initMsg.mcp_servers,
        plugins: initMsg.plugins,
      });
      break;
    }
    case "task_started": {
      const taskMsg = message as Extract<
        SDKMessage,
        { subtype: "task_started" }
      >;
      eventBus.emit("agent_task_started", projectId, {
        agentId,
        taskId: taskMsg.task_id,
        description: taskMsg.description,
      });
      break;
    }
    case "task_notification": {
      const notifMsg = message as Extract<
        SDKMessage,
        { subtype: "task_notification" }
      >;
      eventBus.emit("agent_task_notification", projectId, {
        agentId,
        taskId: notifMsg.task_id,
        status: notifMsg.status,
        summary: notifMsg.summary,
      });
      break;
    }
  }
}

function handleAssistantMessage(
  message: SDKAssistantMessage,
  projectId: string,
  agentId: string,
): void {
  // Extract tool use information from the BetaMessage content blocks
  const betaMessage = message.message;
  if (!betaMessage?.content) return;

  for (const block of betaMessage.content) {
    if (block.type === "tool_use") {
      // Record tool call in DB
      const db = getDb();
      db.prepare(
        `INSERT INTO tool_calls (id, agent_id, project_id, tool_name, input_summary, success, timestamp)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
      ).run(
        generateId(),
        agentId,
        projectId,
        block.name,
        JSON.stringify(block.input).slice(0, 500),
      );

      eventBus.emit("tool_call", projectId, {
        agentId,
        toolName: block.name,
        toolUseId: block.id,
        input: block.input,
      });
    } else if (block.type === "text") {
      eventBus.emit("agent_text", projectId, {
        agentId,
        text: block.text,
        messageId: message.uuid,
      });
    }
  }
}
