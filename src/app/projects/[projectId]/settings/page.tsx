"use client";

import { use } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useProject } from "@/lib/hooks/use-projects";
import { PageSkeleton } from "@/components/shared/skeleton-loader";
import { Settings, Cpu, Shield, Trash2 } from "lucide-react";

const MODEL_OPTIONS = [
  { value: "claude-opus-4-6", label: "Opus (Most Capable)" },
  { value: "claude-sonnet-4-5-20250929", label: "Sonnet (Balanced)" },
  { value: "claude-haiku-4-5-20251001", label: "Haiku (Fastest)" },
];

const AGENT_ROLES = [
  { key: "lead", label: "Lead Orchestrator", description: "Strategic decisions" },
  { key: "executorComplex", label: "Executor (Complex)", description: "Multi-file, architectural tasks" },
  { key: "executorRoutine", label: "Executor (Routine)", description: "Single-file, boilerplate tasks" },
  { key: "reviewer", label: "Reviewer", description: "Code review and quality checks" },
  { key: "tester", label: "Tester", description: "Run tests and validation" },
  { key: "researcher", label: "Researcher", description: "Stack and connection research" },
  { key: "security", label: "Security Reviewer", description: "Vulnerability analysis" },
];

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading || !project) {
    return <PageSkeleton />;
  }

  const modelConfig = project.modelConfig;

  return (
    <div className="flex flex-col">
      <Header title="Project Settings" />
      <div className="max-w-3xl space-y-6 p-6">
        {/* General */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <CardTitle className="text-base">General</CardTitle>
            </div>
            <CardDescription>Basic project information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{project.name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <div>
                <Badge variant="secondary">{project.projectType}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Description
              </Label>
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Model Delegation */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              <CardTitle className="text-base">Model Delegation</CardTitle>
            </div>
            <CardDescription>
              Configure which model handles each agent role. Changes apply to
              the next cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {AGENT_ROLES.map((role) => (
                <div
                  key={role.key}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{role.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                  <Select
                    defaultValue={
                      modelConfig
                        ? (modelConfig as unknown as Record<string, string>)[role.key]
                        : undefined
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Execution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <CardTitle className="text-base">Execution</CardTitle>
            </div>
            <CardDescription>
              Control how the autonomous loop behaves
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Autonomous Mode</p>
                <p className="text-xs text-muted-foreground">
                  Skip checkpoints and let the lead agent decide
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-commit</p>
                <p className="text-xs text-muted-foreground">
                  Automatically commit after each successful cycle
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base text-destructive">
                Danger Zone
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm">
              Delete Project
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
