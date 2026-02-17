"use client";

import { use } from "react";
import { Header } from "@/components/layout/header";
import { TaskList } from "@/components/tasks/task-list";

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
        <TaskList projectId={projectId} />
      </div>
    </div>
  );
}
