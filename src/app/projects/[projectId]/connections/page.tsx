"use client";

import { use, useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plug, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

interface Connection {
  id: string;
  project_id: string;
  name: string;
  type: string;
  config: string;
  status: string;
  installed_at: string;
}

export default function ProjectConnectionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/connections`)
      .then((res) => res.json())
      .then((data) => setConnections(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="flex flex-col">
      <Header title="Connections">
        <Button size="sm" variant="outline" className="ml-auto">
          <Plus className="mr-1 h-3 w-3" /> Add Connection
        </Button>
      </Header>
      <div className="p-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Plug className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No connections configured for this project.
              </p>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" /> Add Connection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((conn) => (
              <Card key={conn.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Plug className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{conn.name}</CardTitle>
                    </div>
                    {conn.status === "active" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <CardDescription>
                    <Badge variant="secondary" className="text-xs">
                      {conn.type}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
