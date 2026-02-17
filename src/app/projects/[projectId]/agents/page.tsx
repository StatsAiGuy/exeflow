"use client";

import { use } from "react";
import { Header } from "@/components/layout/header";
import { AgentList } from "@/components/agents/agent-list";
import { ModelUsage } from "@/components/agents/model-usage";

export default function AgentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  return (
    <div className="flex flex-col">
      <Header title="Agents" />
      <div className="space-y-6 p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AgentList projectId={projectId} />
          </div>
          <div>
            <ModelUsage projectId={projectId} />
          </div>
        </div>
      </div>
    </div>
  );
}
