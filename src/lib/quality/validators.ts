import { execSync } from "child_process";

export interface ValidationResult {
  check: string;
  status: "pass" | "fail" | "skipped";
  skipReason?: string;
  errors: string[];
  warnings?: string[];
}

function tryRun(command: string, cwd: string, timeout = 60000): { stdout: string; success: boolean } {
  try {
    const stdout = execSync(command, {
      cwd,
      encoding: "utf8",
      timeout,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, success: true };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return {
      stdout: execError.stdout || execError.stderr || execError.message || "Unknown error",
      success: false,
    };
  }
}

export function runTypeCheck(cwd: string): ValidationResult {
  const result = tryRun("npx tsc --noEmit", cwd);
  if (result.success) {
    return { check: "typescript", status: "pass", errors: [] };
  }
  const errors = result.stdout
    .split("\n")
    .filter((l) => l.includes("error TS"))
    .slice(0, 10);
  return { check: "typescript", status: "fail", errors };
}

export function runLint(cwd: string): ValidationResult {
  const result = tryRun("npm run lint", cwd);
  if (result.success) {
    return { check: "lint", status: "pass", errors: [] };
  }
  const lines = result.stdout.split("\n");
  const errors = lines.filter((l) => /error/i.test(l)).slice(0, 5);
  const warnings = lines.filter((l) => /warning/i.test(l)).slice(0, 5);
  return { check: "lint", status: "fail", errors, warnings };
}

export function runBuild(cwd: string): ValidationResult {
  const result = tryRun("npm run build", cwd, 120000);
  if (result.success) {
    return { check: "build", status: "pass", errors: [] };
  }
  const errors = result.stdout.split("\n").slice(-20);
  return { check: "build", status: "fail", errors };
}

export function runTests(cwd: string): ValidationResult {
  const result = tryRun("npm test", cwd, 120000);
  if (result.success) {
    return { check: "tests", status: "pass", errors: [] };
  }
  const errors = result.stdout
    .split("\n")
    .filter((l) => /FAIL|Error|✗|×/i.test(l))
    .slice(0, 10);
  return { check: "tests", status: "fail", errors };
}

export function runSecurityAudit(cwd: string): ValidationResult {
  const result = tryRun("npm audit --audit-level=high", cwd);
  if (result.success) {
    return { check: "security", status: "pass", errors: [] };
  }
  const errors = result.stdout
    .split("\n")
    .filter((l) => /high|critical/i.test(l))
    .slice(0, 10);
  return { check: "security", status: "fail", errors };
}

export function runAllValidations(cwd: string): ValidationResult[] {
  return [
    runTypeCheck(cwd),
    runLint(cwd),
    runBuild(cwd),
    runTests(cwd),
    runSecurityAudit(cwd),
  ];
}
