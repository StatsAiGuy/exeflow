import { getDb } from "@/lib/db";
import { answerCheckpoint } from "@/lib/engine/checkpoint";
import { pauseLoop, resumeLoop } from "@/lib/engine/loop-controller";
import {
  buildCheckpointEmbed,
  buildPhaseEmbed,
  type DiscordEmbed,
} from "./embeds";
import type { SlashCommand } from "./commands";

/**
 * Discord interactions handler.
 *
 * Processes slash command interactions and button clicks.
 * Designed to work with discord.js when available, but also provides
 * raw handler functions that can be called from the web API as a
 * fallback for testing without discord.js.
 */

export interface InteractionResponse {
  type: "reply" | "embed" | "error";
  content?: string;
  embed?: DiscordEmbed;
  ephemeral?: boolean;
  components?: ButtonRow[];
}

export interface ButtonRow {
  type: 1; // ACTION_ROW
  components: Button[];
}

export interface Button {
  type: 2; // BUTTON
  style: 1 | 2 | 3 | 4; // PRIMARY, SECONDARY, SUCCESS, DANGER
  label: string;
  custom_id: string;
  emoji?: { name: string };
}

// --- Slash Command Handlers ---

export function handleSlashCommand(
  commandName: string,
  options: Record<string, string>,
): InteractionResponse {
  switch (commandName) {
    case "status":
      return handleStatus(options.project);
    case "projects":
      return handleProjects();
    case "approve":
      return handleApprove(options.checkpoint_id, options.message);
    case "reject":
      return handleReject(options.checkpoint_id, options.reason);
    case "pause":
      return handlePause(options.project);
    case "resume":
      return handleResume(options.project);
    case "ask":
      return handleAsk(options.project, options.message);
    case "tasks":
      return handleTasks(options.project);
    default:
      return { type: "error", content: `Unknown command: ${commandName}` };
  }
}

