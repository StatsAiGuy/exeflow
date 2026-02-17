import { execSync } from "child_process";

export interface GitHubValidationResult {
  valid: boolean;
  orgExists: boolean;
  tokenScopes: string[];
  error?: string;
}

export function validateGitHubOrg(orgName: string, token: string): GitHubValidationResult {
  try {
    const result = execSync(
      `gh api orgs/${orgName} --header "Authorization: Bearer ${token}"`,
      { encoding: "utf8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] },
    );
    return {
      valid: true,
      orgExists: true,
      tokenScopes: [],
    };
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    return {
      valid: false,
      orgExists: false,
      tokenScopes: [],
      error: err.stderr || err.message || "Unknown error",
    };
  }
}

export function validateGitHubToken(token: string): { valid: boolean; error?: string } {
  try {
    execSync(
      `gh auth status`,
      {
        encoding: "utf8",
        timeout: 15000,
        env: { ...process.env, GH_TOKEN: token },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    return { valid: true };
  } catch (error) {
    const err = error as { stderr?: string };
    // gh auth status returns exit code 1 but may still show valid token info in stderr
    if (err.stderr?.includes("Logged in")) {
      return { valid: true };
    }
    return { valid: false, error: err.stderr || "Token validation failed" };
  }
}

export function createGitHubRepo(
  orgName: string,
  repoName: string,
  description: string,
  isPrivate: boolean,
  token: string,
): { success: boolean; repoUrl?: string; error?: string } {
  try {
    const visibility = isPrivate ? "--private" : "--public";
    const result = execSync(
      `gh repo create ${orgName}/${repoName} ${visibility} --description "${description}" --clone=false`,
      {
        encoding: "utf8",
        timeout: 30000,
        env: { ...process.env, GH_TOKEN: token },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    return {
      success: true,
      repoUrl: `https://github.com/${orgName}/${repoName}`,
    };
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    return {
      success: false,
      error: err.stderr || err.message || "Failed to create repository",
    };
  }
}
