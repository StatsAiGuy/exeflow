"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgents, type AgentSession } from "@/lib/hooks/use-agents";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelUsageProps {
  projectId: string;
}

interface ModelStats {
  model: string;
  sessions: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

function getModelLabel(model: string): string {
  if (model.includes("opus")) return "Opus";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku")) return "Haiku";
  return model;
}

function getModelColor(model: string): string {
  if (model.includes("opus")) return "bg-purple-500";
  if (model.includes("sonnet")) return "bg-blue-500";
  if (model.includes("haiku")) return "bg-green-500";
  return "bg-gray-500";
}

export function ModelUsage({ projectId }: ModelUsageProps) {
  const { data: agents, isLoading } = useAgents(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Model Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Model Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            No usage data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Aggregate by model
  const modelMap = new Map<string, ModelStats>();
  for (const agent of agents) {
    const existing = modelMap.get(agent.model);
    if (existing) {
      existing.sessions += 1;
      existing.inputTokens += agent.tokens_input;
      existing.outputTokens += agent.tokens_output;
      existing.totalTokens += agent.tokens_input + agent.tokens_output;
    } else {
      modelMap.set(agent.model, {
        model: agent.model,
        sessions: 1,
        inputTokens: agent.tokens_input,
        outputTokens: agent.tokens_output,
        totalTokens: agent.tokens_input + agent.tokens_output,
      });
    }
  }

  const stats = Array.from(modelMap.values()).sort(
    (a, b) => b.totalTokens - a.totalTokens,
  );
  const totalTokens = stats.reduce((sum, s) => sum + s.totalTokens, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Model Usage</CardTitle>
          <span className="text-xs text-muted-foreground">
            {totalTokens.toLocaleString()} total tokens
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.map((stat) => {
          const percentage =
            totalTokens > 0
              ? Math.round((stat.totalTokens / totalTokens) * 100)
              : 0;

          return (
            <div key={stat.model} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${getModelColor(stat.model)}`}
                  />
                  <span className="text-sm font-medium">
                    {getModelLabel(stat.model)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {stat.sessions} sessions
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {stat.totalTokens.toLocaleString()} ({percentage}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className={`h-1.5 rounded-full ${getModelColor(stat.model)} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
