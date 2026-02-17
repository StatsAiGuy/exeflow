"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Checkpoint {
  id: string;
  project_id: string;
  type: string;
  question: string;
  context: string | null;
  status: string;
  created_at: string;
}

interface ApprovalQueueProps {
  projectId?: string;
}

export function ApprovalQueue({ projectId }: ApprovalQueueProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const url = projectId
      ? `/api/projects/${projectId}/checkpoints?status=pending`
      : `/api/notifications?undismissed=true`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setCheckpoints(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleRespond = async (
    checkpointId: string,
    projectIdForCheckpoint: string,
    response: string,
  ) => {
    setResponding(checkpointId);
    try {
      await fetch(
        `/api/projects/${projectIdForCheckpoint}/checkpoints`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkpointId, response }),
        },
      );
      setCheckpoints((prev) => prev.filter((c) => c.id !== checkpointId));
      queryClient.invalidateQueries({ queryKey: ["checkpoints"] });
    } catch {
      // ignore
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4" /> Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (checkpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4" /> Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            No pending approvals
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4" /> Pending Approvals
            <Badge variant="secondary" className="ml-1">
              {checkpoints.length}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-80">
          <div className="space-y-2">
            {checkpoints.map((cp) => (
              <div
                key={cp.id}
                className={cn(
                  "rounded-lg border border-border p-3",
                  cp.type === "approval"
                    ? "border-l-4 border-l-yellow-500"
                    : cp.type === "clarification"
                      ? "border-l-4 border-l-blue-500"
                      : "border-l-4 border-l-orange-500",
                )}
              >
                <div className="mb-2 flex items-start justify-between">
                  <Badge variant="outline" className="text-xs">
                    {cp.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(cp.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="mb-3 text-sm">{cp.question}</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 gap-1"
                    disabled={responding === cp.id}
                    onClick={() =>
                      handleRespond(cp.id, cp.project_id, "approved")
                    }
                  >
                    <Check className="h-3 w-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 gap-1"
                    disabled={responding === cp.id}
                    onClick={() =>
                      handleRespond(cp.id, cp.project_id, "rejected")
                    }
                  >
                    <X className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
