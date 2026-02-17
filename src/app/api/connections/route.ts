import { NextResponse } from "next/server";
import { BUILTIN_MCP_REGISTRY } from "@/lib/connections/mcp-registry";

export async function GET() {
  return NextResponse.json(BUILTIN_MCP_REGISTRY);
}
