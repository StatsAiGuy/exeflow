import { NextResponse } from "next/server";
import { searchRegistry, getRecommendationsForProjectType } from "@/lib/connections/mcp-registry";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const projectType = searchParams.get("projectType");

  if (projectType) {
    const recommendations = getRecommendationsForProjectType(projectType);
    return NextResponse.json(recommendations);
  }

  if (query) {
    const results = searchRegistry(query);
    return NextResponse.json(results);
  }

  return NextResponse.json(
    { error: "q or projectType parameter required" },
    { status: 400 },
  );
}
