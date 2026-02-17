import { NextResponse } from "next/server";
import { researchOptimalSetup } from "@/lib/research/setup-researcher";
import type { MachineCapabilities } from "@/lib/system/capability-scanner";

export async function POST(request: Request) {
  try {
    const capabilities: MachineCapabilities = await request.json();

    const recommendations = await researchOptimalSetup(capabilities);

    if (!recommendations) {
      // Return sensible defaults when agent research fails
      return NextResponse.json({
        recommendations: [
          {
            category: "MCP Servers",
            item: "Context7",
            reason: "Provides up-to-date documentation for libraries and frameworks",
            priority: "recommended",
          },
          {
            category: "MCP Servers",
            item: "Playwright",
            reason: "Browser testing and visual verification of web projects",
            priority: "recommended",
          },
        ],
        mcpServers: [
          {
            name: "Context7",
            package: "@upstash/context7-mcp",
            description: "Search latest docs for dependencies",
            essential: false,
          },
          {
            name: "Playwright",
            package: "@playwright/mcp@latest",
            description: "Browser testing and screenshots",
            essential: false,
          },
        ],
        warnings: [],
      });
    }

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Setup research failed:", error);
    return NextResponse.json(
      { error: "Failed to research setup" },
      { status: 500 },
    );
  }
}
