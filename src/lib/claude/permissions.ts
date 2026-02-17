import path from "path";
import os from "os";
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";

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
  /:\(\)\s*\{\s*:\|:\&\s*\}/, // fork bomb
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

/**
 * Permission enforcement callback compatible with the Claude Agent SDK's CanUseTool signature.
 * Returns a PermissionResult (allow/deny) for each tool call.
 */
export function enforceExeflowPermissions(
  toolName: string,
  toolInput: Record<string, unknown>,
  cwd: string,
): PermissionResult {
  // Write/Edit: block writes outside workspace and to protected dirs
  if (toolName === "Write" || toolName === "Edit") {
    const filePath = (toolInput.file_path || toolInput.filePath) as
      | string
      | undefined;
    if (!filePath) return { behavior: "allow" };

    if (isProtectedPath(filePath))
      return {
        behavior: "deny",
        message: `Cannot write to protected path: ${filePath}`,
      };
    if (isPathOutsideWorkspace(filePath, cwd))
      return {
        behavior: "deny",
        message: `Cannot write outside workspace: ${filePath}`,
      };
    return { behavior: "allow" };
  }

  // Bash: block dangerous commands
  if (toolName === "Bash") {
    const command = (toolInput.command || "") as string;

    for (const pattern of DANGEROUS_BASH_PATTERNS) {
      if (pattern.test(command))
        return {
          behavior: "deny",
          message: `Dangerous command blocked: ${command.slice(0, 100)}`,
        };
    }

    return { behavior: "allow" };
  }

  // Read/Glob/Grep: block reading protected dirs
  if (toolName === "Read" || toolName === "Glob" || toolName === "Grep") {
    const filePath = (toolInput.file_path || toolInput.path || "") as string;
    if (filePath && isProtectedPath(filePath))
      return {
        behavior: "deny",
        message: `Cannot read protected path: ${filePath}`,
      };

    // Allow reading credentials.json only if it's in the workspace
    if (
      filePath.includes("credentials.json") &&
      isPathOutsideWorkspace(filePath, cwd)
    ) {
      return {
        behavior: "deny",
        message: "Cannot read credentials outside workspace",
      };
    }

    return { behavior: "allow" };
  }

  // All other tools: allow
  return { behavior: "allow" };
}