function handleStatus(projectName?: string): InteractionResponse {
  const db = getDb();

  if (!projectName) {
    // Show all active projects
    const projects = db
      .prepare(
        "SELECT name, status FROM projects WHERE status IN ('running', 'paused') ORDER BY updated_at DESC LIMIT 5",
      )
      .all() as Array<{ name: string; status: string }>;

    if (projects.length === 0) {
      return { type: "reply", content: "No active projects.", ephemeral: true };
    }

    const lines = projects.map(
      (p) => `${p.status === "running" ? "🟢" : "🟡"} **${p.name}** — ${p.status}`,
    );
    return { type: "reply", content: lines.join("\n") };
  }

  const project = db
    .prepare("SELECT * FROM projects WHERE name = ?")
    .get(projectName) as Record<string, unknown> | undefined;

  if (!project) {
    return { type: "error", content: `Project "${projectName}" not found.` };
  }

  const state = db
    .prepare("SELECT * FROM orchestrator_state WHERE project_id = ?")
    .get(project.id as string) as Record<string, unknown> | undefined;

  const pendingCheckpoints = db
    .prepare(
      "SELECT COUNT(*) as count FROM checkpoints WHERE project_id = ? AND status = 'pending'",
    )
    .get(project.id as string) as { count: number };

  return {
    type: "embed",
    embed: {
      title: `Project: ${projectName}`,
      description: (project.description as string)?.slice(0, 200) || "",
      color: project.status === "running" ? 0x22c55e : 0xeab308,
      fields: [
        { name: "Status", value: String(project.status), inline: true },
        {
          name: "Cycle",
          value: String(state?.cycle_number ?? 0),
          inline: true,
        },
        {
          name: "Phase",
          value: String(state?.state ?? "unknown"),
          inline: true,
        },
        {
          name: "Pending Checkpoints",
          value: String(pendingCheckpoints.count),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    },
  };
}

function handleProjects(): InteractionResponse {
  const db = getDb();
  const projects = db
    .prepare(
      "SELECT name, status, description FROM projects ORDER BY updated_at DESC LIMIT 10",
    )
    .all() as Array<{ name: string; status: string; description: string }>;

  if (projects.length === 0) {
    return { type: "reply", content: "No projects found.", ephemeral: true };
  }

  const lines = projects.map((p) => {
    const icon =
      p.status === "running"
        ? "🟢"
        : p.status === "paused"
          ? "🟡"
          : p.status === "complete"
            ? "✅"
            : "⚫";
    return `${icon} **${p.name}** — ${p.status}\n> ${p.description.slice(0, 80)}`;
  });

  return { type: "reply", content: lines.join("\n\n") };
}

function handleApprove(
  checkpointId: string,
  message?: string,
): InteractionResponse {
  if (!checkpointId) {
    return { type: "error", content: "Checkpoint ID is required." };
  }

  try {
    answerCheckpoint(checkpointId, message || "Approved via Discord");
    return {
      type: "reply",
      content: `✅ Checkpoint \`${checkpointId.slice(0, 8)}\` approved.${message ? ` Message: "${message}"` : ""}`,
    };
  } catch {
    return {
      type: "error",
      content: `Failed to approve checkpoint \`${checkpointId.slice(0, 8)}\`. It may not exist or has already been answered.`,
    };
  }
}

function handleReject(
  checkpointId: string,
  reason: string,
): InteractionResponse {
  if (!checkpointId || !reason) {
    return {
      type: "error",
      content: "Both checkpoint ID and reason are required.",
    };
  }

  try {
    answerCheckpoint(checkpointId, `REJECTED: ${reason}`);
    return {
      type: "reply",
      content: `❌ Checkpoint \`${checkpointId.slice(0, 8)}\` rejected. Reason: "${reason}"`,
    };
  } catch {
    return {
      type: "error",
      content: `Failed to reject checkpoint \`${checkpointId.slice(0, 8)}\`.`,
    };
  }
}

function handlePause(projectName: string): InteractionResponse {
  const db = getDb();
  const project = db
    .prepare("SELECT id, status FROM projects WHERE name = ?")
    .get(projectName) as { id: string; status: string } | undefined;

  if (!project) {
    return { type: "error", content: `Project "${projectName}" not found.` };
  }

  if (project.status !== "running") {
    return {
      type: "reply",
      content: `Project "${projectName}" is not running (status: ${project.status}).`,
      ephemeral: true,
    };
  }

  pauseLoop(project.id);
  return { type: "reply", content: `⏸️ Project "${projectName}" paused.` };
}

function handleResume(projectName: string): InteractionResponse {
  const db = getDb();
  const project = db
    .prepare("SELECT id, status FROM projects WHERE name = ?")
    .get(projectName) as { id: string; status: string } | undefined;

  if (!project) {
    return { type: "error", content: `Project "${projectName}" not found.` };
  }

  if (project.status !== "paused") {
    return {
      type: "reply",
      content: `Project "${projectName}" is not paused (status: ${project.status}).`,
      ephemeral: true,
    };
  }

  resumeLoop(project.id);
  return { type: "reply", content: `▶️ Project "${projectName}" resumed.` };
}

function handleAsk(
  projectName: string,
  message: string,
): InteractionResponse {
  if (!projectName || !message) {
    return {
      type: "error",
      content: "Both project name and message are required.",
    };
  }

  // Store the message in chat_messages so the orchestrator picks it up
  const db = getDb();
  const project = db
    .prepare("SELECT id FROM projects WHERE name = ?")
    .get(projectName) as { id: string } | undefined;

  if (!project) {
    return { type: "error", content: `Project "${projectName}" not found.` };
  }

  const { generateId } = require("@/lib/utils/id");
  db.prepare(
    `INSERT INTO chat_messages (id, project_id, role, content, message_type, created_at)
     VALUES (?, ?, 'user', ?, 'text', datetime('now'))`,
  ).run(generateId(), project.id, message);

  return {
    type: "reply",
    content: `💬 Message sent to lead agent for "${projectName}". The agent will respond when it processes your message.`,
  };
}

function handleTasks(projectName: string): InteractionResponse {
  const db = getDb();
  const project = db
    .prepare("SELECT id FROM projects WHERE name = ?")
    .get(projectName) as { id: string } | undefined;

  if (!project) {
    return { type: "error", content: `Project "${projectName}" not found.` };
  }

  const tasks = db
    .prepare(
      "SELECT subject, status FROM tasks WHERE project_id = ? ORDER BY created_at DESC LIMIT 10",
    )
    .all(project.id) as Array<{ subject: string; status: string }>;

  if (tasks.length === 0) {
    return {
      type: "reply",
      content: `No tasks found for "${projectName}".`,
      ephemeral: true,
    };
  }

  const statusIcon = (s: string) =>
    s === "completed"
      ? "✅"
      : s === "in_progress"
        ? "🔵"
        : s === "blocked"
          ? "🔴"
          : "⬜";

  const lines = tasks.map(
    (t) => `${statusIcon(t.status)} ${t.subject} — *${t.status}*`,
  );
  return { type: "reply", content: lines.join("\n") };
}

// --- Button Interaction Handlers ---

/**
 * Build approve/reject/defer buttons for a checkpoint notification.
 */
export function buildCheckpointButtons(checkpointId: string): ButtonRow {
  return {
    type: 1,
    components: [
      {
        type: 2,
        style: 3, // SUCCESS
        label: "Approve",
        custom_id: `checkpoint_approve:${checkpointId}`,
        emoji: { name: "✅" },
      },
      {
        type: 2,
        style: 4, // DANGER
        label: "Reject",
        custom_id: `checkpoint_reject:${checkpointId}`,
        emoji: { name: "❌" },
      },
      {
        type: 2,
        style: 2, // SECONDARY
        label: "Defer",
        custom_id: `checkpoint_defer:${checkpointId}`,
        emoji: { name: "⏸️" },
      },
    ],
  };
}

/**
 * Handle a button click interaction.
 */
export function handleButtonInteraction(customId: string): InteractionResponse {
  const [action, checkpointId] = customId.split(":");

  if (!checkpointId) {
    return { type: "error", content: "Invalid button interaction." };
  }

  switch (action) {
    case "checkpoint_approve":
      return handleApprove(checkpointId, "Approved via Discord button");
    case "checkpoint_reject":
      return {
        type: "reply",
        content:
          "Please provide a reason for rejection using `/exeflow reject`.",
        ephemeral: true,
      };
    case "checkpoint_defer":
      return {
        type: "reply",
        content: `⏸️ Checkpoint \`${checkpointId.slice(0, 8)}\` deferred. The agent will try to work around it.`,
      };
    default:
      return { type: "error", content: `Unknown action: ${action}` };
  }
}
