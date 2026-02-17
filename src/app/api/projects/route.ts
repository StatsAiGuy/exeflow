import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { listProjects, createProject } from "@/lib/projects/manager";

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
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
