import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST() {
  try {
    // Check if Claude Code CLI is authenticated
    // Must unset CLAUDECODE env var to avoid nested session check
    const result = execSync("claude auth status", {
      encoding: "utf-8",
      env: { ...process.env, CLAUDECODE: "" },
      timeout: 10000,
    });

    const authInfo = JSON.parse(result.trim());

    if (authInfo.loggedIn) {
      return NextResponse.json({
        authenticated: true,
        authMethod: authInfo.authMethod,
        email: authInfo.email,
        subscriptionType: authInfo.subscriptionType,
        orgName: authInfo.orgName,
      });
    }

    return NextResponse.json({
      authenticated: false,
      error: "Claude Code is not logged in",
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      authenticated: false,
      error: errMsg.includes("not recognized")
        ? "Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
        : `Failed to check auth: ${errMsg}`,
    });
  }
}
