import type { Project } from "@/types/project";

export interface ClaudeMdContext {
  project: Project;
  cycleNumber: number;
  currentPhase: string;
  currentMilestone?: string;
  activeConnections?: string[];
}

export function generateClaudeMd(ctx: ClaudeMdContext): string {
  const lines: string[] = [];

  lines.push(`# ${ctx.project.name}`);
  lines.push("");
  lines.push(ctx.project.description);
  lines.push("");

  // Architecture
  if (ctx.project.stack) {
    lines.push("## Architecture");
    const stack = ctx.project.stack;
    if (stack.framework) lines.push(`- **Framework**: ${stack.framework.choice}`);
    if (stack.database) lines.push(`- **Database**: ${stack.database.choice}`);
    if (stack.auth) lines.push(`- **Auth**: ${stack.auth.choice}`);
    if (stack.deployment) lines.push(`- **Deployment**: ${stack.deployment.choice}`);
    if (stack.styling) lines.push(`- **Styling**: ${stack.styling.choice}`);
    lines.push("");
  }

  // Commands
  lines.push("## Commands");
  lines.push("| Command | Description |");
  lines.push("|---------|-------------|");
  lines.push("| `npm run dev` | Start development server |");
  lines.push("| `npm run test` | Run tests |");
  lines.push("| `npm run build` | Production build |");
  lines.push("");

  // Exeflow context
  lines.push("## Exeflow Context");
  lines.push(`- Current cycle: ${ctx.cycleNumber}`);
  lines.push(`- Current phase: ${ctx.currentPhase}`);
  if (ctx.currentMilestone) {
    lines.push(`- Current milestone: ${ctx.currentMilestone}`);
  }
  if (ctx.activeConnections?.length) {
    lines.push(`- Active connections: ${ctx.activeConnections.join(", ")}`);
  }
  lines.push("");

  // Constraints
  lines.push("## Important Constraints");
  lines.push("- Do NOT modify files outside the workspace directory");
  lines.push("- Do NOT modify .claude/ configuration files");
  lines.push("- Always run tests after code changes");
  lines.push("- Follow the project's established patterns");
  lines.push("");

  return lines.join("\n");
}
