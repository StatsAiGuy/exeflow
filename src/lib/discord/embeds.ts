export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
  footer?: { text: string };
}

const COLORS = {
  success: 0x22c55e,   // green
  error: 0xef4444,     // red
  warning: 0xeab308,   // yellow
  info: 0x3b82f6,      // blue
  milestone: 0xa855f7, // purple
};

export function buildTaskCompletedEmbed(taskTitle: string, projectName: string, agentRole: string, model: string): DiscordEmbed {
  return {
    title: "Task Completed",
    description: `**${taskTitle}**`,
    color: COLORS.success,
    fields: [
      { name: "Project", value: projectName, inline: true },
      { name: "Agent", value: `${agentRole} (${model})`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildErrorEmbed(errorMessage: string, projectName: string, phase: string): DiscordEmbed {
  return {
    title: "Error Occurred",
    description: errorMessage.slice(0, 2000),
    color: COLORS.error,
    fields: [
      { name: "Project", value: projectName, inline: true },
      { name: "Phase", value: phase, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildCheckpointEmbed(question: string, projectName: string, options?: string[]): DiscordEmbed {
  return {
    title: "Checkpoint — Approval Needed",
    description: question,
    color: COLORS.warning,
    fields: [
      { name: "Project", value: projectName, inline: true },
      ...(options?.map((opt, i) => ({ name: `Option ${i + 1}`, value: opt, inline: false })) || []),
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildMilestoneEmbed(milestoneTitle: string, projectName: string, tasksCompleted: number, totalTasks: number): DiscordEmbed {
  return {
    title: "Milestone Reached",
    description: `**${milestoneTitle}**`,
    color: COLORS.milestone,
    fields: [
      { name: "Project", value: projectName, inline: true },
      { name: "Tasks", value: `${tasksCompleted}/${totalTasks} completed`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildPhaseEmbed(phase: string, projectName: string, cycleNumber: number): DiscordEmbed {
  return {
    title: `Phase: ${phase.charAt(0).toUpperCase() + phase.slice(1)}`,
    description: `Entering ${phase} phase`,
    color: COLORS.info,
    fields: [
      { name: "Project", value: projectName, inline: true },
      { name: "Cycle", value: `#${cycleNumber}`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildTestResultsEmbed(
  projectName: string,
  passing: number,
  failing: number,
  total: number,
): DiscordEmbed {
  const allPass = failing === 0;
  return {
    title: allPass ? "Tests Passing" : "Tests Failing",
    description: `${passing}/${total} tests passing${failing > 0 ? `, ${failing} failing` : ""}`,
    color: allPass ? COLORS.success : COLORS.error,
    fields: [
      { name: "Project", value: projectName, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}
