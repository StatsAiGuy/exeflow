"use client";

import { use, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { FileTree } from "@/components/code/file-tree";
import { CodeViewer } from "@/components/code/code-viewer";
import { useProject } from "@/lib/hooks/use-projects";
import { PageSkeleton } from "@/components/shared/skeleton-loader";
import { FileCode2 } from "lucide-react";

export default function CodePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project, isLoading } = useProject(projectId);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingFile, setLoadingFile] = useState(false);

  if (isLoading || !project) {
    return <PageSkeleton />;
  }

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);
    setLoadingFile(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files?path=${encodeURIComponent(filePath)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || "");
      } else {
        setFileContent(`// Failed to load ${filePath}`);
      }
    } catch {
      setFileContent(`// Error loading ${filePath}`);
    } finally {
      setLoadingFile(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="Code" />
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        {/* File tree sidebar */}
        <div className="w-64 shrink-0 overflow-auto border-r border-border bg-muted/20">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Files
          </div>
          <FileTree
            projectId={projectId}
            onSelect={handleFileSelect}
            selectedPath={selectedFile || undefined}
          />
        </div>

        {/* Code viewer */}
        <div className="flex-1 overflow-auto">
          {selectedFile ? (
            loadingFile ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <CodeViewer filePath={selectedFile} content={fileContent} />
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <FileCode2 className="h-10 w-10" />
              <p className="text-sm">Select a file to view its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
