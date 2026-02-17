"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCreateProject } from "@/lib/hooks/use-projects";
import { cn } from "@/lib/utils";
import type { ProjectStack, ModelConfig } from "@/types/project";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Search,
  ClipboardList,
  Rocket,
  CheckCircle,
  AlertCircle,
  Layers,
  Database,
  Shield,
  Cloud,
  Palette,
  Bot,
  Milestone,
  ListChecks,
} from "lucide-react";

const STEPS = [
  { label: "Project Idea", icon: Lightbulb },
  { label: "Research", icon: Search },
  { label: "Plan Review", icon: ClipboardList },
  { label: "Started", icon: Rocket },
];

const PROJECT_TYPES = [
  "Web App",
  "SaaS",
  "Mobile App",
  "API",
  "E-Commerce",
  "CLI Tool",
];

interface ResearchResult {
  stack: {
    stack: ProjectStack;
    reasoning?: string;
  } | null;
  connections: {
    connections: string;
    reasoning?: string;
  } | null;
  modelConfig: ModelConfig | null;
}

interface PlanMilestone {
  title: string;
  description?: string;
  tasks: Array<{
    title: string;
    description?: string;
    priority?: string;
  }>;
}

interface PlanData {
  id: string;
  projectId: string;
  version: number;
  content: {
    milestones?: PlanMilestone[];
    overview?: string;
  } | null;
  status: string;
  createdAt: string;
  approvedAt: string | null;
}

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

