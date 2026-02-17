"use client";

import { use } from "react";
import { Header } from "@/components/layout/header";
import { PlanTree } from "@/components/plan/plan-tree";

export default function PlanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  return (
    <div className="flex flex-col">
      <Header title="Plan Board" />
      <div className="p-6">
        <PlanTree projectId={projectId} />
      </div>
    </div>
  );
}
