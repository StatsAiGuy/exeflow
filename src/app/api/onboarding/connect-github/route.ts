import { NextResponse } from "next/server";
import { validateGitHubOrg, validateGitHubToken } from "@/lib/connections/github";
import { setCredential } from "@/lib/connections/credentials";
import { readConfig, writeConfig } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const { orgName, token } = await request.json();

    if (!orgName || !token) {
      return NextResponse.json(
        { valid: false, error: "Organization name and token are required" },
        { status: 400 },
      );
    }

    // Validate the token first
    const tokenResult = validateGitHubToken(token);
    if (!tokenResult.valid) {
      return NextResponse.json({
        valid: false,
        error: tokenResult.error || "Invalid GitHub token",
      });
    }

    // Validate org access
    const orgResult = validateGitHubOrg(orgName, token);
    if (!orgResult.valid) {
      return NextResponse.json({
        valid: false,
        error: orgResult.error || "Cannot access organization",
      });
    }

    // Store credentials
    setCredential("github", "token", token);

    // Update config with org name
    const config = readConfig();
    config.github = {
      orgName,
      connected: true,
    };
    writeConfig(config);

    return NextResponse.json({
      valid: true,
      orgName,
    });
  } catch (error) {
    console.error("GitHub connection failed:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to connect GitHub" },
      { status: 500 },
    );
  }
}
