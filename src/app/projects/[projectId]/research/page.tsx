"use client";

import { use, useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search } from "lucide-react";

interface ResearchDoc {
  id: string;
  project_id: string;
  topic: string;
  content: string;
  agent_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export default function ResearchPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [docs, setDocs] = useState<ResearchDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<ResearchDoc | null>(null);

  useEffect(() => {
    // Fetch research docs (using events endpoint as proxy for now)
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((project) => {
        // Show stack info as a research document
        if (project.stack) {
          setDocs([
            {
              id: "stack-research",
              project_id: projectId,
              topic: "Stack Research",
              content: JSON.stringify(project.stack, null, 2),
              agent_id: null,
              created_at: project.createdAt,
              updated_at: null,
            },
          ]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="flex flex-col">
      <Header title="Research" />
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : docs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Search className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No research documents yet. Start the project to trigger research.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Doc list */}
            <div className="space-y-2">
              {docs.map((doc) => (
                <Card
                  key={doc.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedDoc?.id === doc.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedDoc(doc)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm">{doc.topic}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </Badge>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Doc content */}
            <div className="lg:col-span-2">
              {selectedDoc ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedDoc.topic}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-[600px]">
                      <pre className="whitespace-pre-wrap text-sm text-foreground/90">
                        {selectedDoc.content}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    Select a document to view its contents.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
