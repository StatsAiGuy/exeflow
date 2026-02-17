"use client";

import { use } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject, useProjectAction } from "@/lib/hooks/use-projects";
import { useSSE } from "@/lib/hooks/use-sse";
import { PageSkeleton } from "@/components/shared/skeleton-loader";
import { ExecutionLoopViz } from "@/components/execution/execution-loop-viz";
import { ChatPanel } from "@/components/chat/chat-panel";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Activity,
  GitBranch,
  Bot,
  ListTodo,
  ClipboardList,
  Code,
  Plug,
  Settings,
} from "lucide-react";

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project, isLoading } = useProject(projectId);
  const actions = useProjectAction(projectId);
  const { events, connected } = useSSE(projectId);

  if (isLoading || !project) {
    return <PageSkeleton />;
  }

  // Determine current phase from events
  const latestPhaseEvent = events
    .filter((e) => e.eventType === "phase_started")
    .pop();
  const currentPhase = latestPhaseEvent?.data?.state as string | undefined;
  const cycleEvents = events.filter((e) => e.eventType === "cycle_started");
  const cycleNumber = cycleEvents.length > 0
    ? (cycleEvents[cycleEvents.length - 1]?.data?.cycleNumber as number) || 0
    : 0;

  const completedPhases = events
    .filter((e) => e.eventType === "phase_completed")
    .map((e) => e.data?.phase as string)
    .filter(Boolean);

  const navLinks = [
    { href: `/projects/${projectId}/plan`, label: "Plan", icon: ClipboardList },
    { href: `/projects/${projectId}/tasks`, label: "Tasks", icon: ListTodo },
    { href: `/projects/${projectId}/agents`, label: "Agents", icon: Bot },
    { href: `/projects/${projectId}/code`, label: "Code", icon: Code },
    { href: `/projects/${projectId}/connections`, label: "Connections", icon: Plug },
    { href: `/projects/${projectId}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col">
      <Header title={project.name}>
        <StatusBadge status={project.status} />
        <div className="ml-auto flex items-center gap-2">
          {(project.status === "setup" || project.status === "stopped") && (
            <Button size="sm" onClick={() => actions.start.mutate()}>
              <Play className="mr-1 h-3 w-3" /> Start
            </Button>
          )}
          {project.status === "running" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => actions.pause.mutate()}
            >
              <Pause className="mr-1 h-3 w-3" /> Pause
            </Button>
          )}
          {project.status === "paused" && (
            <Button size="sm" onClick={() => actions.resume.mutate()}>
              <RotateCcw className="mr-1 h-3 w-3" /> Resume
            </Button>
          )}
          {(project.status === "running" || project.status === "paused") && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => actions.stop.mutate()}
            >
              <Square className="mr-1 h-3 w-3" /> Stop
            </Button>
          )}
        </div>
      </Header>

      <div className="space-y-6 p-6">
        {/* Execution Loop Visualizer */}
        {project.status !== "setup" && (
          <ExecutionLoopViz
            currentPhase={currentPhase || null}
            cycleNumber={cycleNumber}
            completedPhases={completedPhases}
          />
        )}

        {/* Project Info + Quick Nav */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{project.projectType}</Badge>
                {project.gitRepo && (
                  <Badge variant="outline">
                    <GitBranch className="mr-1 h-3 w-3" />
                    {project.gitRepo}
                  </Badge>
                )}
                {project.stack && (
                  <Badge variant="outline">
                    {project.stack.framework?.choice || "No framework"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <link.icon className="mr-2 h-3.5 w-3.5" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">
              <Activity className="mr-1 h-3 w-3" /> Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {events.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No activity yet.{" "}
                    {project.status === "setup" && "Start the project to begin."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {events
                      .slice(-20)
                      .reverse()
                      .map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-2 rounded border border-border p-2 text-xs"
                        >
                          <span className="font-mono text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {event.eventType.replace(/_/g, " ")}
                          </Badge>
                          {event.data && (
                            <span className="truncate text-muted-foreground">
                              {JSON.stringify(event.data).slice(0, 100)}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
                {connected && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Live
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Panel */}
      <ChatPanel />
    </div>
  );
}
