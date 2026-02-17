import path from "path";
import os from "os";

const DANGEROUS_BASH_PATTERNS = [
  /rm\s+-rf\s+[\/~]/,
  /curl\s+.*\|\s*bash/,
  /curl\s+.*\|\s*sh/,
  /wget\s+.*\|\s*bash/,
  /npm\s+publish/,
  /git\s+push\s+--force/,
  /chmod\s+777/,
  /mkfs/,
  /dd\s+if=/,
  /:\(\)\s*\{\s*:\|:\&\s*\}/,  // fork bomb
];

const EXEFLOW_DIR = path.join(os.homedir(), ".exeflow");
const CLAUDE_DIR = path.join(os.homedir(), ".claude");

function isPathOutsideWorkspace(filePath: string, cwd: string): boolean {
  const resolved = path.resolve(cwd, filePath);
  return !resolved.startsWith(path.resolve(cwd));
}

function isProtectedPath(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  if (resolved.startsWith(EXEFLOW_DIR)) return true;
  if (resolved.startsWith(CLAUDE_DIR)) return true;
  return false;
}

export function enforceExeflowPermissions(
  toolName: string,
  toolInput: Record<string, unknown>,
  cwd: string,
): boolean {
  // Write/Edit: block writes outside workspace and to protected dirs
  if (toolName === "Write" || toolName === "Edit") {
    const filePath = (toolInput.file_path || toolInput.filePath) as string | undefined;
    if (!filePath) return true;

    if (isProtectedPath(filePath)) return false;
    if (isPathOutsideWorkspace(filePath, cwd)) return false;
    return true;
  }

  // Bash: block dangerous commands
  if (toolName === "Bash") {
    const command = (toolInput.command || "") as string;

    for (const pattern of DANGEROUS_BASH_PATTERNS) {
      if (pattern.test(command)) return false;
    }

    return true;
  }

  // Read/Glob/Grep: block reading protected dirs
  if (toolName === "Read" || toolName === "Glob" || toolName === "Grep") {
    const filePath = (toolInput.file_path || toolInput.path || "") as string;
    if (filePath && isProtectedPath(filePath)) return false;

    // Allow reading credentials.json only if it's in the workspace
    if (filePath.includes("credentials.json") && isPathOutsideWorkspace(filePath, cwd)) {
      return false;
    }

    return true;
  }

  // All other tools: allow
  return true;
}
