// Channel name utilities for Discord integration
export function projectToChannelName(projectName: string): string {
  return projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function formatActivityMessage(
  eventType: string,
  projectName: string,
  data?: Record<string, unknown>,
): string {
  const prefix = getEventPrefix(eventType);
  const detail = data ? formatEventData(eventType, data) : "";
  return `${prefix} **${projectName}** ${detail}`.trim();
}

function getEventPrefix(eventType: string): string {
  switch (eventType) {
    case "task_completed":
      return "\u2705";
    case "task_failed":
      return "\u274C";
    case "phase_started":
      return "\u25B6\uFE0F";
    case "phase_completed":
      return "\u2714\uFE0F";
    case "checkpoint_created":
      return "\uD83D\uDFE1";
    case "checkpoint_answered":
      return "\uD83D\uDFE2";
    case "cycle_started":
      return "\uD83D\uDD04";
    case "milestone_completed":
      return "\uD83C\uDFC6";
    case "error":
      return "\uD83D\uDD34";
    default:
      return "\u2139\uFE0F";
  }
}

function formatEventData(eventType: string, data: Record<string, unknown>): string {
  switch (eventType) {
    case "task_completed":
      return `Task "${data.title || "unknown"}" completed`;
    case "phase_started":
      return `Entering ${data.phase || "unknown"} phase`;
    case "cycle_started":
      return `Cycle #${data.cycleNumber || "?"}`;
    case "milestone_completed":
      return `Milestone "${data.title || "unknown"}" reached`;
    default:
      return "";
  }
}
