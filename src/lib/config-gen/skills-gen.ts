export function generateReportSkill(): string {
  return `---
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
`;
}

export function generateStatusSkill(): string {
  return `---
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
`;
}

export function generateValidationSkill(): string {
  return `---
name: run-validation
description: Run full validation suite
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
---
Run the full validation suite in order:
1. \`npx tsc --noEmit\` — TypeScript compilation
2. \`npm run lint\` — Linting (if configured)
3. \`npm run build\` — Production build
4. \`npm test\` — Test suite
5. \`npm audit --audit-level=high\` — Security audit

Report results for each check: pass/fail with error details.
`;
}

export function generateHealthCheckSkill(): string {
  return `---
name: health-check
description: Quick project health check
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
---
Run a quick health check:
1. Check dependency status (\`npm outdated\`)
2. Check build status (\`npm run build\`)
3. Check git status (\`git status\`)
4. Count total files and lines of code
5. Check for common issues (missing .env, unused deps)

Output a concise health report.
`;
}
