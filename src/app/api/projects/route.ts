import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { listProjects, createProject } from "@/lib/projects/manager";
import { scaffoldProject } from "@/lib/projects/scaffolder";
import { scaffoldClaudeConfig } from "@/lib/projects/scaffolder";

export async function GET() {
  try {
    initializeDb();
    const projects = listProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json(
      { error: "Failed to list projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    initializeDb();
    const body = await request.json();
    const { name, description, projectType } = body;

    if (!name || !projectType) {
      return NextResponse.json(
        { error: "name and projectType are required" },
        { status: 400 },
      );
    }

    const project = createProject({ name, description, projectType });

    // Scaffold workspace directory immediately so it's ready when the user starts the project
    const scaffoldResult = scaffoldProject(name);
    if (!scaffoldResult.success) {
      console.error("Failed to scaffold project workspace:", scaffoldResult.error);
    } else {
      // Generate Claude config files (CLAUDE.md, settings, rules, skills)
      scaffoldClaudeConfig(
        scaffoldResult.workspaceDir,
        name,
        description || "",
      );
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
