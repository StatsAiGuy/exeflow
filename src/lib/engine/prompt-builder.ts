import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import type { Project } from "@/types/project";

/**
 * Prompt builder: loads agent-prompts/*.md templates and injects
 * dynamic context variables for each orchestrator invocation.
 */

// Cache loaded templates to avoid repeated fs reads
const templateCache = new Map<string, string>();

function loadTemplate(templateName: string): string {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  // Resolve relative to project root (where agent-prompts/ lives)
  const templatePath = path.resolve(
    process.cwd(),
    "agent-prompts",
    `${templateName}.md`,
  );

  try {
    const content = fs.readFileSync(templatePath, "utf-8");
    templateCache.set(templateName, content);
    return content;
  } catch {
    // Fallback: try from the package directory
    const fallbackPath = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "agent-prompts",
      `${templateName}.md`,
    );
    try {
      const content = fs.readFileSync(fallbackPath, "utf-8");
      templateCache.set(templateName, content);
      return content;
    } catch {
      return "";
    }
  }
}

/**
 * Replace {variable} placeholders in a template with context values.
 * Missing variables are replaced with empty strings.
 */
function injectContext(
  template: string,
  context: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return context[key] ?? "";
  });
}

// --- Phase History Helpers ---

interface PhaseHistoryRow {
  phase_name: string;
  task_description: string;
  outcome: string;
  review_score: number | null;
  file_changes_hash: string | null;
  duration_ms: number | null;
}

function getPhaseHistory(projectId: string, limit = 6): PhaseHistoryRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT phase_name, task_description, outcome, review_score, file_changes_hash, duration_ms
       FROM phase_history WHERE project_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(projectId, limit) as PhaseHistoryRow[];
}

function formatPhaseHistoryTable(rows: PhaseHistoryRow[]): string {
  if (rows.length === 0) return "No phase history yet.";

  const lines = rows.map(
    (r) =>
      `| ${r.phase_name} | ${r.task_description.slice(0, 60)} | ${r.outcome} | ${r.review_score ?? "-"} | ${r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "-"} |`,
  );
  return `| Phase | Task | Outcome | Review Score | Duration |\n|---|---|---|---|---|\n${lines.join("\n")}`;
}

// --- Stack Formatting ---

function formatStack(project: Project): string {
  if (!project.stack) return "Not yet determined";

  const parts: string[] = [];
  const s = project.stack;
  if (s.framework) parts.push(`Framework: ${s.framework.choice}`);
  if (s.database) parts.push(`Database: ${s.database.choice}`);
  if (s.auth) parts.push(`Auth: ${s.auth.choice}`);
  if (s.deployment) parts.push(`Deployment: ${s.deployment.choice}`);
  if (s.styling) parts.push(`Styling: ${s.styling.choice}`);
  return parts.join(", ");
}

// --- Milestone/Task Helpers ---

interface MilestoneRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

interface TaskRow {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  milestone_id: string | null;
}

function getMilestones(projectId: string): MilestoneRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, title, description, status FROM milestones WHERE project_id = ? ORDER BY order_index",
    )
    .all(projectId) as MilestoneRow[];
}

function getTasks(projectId: string): TaskRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, subject, description, status, milestone_id FROM tasks WHERE project_id = ? ORDER BY created_at",
    )
    .all(projectId) as TaskRow[];
}

function getRetryCount(projectId: string): number {
  const db = getDb();
  const history = getPhaseHistory(projectId, 10);
  // Count consecutive recent failures for the same task
  let count = 0;
  for (const row of history) {
    if (row.outcome === "failure") count++;
    else break;
  }
  return count;
}

// ===========================================================
// Public API: Build prompts for each agent role
// ===========================================================

/**
 * Build the lead orchestrator prompt with full context injection.
 */
