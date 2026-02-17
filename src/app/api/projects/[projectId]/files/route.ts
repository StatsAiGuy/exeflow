import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

function buildTree(dirPath: string, relativePath: string = "", depth: number = 0): FileNode[] {
  if (depth > 5) return []; // Limit recursion depth

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    // Sort: directories first, then files, both alphabetical
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      // Skip hidden files, node_modules, .next, .git
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "dist" ||
        entry.name === ".git"
      ) {
        continue;
      }

      const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const entryAbsPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: entryRelPath,
          type: "directory",
          children: buildTree(entryAbsPath, entryRelPath, depth + 1),
        });
      } else {
        nodes.push({
          name: entry.name,
          path: entryRelPath,
          type: "file",
        });
      }
    }

    return nodes;
  } catch {
    return [];
  }
}

// GET /api/projects/[projectId]/files?path=src/app/page.tsx
// Without path query: returns file tree
// With path query: returns file content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const filePath = request.nextUrl.searchParams.get("path");

  const db = getDb();
  const project = db
    .prepare("SELECT project_path FROM projects WHERE id = ?")
    .get(projectId) as { project_path: string } | undefined;

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const workspacePath = path.join(project.project_path, "workspace");
  const basePath = fs.existsSync(workspacePath) ? workspacePath : project.project_path;

  if (!filePath) {
    // Return file tree
    const tree = buildTree(basePath);
    return NextResponse.json(tree);
  }

  // Return file content
  const resolvedPath = path.resolve(basePath, filePath);

  // Security: ensure the resolved path is within the workspace
  if (!resolvedPath.startsWith(path.resolve(basePath))) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: "Path is a directory" }, { status: 400 });
    }

    // Limit file size to 1MB
    if (stat.size > 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large", size: stat.size },
        { status: 413 },
      );
    }

    const content = fs.readFileSync(resolvedPath, "utf-8");
    return NextResponse.json({ content, path: filePath, size: stat.size });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
