"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Bot,
  Brain,
  Code,
  Search,
  TestTube,
  Shield,
  Rocket,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgents, type AgentSession } from "@/lib/hooks/use-agents";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<string, typeof Bot> = {
  lead: Brain,
  executor: Code,
  reviewer: Search,
  tester: TestTube,
  security: Shield,
  planner: Rocket,
  researcher: Search,
};

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Bot; color: string; label: string }
> = {
  running: { icon: Loader2, color: "text-blue-500", label: "Running" },
  completed: { icon: CheckCircle2, color: "text-green-500", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
  waiting: { icon: Clock, color: "text-yellow-500", label: "Waiting" },
};

function AgentCard({ agent, index }: { agent: AgentSession; index: number }) {
  const RoleIcon = ROLE_ICONS[agent.role] || Bot;
  const statusConfig = STATUS_CONFIG[agent.status] || STATUS_CONFIG.running;
  const StatusIcon = statusConfig.icon;

  const totalTokens = agent.tokens_input + agent.tokens_output;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <div className="flex items-start gap-3 rounded-lg border border-border p-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            agent.status === "running"
              ? "bg-blue-500/10"
              : agent.status === "completed"
                ? "bg-green-500/10"
                : agent.status === "failed"
                  ? "bg-red-500/10"
                  : "bg-muted",
          )}
        >
          <RoleIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium capitalize">{agent.role}</span>
            <div className="flex items-center gap-1.5">
              <StatusIcon
                className={cn(
                  "h-3.5 w-3.5",
                  statusConfig.color,
                  agent.status === "running" && "animate-spin",
                )}
              />
              <span className={cn("text-xs", statusConfig.color)}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {agent.model.split("-").pop()}
            </Badge>
            {totalTokens > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalTokens.toLocaleString()} tokens
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(agent.started_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          {agent.prompt_summary && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {agent.prompt_summary}
            </p>
          )}

          {agent.result_summary && (
            <p className="mt-1 line-clamp-2 text-xs text-foreground/80">
              {agent.result_summary}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface AgentListProps {
  projectId: string;
}

export function AgentList({ projectId }: AgentListProps) {
  const { data: agents, isLoading } = useAgents(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Agent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const running = agents?.filter((a) => a.status === "running") || [];
  const completed = agents?.filter((a) => a.status !== "running") || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Agent Sessions</CardTitle>
          {running.length > 0 && (
            <Badge variant="default" className="text-xs">
              {running.length} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!agents || agents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No agent sessions yet. Start the project to spawn agents.
          </p>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {running.map((agent, i) => (
                  <AgentCard key={agent.id} agent={agent} index={i} />
                ))}
              </AnimatePresence>

              {running.length > 0 && completed.length > 0 && (
                <Separator className="my-3" />
              )}

              <AnimatePresence mode="popLayout">
                {completed.map((agent, i) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    index={running.length + i}
                  />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