export function buildLeadAgentPrompt(
  project: Project,
  planJson: string | null,
  contextJson: Record<string, unknown>,
): string {
  const template = loadTemplate("lead-orchestrator");
  if (!template) {
    // Fallback to inline prompt if template not found
    return buildFallbackLeadPrompt(project, planJson, contextJson);
  }

  const milestones = getMilestones(project.id);
  const completedMilestones = milestones.filter(
    (m) => m.status === "completed",
  );
  const currentMilestone =
    milestones.find((m) => m.status === "in_progress") ||
    milestones.find((m) => m.status === "pending") ||
    milestones[0];

  const phaseHistory = getPhaseHistory(project.id);
  const retryCount = getRetryCount(project.id);

  const invocationTrigger =
    (contextJson.invocationTrigger as string) ||
    (contextJson.lastPhase === "none" || !contextJson.lastPhase
      ? "INITIAL"
      : `AFTER_${String(contextJson.lastPhase).toUpperCase()}`);

  const context: Record<string, string> = {
    project_name: project.name,
    project_description: project.description.slice(0, 500),
    project_architecture: project.stack
      ? JSON.stringify(project.stack)
      : "Not yet determined",
    tech_stack: formatStack(project),
    plan_json: planJson
      ? planJson.slice(0, 3000)
      : "No plan yet",
    total_milestones: String(milestones.length),
    completed_milestones: String(completedMilestones.length),
    current_milestone_title: currentMilestone?.title || "None",
    current_milestone_description:
      currentMilestone?.description || "No description",
    invocation_trigger: invocationTrigger,
    cycle_number: String(contextJson.cycleNumber ?? 0),
    retry_count: String(retryCount),
    last_phase: String(contextJson.lastPhase || "none"),
    last_phase_outcome: JSON.stringify(
      contextJson.lastPhaseOutcome || "none",
    ).slice(0, 2000),
    file_count: "",
    git_status_summary: "",
    user_message: (contextJson.userMessage as string) || "",
    phase_history_table: formatPhaseHistoryTable(phaseHistory),
    learnings_json: "",
  };

  return injectContext(template, context);
}

/**
 * Build the executor agent prompt with task context.
 */
export function buildExecutorPrompt(
  project: Project,
  taskDescription: string,
  decision: {
    complexity?: string;
    expected_files?: string[];
    max_turns?: number;
    retry_context?: string | null;
    previous_review_feedback?: string | null;
    previous_test_errors?: string | null;
  },
  retryCount: number,
): string {
  const template = loadTemplate("phase-execute");
  if (!template) return taskDescription;

  const feedbackParts: string[] = [];
  if (decision.retry_context) feedbackParts.push(decision.retry_context);
  if (decision.previous_review_feedback)
    feedbackParts.push(
      `Review feedback: ${decision.previous_review_feedback}`,
    );
  if (decision.previous_test_errors)
    feedbackParts.push(`Test errors: ${decision.previous_test_errors}`);

  const milestones = getMilestones(project.id);
  const currentMilestone = milestones.find(
    (m) => m.status === "in_progress" || m.status === "pending",
  );

  const context: Record<string, string> = {
    task_description: taskDescription,
    complexity: decision.complexity || "medium",
    retry_count: String(retryCount),
    max_turns: String(decision.max_turns || 30),
    expected_files: JSON.stringify(decision.expected_files || []),
    current_milestone_title: currentMilestone?.title || "",
    current_milestone_description: currentMilestone?.description || "",
    project_architecture: project.stack
      ? JSON.stringify(project.stack)
      : "",
    tech_stack: formatStack(project),
    relevant_file_paths: "",
    established_patterns: "",
    previous_feedback_if_retrying:
      feedbackParts.length > 0 ? feedbackParts.join("\n\n") : "",
  };

  return injectContext(template, context);
}

/**
 * Build the reviewer agent prompt.
 */
export function buildReviewerPrompt(
  project: Project,
  taskDescription: string,
  lastPhaseOutcome: unknown,
): string {
  const template = loadTemplate("phase-review");
  if (!template) return `Review the changes for task: ${taskDescription}`;

  const outcome = lastPhaseOutcome as Record<string, unknown> | null;

  const context: Record<string, string> = {
    task_description: taskDescription,
    expected_outcome: "",
    git_diff_stat: "",
    files_modified: "",
    executor_report: outcome
      ? JSON.stringify(outcome).slice(0, 1000)
      : "",
    project_architecture: project.stack
      ? JSON.stringify(project.stack)
      : "",
    tech_stack: formatStack(project),
    established_patterns: "",
  };

  return injectContext(template, context);
}

/**
 * Build the tester agent prompt.
 */
