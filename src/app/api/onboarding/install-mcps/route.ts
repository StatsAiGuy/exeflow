import { NextResponse } from "next/server";
import { execSync } from "child_process";

interface McpServer {
  name: string;
  package: string;
  description: string;
}

export async function POST(request: Request) {
  try {
    const { servers }: { servers: McpServer[] } = await request.json();

    if (!servers || !Array.isArray(servers)) {
      return NextResponse.json(
        { error: "servers array required" },
        { status: 400 },
      );
    }

    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    for (const server of servers) {
      try {
        // Install MCP server via claude CLI
        execSync(
          `claude mcp add ${server.name.toLowerCase()} -s user -- npx -y ${server.package}`,
          {
            encoding: "utf8",
            timeout: 60000,
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
        results.push({ name: server.name, success: true });
      } catch (error) {
        const err = error as { stderr?: string; message?: string };
        results.push({
          name: server.name,
          success: false,
          error: err.stderr || err.message || "Installation failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("MCP installation failed:", error);
    return NextResponse.json(
      { error: "Failed to install MCP servers" },
      { status: 500 },
    );
  }
}
