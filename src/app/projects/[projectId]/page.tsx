"use client";

import { use } from "react";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject, useProjectAction } from "@/lib/hooks/use-projects";
import { useSSE } from "@/lib/hooks/use-sse";
import { PageSkeleton } from "@/components/shared/skeleton-loader";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Activity,
  GitBranch,
  Bot,
  ListTodo,
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

  return (
    <div className="flex flex-col">
      <Header title={project.name}>
        <StatusBadge status={project.status} />
        <div className="ml-auto flex items-center gap-2">
          {project.status === "setup" && (
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
        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Project Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {project.description}
            </p>
            <div className="flex gap-2">
              <Badge variant="secondary">{project.projectType}</Badge>
              {project.gitRepo && (
                <Badge variant="outline">
                  <GitBranch className="mr-1 h-3 w-3" />
                  {project.gitRepo}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different views */}
        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">
              <Activity className="mr-1 h-3 w-3" /> Activity
            </TabsTrigger>
            <TabsTrigger value="agents">
              <Bot className="mr-1 h-3 w-3" /> Agents
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <ListTodo className="mr-1 h-3 w-3" /> Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {events.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No activity yet.{" "}
                    {project.status === "setup" && "Start the project to begin."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {events.slice(-20).reverse().map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 rounded border border-border p-2 text-xs"
                      >
                        <span className="font-mono text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.eventType}
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

          <TabsContent value="agents" className="mt-4">
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground py-8">
                Agent visualization will appear here when agents are running.
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground py-8">
                Task kanban will appear here when a plan is active.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