export function buildTesterPrompt(
  project: Project,
  taskDescription: string,
  isBootstrap: boolean,
): string {
  const template = loadTemplate("phase-test");
  if (!template) return `Run tests for task: ${taskDescription}`;

  const context: Record<string, string> = {
    task_description: taskDescription,
    tech_stack: formatStack(project),
    package_manager: "pnpm",
    is_bootstrap: String(isBootstrap),
  };

  return injectContext(template, context);
}

/**
 * Build the propose agent prompt.
 */
export function buildProposePrompt(
  project: Project,
  cycleNumber: number,
  contextJson: Record<string, unknown>,
): string {
  const template = loadTemplate("phase-propose");
  if (!template) return "Commit changes, push to GitHub, and assess progress.";

  const milestones = getMilestones(project.id);
  const currentMilestone = milestones.find(
    (m) => m.status === "in_progress" || m.status === "pending",
  );
  const tasks = getTasks(project.id);
  const milestoneTasks = currentMilestone
    ? tasks.filter((t) => t.milestone_id === currentMilestone.id)
    : [];
  const completedTasks = milestoneTasks.filter(
    (t) => t.status === "completed",
  );
  const remainingTasks = milestoneTasks.filter(
    (t) => t.status !== "completed" && t.status !== "skipped",
  );
  const completedMilestones = milestones.filter(
    (m) => m.status === "completed",
  );

  const context: Record<string, string> = {
    cycle_number: String(cycleNumber),
    tasks_completed_this_cycle: JSON.stringify(
      completedTasks.map((t) => t.subject),
    ),
    tasks_remaining_in_milestone: JSON.stringify(
      remainingTasks.map((t) => ({ id: t.id, title: t.subject })),
    ),
    current_milestone_title: currentMilestone?.title || "",
    completed_task_count: String(completedTasks.length),
    total_task_count: String(milestoneTasks.length),
    milestone_summary: `${completedMilestones.length}/${milestones.length} complete`,
    cycle_summary: JSON.stringify(contextJson.lastPhaseOutcome || ""),
    current_branch: "main",
  };

  return injectContext(template, context);
}

/**
 * Build the plan agent prompt.
 */
export function buildPlanPrompt(
  project: Project,
  planJson: string | null,
  triggerReason: string,
  failedApproaches?: string[],
  userFeedback?: string,
): string {
  const template = loadTemplate("phase-plan");
  if (!template) return `Create a plan for: ${project.description}`;

  const milestones = getMilestones(project.id);
  const completedMilestones = milestones
    .filter((m) => m.status === "completed")
    .map((m) => m.title);
  const currentMilestone = milestones.find(
    (m) => m.status === "in_progress" || m.status === "pending",
  );

  const context: Record<string, string> = {
    project_description: project.description,
    project_architecture: project.stack
      ? JSON.stringify(project.stack)
      : "",
    tech_stack: formatStack(project),
    established_patterns: "",
    current_plan_json: planJson || "No plan yet",
    completed_milestones: completedMilestones.join(", ") || "None",
    current_milestone: currentMilestone?.title || "None",
    existing_files_summary: "",
    recent_git_log: "",
    trigger_reason: triggerReason,
    failed_approaches: failedApproaches?.join("\n") || "",
    user_feedback: userFeedback || "",
  };

  return injectContext(template, context);
}

/**
 * Build the researcher agent prompt.
 */
export function buildResearcherPrompt(
  project: Project,
  researchTasks: string,
  machineCapabilities: string,
): string {
  const template = loadTemplate("researcher");
  if (!template) return `Research: ${researchTasks}`;

  const context: Record<string, string> = {
    project_description: project.description,
    project_type: project.projectType,
    machine_capabilities: machineCapabilities,
    learnings_from_same_project_type: "",
    research_tasks: researchTasks,
  };

  return injectContext(template, context);
}

// --- Fallback for when template files are not found ---

function buildFallbackLeadPrompt(
  project: Project,
  planJson: string | null,
  contextJson: Record<string, unknown>,
): string {
  return `You are the lead orchestrator for project "${project.name}".
Project description: ${project.description}
Current cycle: ${contextJson.cycleNumber ?? 0}
Current plan: ${planJson || "No plan yet"}
Last phase: ${contextJson.lastPhase || "none"}
Last outcome: ${JSON.stringify(contextJson.lastPhaseOutcome || "none")}
Invocation trigger: ${contextJson.invocationTrigger || "INITIAL"}

Make your decision as JSON.`;
}
