import fs from "fs";
import path from "path";
import { getProjectDir, getProjectWorkspaceDir } from "@/lib/claude/paths";

export interface ScaffoldResult {
  projectDir: string;
  workspaceDir: string;
  success: boolean;
  error?: string;
}

export function scaffoldProject(projectName: string): ScaffoldResult {
  const projectDir = getProjectDir(projectName);
  const workspaceDir = getProjectWorkspaceDir(projectName);

  try {
    // Create project directory structure
    const dirs = [
      projectDir,
      workspaceDir,
      path.join(projectDir, "research"),
      path.join(workspaceDir, ".claude"),
      path.join(workspaceDir, ".claude", "rules"),
      path.join(workspaceDir, ".claude", "skills"),
      path.join(workspaceDir, ".claude", "skills", "exeflow-report"),
      path.join(workspaceDir, ".claude", "skills", "exeflow-status"),
    ];

    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create project.json placeholder
    fs.writeFileSync(
      path.join(projectDir, "project.json"),
      JSON.stringify(
        {
          name: projectName,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );

    // Create .gitattributes in workspace
    fs.writeFileSync(
      path.join(workspaceDir, ".gitattributes"),
      "* text=auto eol=lf\n",
    );

    return { projectDir, workspaceDir, success: true };
  } catch (error) {
    return {
      projectDir,
      workspaceDir,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function scaffoldClaudeConfig(
  workspaceDir: string,
  projectName: string,
  projectDescription: string,
): void {
  // .claude/settings.json — permission rules
  const settings = {
    permissions: {
      deny: [
        "Edit(~/.exeflow/**)",
        "Write(~/.exeflow/**)",
        "Read(~/.exeflow/credentials.json)",
        "Edit(.claude/settings.json)",
        "Edit(.claude/settings.local.json)",
        "Bash(rm -rf *)",
        "Bash(curl * | bash)",
        "Bash(npm publish *)",
        "Bash(git push --force *)",
      ],
    },
  };

  fs.writeFileSync(
    path.join(workspaceDir, ".claude", "settings.json"),
    JSON.stringify(settings, null, 2),
  );

  // exeflow-report skill
  fs.writeFileSync(
    path.join(workspaceDir, ".claude", "skills", "exeflow-report", "SKILL.md"),
    `---
name: exeflow-report
description: Generate a structured report of what was accomplished in this session
user-invocable: false
allowed-tools: Read, Glob, Grep
---
Generate a JSON report with:
- files_created: list of new files
- files_modified: list of changed files
- tests_added: number of new tests
- tests_passing: boolean
- summary: 2-3 sentence description of what was accomplished
- blockers: any issues preventing progress
- next_steps: recommended next actions

Output ONLY the JSON, no markdown wrapping.
`,
  );

  // exeflow-status skill
  fs.writeFileSync(
    path.join(workspaceDir, ".claude", "skills", "exeflow-status", "SKILL.md"),
    `---
name: exeflow-status
description: Report current task progress to exeflow
user-invocable: true
allowed-tools: Read, Glob, Grep
---
Check the current state of the project and report:
- Current task being worked on
- Progress percentage
- Any blockers or issues
- Files recently modified

Output a concise status update.
`,
  );
}
