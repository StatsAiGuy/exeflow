import { getDb } from "@/lib/db";

/**
 * In-process MCP server for exeflow.
 *
 * Exposes internal tools that agents can call during their sessions:
 * - exeflow_status: Query current project state, cycle, phase
 * - exeflow_checkpoint: Request a user checkpoint with question and options
 *
 * This server is passed to agent sessions via createSdkMcpServer() from the Agent SDK,
 * running in the same process with zero IPC overhead.
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolCallResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export const EXEFLOW_MCP_TOOLS: McpTool[] = [
  {
    name: "exeflow_status",
    description:
      "Get the current project status including cycle number, active phase, milestone progress, and recent events.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "The project ID to query status for",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "exeflow_checkpoint",
    description:
      "Request a user checkpoint — pauses execution and asks the user a question. Use when you need human input for an architectural decision, approval, or clarification.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "The project ID",
        },
        checkpoint_type: {
          type: "string",
          enum: ["clarification", "approval", "decision"],
          description: "Type of checkpoint",
        },
        question: {
          type: "string",
          description: "The question to ask the user",
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of choices for the user",
        },
        context: {
          type: "string",
          description: "Supporting context for the user",
        },
      },
      required: ["project_id", "checkpoint_type", "question"],
    },
  },
];

/**
 * Handle an MCP tool call from an agent session.
 */
export function handleToolCall(
  toolName: string,
  input: Record<string, unknown>,
): McpToolCallResult {
  switch (toolName) {
    case "exeflow_status":
      return handleStatus(input.project_id as string);
    case "exeflow_checkpoint":
      return handleCheckpoint(input);
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}

function handleStatus(projectId: string): McpToolCallResult {
  try {
    const db = getDb();

    const project = db
      .prepare(
        "SELECT id, name, status, stack, model_config FROM projects WHERE id = ?",
      )
      .get(projectId) as Record<string, unknown> | undefined;

    if (!project) {
      return {
        content: [{ type: "text", text: `Project not found: ${projectId}` }],
        isError: true,
      };
    }

    // Get latest cycle
    const cycle = db
      .prepare(
        `SELECT cycle_number, phase, status FROM execution_cycles
         WHERE project_id = ? ORDER BY started_at DESC LIMIT 1`,
      )
      .get(projectId) as Record<string, unknown> | undefined;

    // Get milestone progress
    const milestones = db
      .prepare(
        `SELECT status, COUNT(*) as count FROM milestones
         WHERE project_id = ? GROUP BY status`,
      )
      .all(projectId) as Array<{ status: string; count: number }>;

    // Get pending checkpoints
    const pendingCheckpoints = db
      .prepare(
        `SELECT COUNT(*) as count FROM checkpoints
         WHERE project_id = ? AND status = 'pending'`,
      )
      .get(projectId) as { count: number };

    // Get active agents
    const activeAgents = db
      .prepare(
        `SELECT COUNT(*) as count FROM agents
         WHERE project_id = ? AND status = 'running'`,
      )
      .get(projectId) as { count: number };

    const status = {
      project: {
        name: project.name,
        status: project.status,
      },
      cycle: cycle
        ? {
            number: cycle.cycle_number,
            phase: cycle.phase,
            status: cycle.status,
          }
        : null,
      milestones: Object.fromEntries(
        milestones.map((m) => [m.status, m.count]),
      ),
      pendingCheckpoints: pendingCheckpoints.count,
      activeAgents: activeAgents.count,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error querying status: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

function handleCheckpoint(input: Record<string, unknown>): McpToolCallResult {
  try {
    const db = getDb();
    const { generateId } = require("@/lib/utils/id") as { generateId: () => string };

    const checkpointId = generateId();

    db.prepare(
      `INSERT INTO checkpoints (id, project_id, type, question, context, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
    ).run(
      checkpointId,
      input.project_id as string,
      input.checkpoint_type as string,
      input.question as string,
      JSON.stringify({
        options: input.options || [],
        context: input.context || "",
      }),
    );

    // Emit event for SSE
    const { eventBus } = require("@/lib/events/emitter") as {
      eventBus: { emit: (type: string, projectId: string, data: unknown) => void };
    };
    eventBus.emit("checkpoint_created", input.project_id as string, {
      checkpointId,
      type: input.checkpoint_type,
      question: input.question,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            checkpoint_id: checkpointId,
            status: "pending",
            message:
              "Checkpoint created. Execution will pause until the user responds.",
          }),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating checkpoint: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Create the MCP server configuration object for use with the Agent SDK.
 *
 * Usage with Agent SDK:
 *   import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
 *   const mcpConfig = createSdkMcpServer(createExeflowMcpServerImpl());
 */
export function getExeflowMcpConfig() {
  return {
    tools: EXEFLOW_MCP_TOOLS,
    handleToolCall,
  };
}
