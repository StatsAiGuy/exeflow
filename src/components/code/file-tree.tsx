"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface FileTreeProps {
  projectId: string;
  onSelect: (filePath: string) => void;
  selectedPath?: string;
}

export function FileTree({ projectId, onSelect, selectedPath }: FileTreeProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/projects/${projectId}/files`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTree(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.path);
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === "directory") {
              toggleExpand(node.path);
            } else {
              onSelect(node.path);
            }
          }}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-sm hover:bg-muted/50",
            isSelected && "bg-muted font-medium"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {node.type === "directory" ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
              ) : (
                <Folder className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
              )}
            </>
          ) : (
            <>
              <span className="w-3.5" />
              <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.type === "directory" && isExpanded && node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="py-1">
      {tree.map((node) => renderNode(node))}
    </div>
  );
}