const MODEL_LABELS: Record<string, string> = {
  "claude-opus-4-6": "Opus 4.6",
  "claude-sonnet-4-5-20250929": "Sonnet 4.5",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

const ROLE_LABELS: Record<string, string> = {
  lead: "Lead",
  executorComplex: "Complex Executor",
  executorRoutine: "Routine Executor",
  reviewer: "Reviewer",
  tester: "Tester",
  researcher: "Researcher",
  security: "Security",
};

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();

  // Wizard state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1: Project Idea
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [customType, setCustomType] = useState("");

  // Step 2: Research
  const [projectId, setProjectId] = useState<string | null>(null);
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(
    null,
  );
  const [researchError, setResearchError] = useState("");

  // Step 3: Plan
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planPollCount, setPlanPollCount] = useState(0);

  // Step 4: Starting
  const [starting, setStarting] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  const resolvedType =
    projectType === "custom" ? customType : projectType;

  const isStep1Valid = name.trim() && description.trim() && resolvedType.trim();

  // Navigate to next step
  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, []);

  // Navigate to previous step
  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // Step 2: Create project and trigger research
  const startResearch = useCallback(async () => {
    if (!isStep1Valid) return;
    setResearching(true);
    setResearchError("");

    try {
      // Create project first
      const project = await createProject.mutateAsync({
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: description.trim(),
        projectType: resolvedType.toLowerCase(),
      });
      setProjectId(project.id);

      // Trigger research
      const res = await fetch(`/api/projects/${project.id}/research`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Research request failed");
      }
      const data = await res.json();
      setResearchResult(data);
    } catch (err) {
      setResearchError(
        err instanceof Error ? err.message : "Research failed. Please try again.",
      );
    } finally {
      setResearching(false);
    }
  }, [isStep1Valid, name, description, resolvedType, createProject]);

  // Auto-trigger research when entering step 2
  useEffect(() => {
    if (step === 1 && !researching && !researchResult && !researchError && !projectId) {
      startResearch();
    }
  }, [step, researching, researchResult, researchError, projectId, startResearch]);

  // Step 3: Fetch plan with polling
  const fetchPlan = useCallback(async () => {
    if (!projectId) return;
    setLoadingPlan(true);
    setPlanError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/plan`);
      if (!res.ok) throw new Error("Failed to fetch plan");
      const data = await res.json();

      if (data && data.content) {
        setPlanData(data);
        setLoadingPlan(false);
      } else {
        // Plan not ready yet, will retry
        setPlanPollCount((c) => c + 1);
        setLoadingPlan(false);
      }
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "Failed to load plan.",
      );
      setLoadingPlan(false);
    }
  }, [projectId]);

  // Poll for plan when entering step 3
  useEffect(() => {
    if (step !== 2 || !projectId) return;
    if (planData) return;

    fetchPlan();

    // Poll every 3 seconds if plan isn't ready
    const interval = setInterval(() => {
      if (!planData && planPollCount < 20) {
        fetchPlan();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, projectId, planData, planPollCount, fetchPlan]);

  // Step 4: Start project
  const handleStartProject = useCallback(async () => {
    if (!projectId) return;
    setStarting(true);

    try {
      await fetch(`/api/projects/${projectId}/start`, {
        method: "POST",
      });
      goNext();
    } catch {
      // Still go to step 4 even if start fails
      goNext();
    } finally {
      setStarting(false);
    }
  }, [projectId, goNext]);

  // Step 4: Redirect after a delay
  useEffect(() => {
    if (step === 3 && projectId) {
      const timer = setTimeout(() => {
        router.push(`/projects/${projectId}`);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step, projectId, router]);

  function renderStackItem(
    icon: React.ReactNode,
    label: string,
    value: { choice: string; reasoning: string } | undefined,
  ) {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            <Badge variant="secondary" className="text-[10px]">
              {value.choice}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            {value.reasoning}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="New Project" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
        {/* Step indicator */}
        <div className="space-y-3">
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isComplete = i < step;
              return (
                <div
                  key={s.label}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors",
                    isActive
                      ? "text-foreground font-medium"
                      : isComplete
                        ? "text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {isComplete ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* Step 1: Project Idea */}
            {step === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Describe Your Idea
                  </CardTitle>
                  <CardDescription>
                    Tell us what you want to build. The more detail you provide,
                    the better the AI can research, plan, and execute your
                    project.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input
                        id="name"
                        placeholder="my-awesome-app"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        Will be converted to a URL-friendly slug.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Project Type</Label>
                      <Select
                        value={projectType}
                        onValueChange={(val) => {
                          setProjectType(val);
                          if (val !== "custom") setCustomType("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Custom...</SelectItem>
                        </SelectContent>
                      </Select>
                      {projectType === "custom" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Input
                            placeholder="Enter custom project type"
                            value={customType}
                            onChange={(e) => setCustomType(e.target.value)}
                            autoFocus
                          />
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Project Description</Label>
                      <Textarea
                        id="description"
                        placeholder="I want to build a SaaS platform that helps small businesses track their inventory. It should have user authentication, a dashboard showing stock levels, and email alerts when items run low. The target users are small retail store owners who need a simple, affordable solution..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[160px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Include features, target users, and any technical
                        preferences.
                      </p>
                    </div>

                    <Button
                      onClick={goNext}
                      className="w-full"
                      disabled={!isStep1Valid}
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Research */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Research
                  </CardTitle>
                  <CardDescription>
                    {researching
                      ? "Analyzing your project idea and researching the optimal stack, connections, and model configuration..."
                      : researchResult
                        ? "Research complete. Review the recommended configuration below."
                        : researchError
                          ? "Something went wrong during research."
                          : "Starting research..."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Loading state */}
                    {researching && (
                      <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground animate-pulse">
                            Researching optimal configuration...
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-12 w-full" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error state */}
                    {researchError && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                          <p className="text-sm text-destructive">
                            {researchError}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={goBack}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => {
                              setResearchError("");
                              setProjectId(null);
                              setResearchResult(null);
                              startResearch();
                            }}
                          >
                            <Loader2 className="mr-2 h-4 w-4" />
                            Retry Research
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {researchResult && !researching && (
                      <ScrollArea className="max-h-[460px]">
                        <div className="space-y-4 pr-2">
                          {/* Stack */}
                          {researchResult.stack?.stack && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-medium flex items-center gap-2">
                                <Layers className="h-4 w-4 text-muted-foreground" />
                                Recommended Stack
                              </h3>
                              <div className="space-y-2">
                                {renderStackItem(
                                  <Layers className="h-4 w-4" />,
                                  "Framework",
                                  researchResult.stack.stack.framework,
                                )}
                                {renderStackItem(
                                  <Database className="h-4 w-4" />,
                                  "Database",
                                  researchResult.stack.stack.database,
                                )}
                                {renderStackItem(
                                  <Shield className="h-4 w-4" />,
                                  "Auth",
                                  researchResult.stack.stack.auth,
                                )}
                                {renderStackItem(
                                  <Cloud className="h-4 w-4" />,
                                  "Deployment",
                                  researchResult.stack.stack.deployment,
                                )}
                                {renderStackItem(
                                  <Palette className="h-4 w-4" />,
                                  "Styling",
                                  researchResult.stack.stack.styling,
                                )}
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* Connections */}
                          {researchResult.connections && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-medium flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                Connections
                              </h3>
                              <div className="rounded-lg border bg-muted/30 p-3">
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                  {typeof researchResult.connections.connections === "string"
                                    ? researchResult.connections.connections
                                    : JSON.stringify(
                                        researchResult.connections.connections,
                                        null,
                                        2,
                                      )}
                                </p>
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* Model Config */}
                          {researchResult.modelConfig && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-medium flex items-center gap-2">
                                <Bot className="h-4 w-4 text-muted-foreground" />
                                Model Configuration
                              </h3>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(researchResult.modelConfig).map(
                                  ([role, model]) => (
                                    <div
                                      key={role}
                                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                                    >
                                      <span className="text-xs text-muted-foreground">
                                        {ROLE_LABELS[role] || role}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px]"
                                      >
                                        {MODEL_LABELS[model] || model}
                                      </Badge>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}

                    {/* Navigation */}
                    {researchResult && !researching && (
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={goBack}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <Button className="flex-1" onClick={goNext}>
                          Next
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Plan Review */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Plan Review
                  </CardTitle>
                  <CardDescription>
                    {loadingPlan || (!planData && !planError)
                      ? "Loading the project plan..."
                      : planData
                        ? "Review the project plan below. When ready, start the project."
                        : "Could not load a plan."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Loading */}
                    {(loadingPlan || (!planData && !planError)) && (
                      <div className="space-y-4 py-4">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground animate-pulse">
                            {planPollCount > 3
                              ? "Plan is being generated, this may take a moment..."
                              : "Loading project plan..."}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <Skeleton className="h-6 w-40" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-6 w-36 mt-4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {planError && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                          <p className="text-sm text-destructive">
                            {planError}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPlanError("");
                            setPlanPollCount(0);
                            fetchPlan();
                          }}
                        >
                          <Loader2 className="mr-2 h-4 w-4" />
                          Retry
                        </Button>
                      </div>
                    )}

                    {/* Plan content */}
                    {planData?.content && (
                      <ScrollArea className="max-h-[420px]">
                        <div className="space-y-4 pr-2">
                          {/* Overview */}
                          {planData.content.overview && (
                            <div className="rounded-lg border bg-muted/30 p-3">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {planData.content.overview}
                              </p>
                            </div>
                          )}

                          {/* Milestones */}
                          {planData.content.milestones?.map(
                            (milestone, mIndex) => (
                              <div key={mIndex} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Milestone className="h-4 w-4 text-primary" />
                                  <h3 className="text-sm font-medium">
                                    {milestone.title}
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {milestone.tasks?.length || 0} tasks
                                  </Badge>
                                </div>
                                {milestone.description && (
                                  <p className="text-xs text-muted-foreground pl-6">
                                    {milestone.description}
                                  </p>
                                )}
                                {milestone.tasks?.length > 0 && (
                                  <div className="ml-6 space-y-1">
                                    {milestone.tasks.map((task, tIndex) => (
                                      <div
                                        key={tIndex}
                                        className="flex items-start gap-2 rounded border px-3 py-2"
                                      >
                                        <ListChecks className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <span className="text-xs font-medium">
                                            {task.title}
                                          </span>
                                          {task.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {task.description}
                                            </p>
                                          )}
                                        </div>
                                        {task.priority && (
                                          <Badge
                                            variant={
                                              task.priority === "high"
                                                ? "destructive"
                                                : task.priority === "medium"
                                                  ? "secondary"
                                                  : "outline"
                                            }
                                            className="text-[9px] shrink-0"
                                          >
                                            {task.priority}
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {mIndex <
                                  (planData.content?.milestones?.length || 0) -
                                    1 && <Separator className="my-2" />}
                              </div>
                            ),
                          )}

                          {/* Fallback: plan has no milestones but has content */}
                          {!planData.content.milestones?.length &&
                            !planData.content.overview && (
                              <div className="rounded-lg border bg-muted/30 p-3">
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                                  {JSON.stringify(planData.content, null, 2)}
                                </pre>
                              </div>
                            )}
                        </div>
                      </ScrollArea>
                    )}

                    {/* No plan found after polling */}
                    {!planData &&
                      !loadingPlan &&
                      !planError &&
                      planPollCount >= 20 && (
                        <div className="rounded-lg border bg-muted/30 p-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            No plan has been generated yet. You can still start
                            the project and a plan will be created during
                            execution.
                          </p>
                        </div>
                      )}

                    {/* Navigation */}
                    {(planData || planPollCount >= 20) && !loadingPlan && (
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={goBack}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleStartProject}
                          disabled={starting}
                        >
                          {starting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Rocket className="mr-2 h-4 w-4" />
                          )}
                          {starting ? "Starting..." : "Start Project"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Started */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-5 w-5" />
                    Project Started
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4 py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: 0.1,
                      }}
                    >
                      <CheckCircle className="h-16 w-16 text-green-500" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-center space-y-2"
                    >
                      <h3 className="text-lg font-semibold">
                        Your project is underway!
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Agents are now researching, planning, and building your
                        project. You will be redirected to the project dashboard
                        shortly.
                      </p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/projects/${projectId}`)}
                      >
                        Go to Project
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
