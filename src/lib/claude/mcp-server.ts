import { z } from "zod";
import {
  createSdkMcpServer,
  tool,
  type McpSdkServerConfigWithInstance,
} from "@anthropic-ai/claude-agent-sdk";
import { getDb } from "@/lib/db";
import { generateId } from "@/lib/utils/id";
import { eventBus } from "@/lib/events/emitter";

/**
 * In-process MCP server for exeflow.
 *
 * Exposes internal tools that agents can call during their sessions:
 * - exeflow_status: Query current project state, cycle, phase
 * - exeflow_checkpoint: Request a user checkpoint with question and options
 *
 * Uses the Agent SDK's createSdkMcpServer() for zero-IPC overhead.
 */

let cachedServer: McpSdkServerConfigWithInstance | null = null;

export function getExeflowMcpServer(): McpSdkServerConfigWithInstance {
  if (cachedServer) return cachedServer;

  cachedServer = createSdkMcpServer({
    name: "exeflow-internal",
    version: "1.0.0",
    tools: [
      tool(
        "exeflow_status",
        "Get the current project status including cycle number, active phase, milestone progress, and recent events.",
        {
          project_id: z.string().describe("The project ID to query status for"),
        },
        async (args) => {
          return handleStatus(args.project_id);
        },
      ),
      tool(
        "exeflow_checkpoint",
        "Request a user checkpoint — pauses execution and asks the user a question. Use when you need human input for an architectural decision, approval, or clarification.",
        {
          project_id: z.string().describe("The project ID"),
          checkpoint_type: z
            .enum(["clarification", "approval", "decision"])
            .describe("Type of checkpoint"),
          question: z.string().describe("The question to ask the user"),
          options: z
            .array(z.string())
            .optional()
            .describe("Optional list of choices for the user"),
          context: z
            .string()
            .optional()
            .describe("Supporting context for the user"),
        },
        async (args) => {
          return handleCheckpoint(args);
        },
      ),
    ],
  });

  return cachedServer;
}

// --- Tool Definitions for tests/backward-compat ---

export const EXEFLOW_MCP_TOOLS = [
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
 * Handle tool calls directly (for testing and non-SDK usage).
 */
export function handleToolCall(
  toolName: string,
  input: Record<string, unknown>,
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  switch (toolName) {
    case "exeflow_status": {
      const result = handleStatusSync(input.project_id as string);
      return result;
    }
    case "exeflow_checkpoint": {
      const result = handleCheckpointSync(input);
      return result;
    }
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
  }
}

// --- Async handlers for SDK MCP tools ---

async function handleStatus(
  projectId: string,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  return handleStatusSync(projectId);
}

async function handleCheckpoint(args: {
  project_id: string;
  checkpoint_type: "clarification" | "approval" | "decision";
  question: string;
  options?: string[];
  context?: string;
}): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  return handleCheckpointSync(args as Record<string, unknown>);
}

// --- Sync implementations ---

function handleStatusSync(
  projectId: string,
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
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

    const cycle = db
      .prepare(
        `SELECT cycle_number, phase, status FROM execution_cycles
         WHERE project_id = ? ORDER BY started_at DESC LIMIT 1`,
      )
      .get(projectId) as Record<string, unknown> | undefined;

    const milestones = db
      .prepare(
        `SELECT status, COUNT(*) as count FROM milestones
         WHERE project_id = ? GROUP BY status`,
      )
      .all(projectId) as Array<{ status: string; count: number }>;

    const pendingCheckpoints = db
      .prepare(
        `SELECT COUNT(*) as count FROM checkpoints
         WHERE project_id = ? AND status = 'pending'`,
      )
      .get(projectId) as { count: number };

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

function handleCheckpointSync(
  input: Record<string, unknown>,
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  try {
    const db = getDb();
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
