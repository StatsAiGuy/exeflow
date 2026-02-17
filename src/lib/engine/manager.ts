import { getProject } from "@/lib/projects/manager";
import { Orchestrator } from "./orchestrator";
import { startLoop, pauseLoop, resumeLoop, stopLoop, getLoopState } from "./loop-controller";
import { scaffoldProject } from "@/lib/projects/scaffolder";
import { generateClaudeMd } from "@/lib/config-gen/claude-md";
import { generateSettingsJson } from "@/lib/config-gen/settings-gen";
import { generateProjectStandardsRule, generateSecurityRule, generateExeflowConstraintsRule, generateTestingRule } from "@/lib/config-gen/rules-gen";
import { generateReportSkill, generateStatusSkill, generateValidationSkill, generateHealthCheckSkill } from "@/lib/config-gen/skills-gen";
import { eventBus } from "@/lib/events/emitter";
import type { Project } from "@/types/project";
import fs from "fs";
import path from "path";

// Track running orchestrator instances
const activeOrchestrators = new Map<string, Orchestrator>();

export function getActiveOrchestrator(projectId: string): Orchestrator | undefined {
  return activeOrchestrators.get(projectId);
}

export async function startProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  const project = getProject(projectId);
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  // Don't start if already running
  if (activeOrchestrators.has(projectId)) {
    return { success: false, error: "Project is already running" };
  }

  // Ensure project workspace exists
  if (!fs.existsSync(project.projectPath)) {
    scaffoldProject(project.name);
  }

  // Ensure Claude config exists in workspace
  ensureClaudeConfig(project);

  // Initialize the loop state
  startLoop(projectId);

  // Create and start the orchestrator (runs async)
  const orchestrator = new Orchestrator({
    project,
    planJson: "{}",
    onStateChange: (state) => {
      eventBus.emit("orchestrator_state_changed", projectId, { state });
    },
  });

  activeOrchestrators.set(projectId, orchestrator);

  // Run in background — don't await
  orchestrator.start().finally(() => {
    activeOrchestrators.delete(projectId);
  });

  return { success: true };
}

export function pauseProject(projectId: string): { success: boolean; error?: string } {
  const orchestrator = activeOrchestrators.get(projectId);
  if (orchestrator) {
    orchestrator.stop();
    activeOrchestrators.delete(projectId);
  }
  pauseLoop(projectId);
  return { success: true };
}

export async function resumeProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  const project = getProject(projectId);
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const state = getLoopState(projectId);
  if (!state) {
    return { success: false, error: "No loop state found" };
  }

  resumeLoop(projectId);

  // Create new orchestrator to continue
  const orchestrator = new Orchestrator({
    project,
    planJson: state.planJson || "{}",
    onStateChange: (newState) => {
      eventBus.emit("orchestrator_state_changed", projectId, { state: newState });
    },
  });

  activeOrchestrators.set(projectId, orchestrator);

  orchestrator.start().finally(() => {
    activeOrchestrators.delete(projectId);
  });

  return { success: true };
}

export function stopProject(projectId: string): { success: boolean; error?: string } {
  const orchestrator = activeOrchestrators.get(projectId);
  if (orchestrator) {
    orchestrator.stop();
    activeOrchestrators.delete(projectId);
  }
  stopLoop(projectId);
  return { success: true };
}

function ensureClaudeConfig(project: Project): void {
  const workspacePath = project.projectPath;

  // Generate CLAUDE.md
  const claudeMd = generateClaudeMd({
    project,
    cycleNumber: 0,
    currentPhase: "plan",
    currentMilestone: "Not started",
    activeConnections: [],
  });

  const claudeMdPath = path.join(workspacePath, "CLAUDE.md");
  if (!fs.existsSync(claudeMdPath)) {
    fs.writeFileSync(claudeMdPath, claudeMd);
  }

  // Generate .claude/settings.json
  const settingsDir = path.join(workspacePath, ".claude");
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  const settingsPath = path.join(settingsDir, "settings.json");
  if (!fs.existsSync(settingsPath)) {
    const settings = generateSettingsJson();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  }

  // Generate rules
  const rulesDir = path.join(settingsDir, "rules");
  if (!fs.existsSync(rulesDir)) {
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(
      path.join(rulesDir, "project-standards.md"),
      generateProjectStandardsRule(project.projectType),
    );
    fs.writeFileSync(path.join(rulesDir, "security-policies.md"), generateSecurityRule());
    fs.writeFileSync(path.join(rulesDir, "exeflow-constraints.md"), generateExeflowConstraintsRule());
    fs.writeFileSync(path.join(rulesDir, "testing-requirements.md"), generateTestingRule());
  }

  // Generate skills
  const skillsDir = path.join(settingsDir, "skills");
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });

    const skills = [
      { name: "exeflow-report", content: generateReportSkill() },
      { name: "exeflow-status", content: generateStatusSkill() },
      { name: "run-validation", content: generateValidationSkill() },
      { name: "health-check", content: generateHealthCheckSkill() },
    ];

    for (const skill of skills) {
      const skillDir = path.join(skillsDir, skill.name);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), skill.content);
    }
  }
}
