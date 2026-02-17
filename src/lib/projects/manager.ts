import { getDb, withRetry } from "@/lib/db";
import { generateId } from "@/lib/utils/id";
import { getProjectDir, getProjectWorkspaceDir } from "@/lib/claude/paths";
import { eventBus } from "@/lib/events/emitter";
import type { Project } from "@/types/project";
import type { CreateProjectInput, UpdateProjectInput } from "./types";
import fs from "fs";
import path from "path";

export function createProject(input: CreateProjectInput): Project {
  const db = getDb();
  const id = generateId();
  const projectPath = getProjectWorkspaceDir(input.name);

  const project: Project = {
    id,
    name: input.name,
    description: input.description,
    projectType: input.projectType,
    status: "setup",
    projectPath,
    stack: input.stack || null,
    connections: null,
    modelConfig: input.modelConfig || null,
    gitRepo: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };

  withRetry(() => {
    db.prepare(
      `INSERT INTO projects (id, name, description, project_type, status, project_path, stack, model_config, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      project.id,
      project.name,
      project.description,
      project.projectType,
      project.status,
      project.projectPath,
      project.stack ? JSON.stringify(project.stack) : null,
      project.modelConfig ? JSON.stringify(project.modelConfig) : null,
      project.createdAt,
    );
  });

  eventBus.emit("project_created", id, {
    name: project.name,
    projectType: project.projectType,
  });

  return project;
}

export function getProject(id: string): Project | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  if (!row) return null;
  return rowToProject(row);
}

export function getProjectByName(name: string): Project | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM projects WHERE name = ?").get(name) as ProjectRow | undefined;
  if (!row) return null;
  return rowToProject(row);
}

export function listProjects(): Project[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function updateProject(id: string, input: UpdateProjectInput): Project | null {
  const db = getDb();
  const existing = getProject(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) { updates.push("name = ?"); values.push(input.name); }
  if (input.description !== undefined) { updates.push("description = ?"); values.push(input.description); }
  if (input.status !== undefined) { updates.push("status = ?"); values.push(input.status); }
  if (input.stack !== undefined) { updates.push("stack = ?"); values.push(JSON.stringify(input.stack)); }
  if (input.connections !== undefined) { updates.push("connections = ?"); values.push(input.connections); }
  if (input.modelConfig !== undefined) { updates.push("model_config = ?"); values.push(JSON.stringify(input.modelConfig)); }
  if (input.gitRepo !== undefined) { updates.push("git_repo = ?"); values.push(input.gitRepo); }

  if (updates.length === 0) return existing;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  withRetry(() => {
    db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  });

  return getProject(id);
}

export function deleteProject(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return result.changes > 0;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  project_type: string;
  status: string;
  project_path: string;
  stack: string | null;
  connections: string | null;
  model_config: string | null;
  git_repo: string | null;
  created_at: string;
  updated_at: string | null;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    projectType: row.project_type,
    status: row.status as Project["status"],
    projectPath: row.project_path,
    stack: row.stack ? JSON.parse(row.stack) : null,
    connections: row.connections,
    modelConfig: row.model_config ? JSON.parse(row.model_config) : null,
    gitRepo: row.git_repo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
