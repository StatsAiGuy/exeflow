"use client";

import { use } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";

export default function TasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  return (
    <div className="flex flex-col">
      <Header title="Tasks" />
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Kanban board with drag-and-drop tasks will be built here.
            <br />
            Project: {projectId}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
