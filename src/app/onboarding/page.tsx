"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  ExternalLink,
  Github,
  Bell,
} from "lucide-react";

const STEPS = [
  "Welcome",
  "API Key",
  "Machine Specs",
  "Setup Research",
  "GitHub",
  "Notifications",
  "Done",
];

interface MachineSpecs {
  cpu: { cores: number; model: string };
  ram: { totalMB: number; freeMB: number };
  disk: { totalMB: number; freeMB: number };
  os: { platform: string; version: string; arch: string };
  runtime: { node: string; npm?: string; git?: string };
  gpu?: { available: boolean; name?: string };
  docker?: { available: boolean; version?: string };
}

interface SetupRecommendation {
  recommendations: Array<{
    category: string;
    item: string;
    reason: string;
    priority: "essential" | "recommended" | "optional";
  }>;
  mcpServers: Array<{
    name: string;
    package: string;
    description: string;
    essential: boolean;
  }>;
  warnings: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Auth mode: "apikey" or "max"
  const [authMode, setAuthMode] = useState<"apikey" | "max" | null>(null);

  // API Key state
  const [apiKey, setApiKey] = useState("");
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValid, setKeyValid] = useState(false);
  const [keyError, setKeyError] = useState("");

  // Max subscription state
  const [checkingMax, setCheckingMax] = useState(false);
  const [maxAuth, setMaxAuth] = useState<{
    authenticated: boolean;
    email?: string;
    subscriptionType?: string;
  } | null>(null);
  const [maxError, setMaxError] = useState("");

  // Machine specs state
  const [machineSpecs, setMachineSpecs] = useState<MachineSpecs | null>(null);
  const [scanningSpecs, setScanningSpecs] = useState(false);

  // Setup research state
  const [setupRecs, setSetupRecs] = useState<SetupRecommendation | null>(null);
  const [researchingSetup, setResearchingSetup] = useState(false);
  const [selectedMcps, setSelectedMcps] = useState<Set<string>>(new Set());
  const [installingMcps, setInstallingMcps] = useState(false);
  const [mcpResults, setMcpResults] = useState<
    Array<{ name: string; success: boolean; error?: string }>
  >([]);

  // GitHub state
  const [githubOrg, setGithubOrg] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [validatingGithub, setValidatingGithub] = useState(false);
  const [githubValid, setGithubValid] = useState(false);
  const [githubError, setGithubError] = useState("");

  // Notifications state
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");

  // Saving state
  const [saving, setSaving] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  const checkMaxAuth = useCallback(async () => {
    setCheckingMax(true);
    setMaxError("");
    try {
      const res = await fetch("/api/onboarding/check-claude-auth", {
        method: "POST",
      });
      const data = await res.json();
      if (data.authenticated) {
        setMaxAuth(data);
        setKeyValid(true);
        setStep(2);
      } else {
        setMaxError(data.error || "Claude Code is not authenticated");
      }
    } catch {
      setMaxError("Failed to check Claude Code auth");
    } finally {
      setCheckingMax(false);
    }
  }, []);

  const validateApiKey = useCallback(async () => {
    setValidatingKey(true);
    setKeyError("");
    try {
      const res = await fetch("/api/onboarding/validate-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      setKeyValid(data.valid);
      if (data.valid) {
        setStep(2);
      } else {
        setKeyError(data.error || "Invalid API key");
      }
    } catch {
      setKeyError("Failed to validate API key");
    } finally {
      setValidatingKey(false);
    }
  }, [apiKey]);

  const scanMachine = useCallback(async () => {
    setScanningSpecs(true);
    try {
      const res = await fetch("/api/onboarding/machine-specs", {
        method: "POST",
      });
      const data = await res.json();
      setMachineSpecs(data);
    } catch {
      // Specs failed but we can continue
    } finally {
      setScanningSpecs(false);
    }
  }, []);

  const researchSetup = useCallback(async () => {
    setResearchingSetup(true);
    try {
      const res = await fetch("/api/onboarding/research-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(machineSpecs || {}),
      });
      const data = await res.json();
      setSetupRecs(data);
      // Pre-select all MCP servers
      if (data.mcpServers) {
        setSelectedMcps(
          new Set(data.mcpServers.map((s: { name: string }) => s.name)),
        );
      }
    } catch {
      // Research failed, continue with defaults
    } finally {
      setResearchingSetup(false);
    }
  }, [machineSpecs]);

  const installSelectedMcps = useCallback(async () => {
    if (!setupRecs?.mcpServers || selectedMcps.size === 0) return;
    setInstallingMcps(true);
    try {
      const servers = setupRecs.mcpServers.filter((s) =>
        selectedMcps.has(s.name),
      );
      const res = await fetch("/api/onboarding/install-mcps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servers }),
      });
      const data = await res.json();
      setMcpResults(data.results || []);
    } catch {
      // Installation failed
    } finally {
      setInstallingMcps(false);
    }
  }, [setupRecs, selectedMcps]);

  const validateGithub = useCallback(async () => {
    setValidatingGithub(true);
    setGithubError("");
    try {
      const res = await fetch("/api/onboarding/connect-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName: githubOrg, token: githubToken }),
      });
      const data = await res.json();
      setGithubValid(data.valid);
      if (!data.valid) {
        setGithubError(data.error || "Connection failed");
      }
    } catch {
      setGithubError("Failed to connect to GitHub");
    } finally {
      setValidatingGithub(false);
    }
  }, [githubOrg, githubToken]);

  const saveAndFinish = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/onboarding/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authMode,
          apiKey: authMode === "apikey" ? apiKey : undefined,
          maxAuth: authMode === "max" ? maxAuth : undefined,
          machineSpecs,
          github:
            githubOrg && githubToken
              ? { orgName: githubOrg, token: githubToken }
              : undefined,
          notifications: {
            discordWebhook: discordWebhook || undefined,
            slackWebhook: slackWebhook || undefined,
          },
        }),
      });
      router.push("/");
    } catch {
      // Save failed but still redirect
      router.push("/");
    } finally {
      setSaving(false);
    }
  }, [authMode, apiKey, maxAuth, machineSpecs, githubOrg, githubToken, discordWebhook, slackWebhook, router]);

  function formatBytes(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-4">
            <Progress value={progress} className="h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
          <CardTitle className="text-xl">{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <>
              <CardDescription className="text-sm leading-relaxed">
                Welcome to Exeflow — the autonomous vibecoding platform. Describe
                your project idea and Exeflow handles everything: researching the
                optimal stack, configuring connections, orchestrating agents, and
                building your project with minimal input.
              </CardDescription>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                <p className="font-medium">What you will need:</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Claude Max subscription or API key</li>
                  <li>GitHub account (recommended)</li>
                  <li>A project idea</li>
                </ul>
              </div>
              <Button onClick={() => setStep(1)} className="w-full">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {/* Step 1: Authentication */}
          {step === 1 && (
            <>
              {!authMode ? (
                <>
                  <CardDescription>
                    Choose how to authenticate with Claude. Your Max subscription
                    works directly — no separate API credits needed.
                  </CardDescription>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setAuthMode("max");
                        checkMaxAuth();
                      }}
                      className="w-full rounded-lg border-2 border-primary/50 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Use Claude Subscription (Recommended)
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uses your existing Claude Code login. No API key needed.
                        Works with Pro, Max 5x, and Max 20x plans.
                      </p>
                    </button>
                    <button
                      onClick={() => setAuthMode("apikey")}
                      className="w-full rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        Use API Key
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pay-as-you-go via console.anthropic.com. Separate from subscription.
                      </p>
                    </button>
                  </div>
                  <Button variant="outline" onClick={() => setStep(0)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                </>
              ) : authMode === "max" ? (
                <>
                  <CardDescription>
                    Checking your Claude Code authentication...
                  </CardDescription>
                  {checkingMax && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin mr-3" />
                      <span className="text-sm text-muted-foreground">
                        Detecting Claude subscription...
                      </span>
                    </div>
                  )}
                  {maxAuth?.authenticated && (
                    <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Authenticated via {maxAuth.subscriptionType?.toUpperCase() || "Claude"} subscription
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Signed in as {maxAuth.email}
                      </p>
                    </div>
                  )}
                  {maxError && (
                    <div className="space-y-2">
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {maxError}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Make sure Claude Code is installed and you are logged in.
                        Run <code className="bg-muted px-1 rounded">claude login</code> in
                        your terminal to authenticate.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setAuthMode(null); setMaxError(""); setMaxAuth(null); }}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    {maxError && (
                      <Button onClick={checkMaxAuth} disabled={checkingMax} className="flex-1">
                        {checkingMax && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Retry
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <CardDescription>
                    Enter your Anthropic API key. This powers all agent sessions.
                  </CardDescription>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="sk-ant-..."
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setKeyValid(false);
                        setKeyError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && apiKey) validateApiKey();
                      }}
                    />
                    {keyError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {keyError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Get your key at{" "}
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        console.anthropic.com
                        <ExternalLink className="inline ml-0.5 h-3 w-3" />
                      </a>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setAuthMode(null); setKeyError(""); }}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={validateApiKey}
                      disabled={!apiKey || validatingKey}
                      className="flex-1"
                    >
                      {validatingKey ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : keyValid ? (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      ) : null}
                      {validatingKey ? "Validating..." : keyValid ? "Validated" : "Validate"}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 2: Machine Specs */}
          {step === 2 && (
            <>
              <CardDescription>
                Scan your machine to optimize agent concurrency and stack
                recommendations. No sensitive data is collected.
              </CardDescription>
              {!machineSpecs ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={scanMachine}
                    disabled={scanningSpecs}
                    className="flex-1"
                  >
                    {scanningSpecs && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {scanningSpecs ? "Scanning..." : "Scan Machine"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        CPU
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {machineSpecs.cpu.cores} cores
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MemoryStick className="h-4 w-4 text-muted-foreground" />
                        RAM
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(machineSpecs.ram.totalMB)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        Disk
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(machineSpecs.disk.freeMB)} free
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        OS
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {machineSpecs.os.platform} {machineSpecs.os.arch}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => setStep(3)} className="flex-1">
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 3: Setup Research */}
          {step === 3 && (
            <>
              <CardDescription>
                Recommended MCP servers for your development environment.
                {!setupRecs && " Click research to get AI-powered recommendations."}
              </CardDescription>

              {!setupRecs && !researchingSetup && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={researchSetup} className="flex-1">
                    Research Setup
                  </Button>
                </div>
              )}

              {researchingSetup && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                  <span className="text-sm text-muted-foreground">
                    Researching optimal setup...
                  </span>
                </div>
              )}

              {setupRecs && (
                <>
                  {setupRecs.warnings.length > 0 && (
                    <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 space-y-1">
                      {setupRecs.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400 flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> {w}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">MCP Servers</p>
                    {setupRecs.mcpServers.map((server) => (
                      <label
                        key={server.name}
                        className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                      >
                        <Switch
                          checked={selectedMcps.has(server.name)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedMcps);
                            if (checked) {
                              next.add(server.name);
                            } else {
                              next.delete(server.name);
                            }
                            setSelectedMcps(next);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{server.name}</span>
                            {server.essential && (
                              <Badge variant="secondary" className="text-[10px]">
                                Essential
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {server.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {mcpResults.length > 0 && (
                    <div className="space-y-1">
                      {mcpResults.map((r) => (
                        <p
                          key={r.name}
                          className={`text-xs flex items-center gap-1 ${r.success ? "text-green-600" : "text-destructive"}`}
                        >
                          {r.success ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {r.name}: {r.success ? "Installed" : r.error}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    {mcpResults.length === 0 ? (
                      <Button
                        onClick={installSelectedMcps}
                        disabled={installingMcps || selectedMcps.size === 0}
                        className="flex-1"
                      >
                        {installingMcps && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {installingMcps
                          ? "Installing..."
                          : `Install ${selectedMcps.size} Selected`}
                      </Button>
                    ) : (
                      <Button onClick={() => setStep(4)} className="flex-1">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 4: GitHub */}
          {step === 4 && (
            <>
              <CardDescription>
                Connect a GitHub organization for your exeflow projects. Create a
                dedicated org and generate a fine-grained PAT scoped to it.
              </CardDescription>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="githubOrg">GitHub Organization</Label>
                  <Input
                    id="githubOrg"
                    placeholder="my-exeflow-projects"
                    value={githubOrg}
                    onChange={(e) => {
                      setGithubOrg(e.target.value);
                      setGithubValid(false);
                      setGithubError("");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    <a
                      href="https://github.com/account/organizations/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      Create a new org
                      <ExternalLink className="inline ml-0.5 h-3 w-3" />
                    </a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="githubToken">Fine-Grained PAT</Label>
                  <Input
                    id="githubToken"
                    type="password"
                    placeholder="github_pat_..."
                    value={githubToken}
                    onChange={(e) => {
                      setGithubToken(e.target.value);
                      setGithubValid(false);
                      setGithubError("");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    <a
                      href="https://github.com/settings/personal-access-tokens/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      Generate a token
                      <ExternalLink className="inline ml-0.5 h-3 w-3" />
                    </a>
                    {" "}— scope it to your org with repo + admin permissions.
                  </p>
                </div>
                {githubError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {githubError}
                  </p>
                )}
                {githubValid && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Connected to {githubOrg}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {githubOrg && githubToken && !githubValid ? (
                  <Button
                    onClick={validateGithub}
                    disabled={validatingGithub}
                    className="flex-1"
                  >
                    {validatingGithub && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Github className="mr-2 h-4 w-4" />
                    {validatingGithub ? "Connecting..." : "Connect"}
                  </Button>
                ) : (
                  <Button onClick={() => setStep(5)} className="flex-1">
                    {githubValid ? "Continue" : "Skip for Now"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Step 5: Notifications */}
          {step === 5 && (
            <>
              <CardDescription>
                Optionally connect Discord or Slack webhooks to receive project
                notifications on your phone.
              </CardDescription>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="discord" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Discord Webhook URL
                  </Label>
                  <Input
                    id="discord"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordWebhook}
                    onChange={(e) => setDiscordWebhook(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slack" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Slack Webhook URL
                  </Label>
                  <Input
                    id="slack"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Both are optional. You can configure these later in Settings.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(6)} className="flex-1">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* Step 6: Done */}
          {step === 6 && (
            <>
              <div className="flex flex-col items-center gap-4 py-6">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <CardDescription className="text-center text-sm">
                  Exeflow is ready. Your configuration has been saved.
                </CardDescription>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Authentication</span>
                  <Badge variant="default">
                    {authMode === "max"
                      ? `${maxAuth?.subscriptionType?.toUpperCase() || "Subscription"} (${maxAuth?.email || "connected"})`
                      : "API Key"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Machine</span>
                  <Badge variant={machineSpecs ? "default" : "secondary"}>
                    {machineSpecs ? "Scanned" : "Skipped"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GitHub</span>
                  <Badge variant={githubValid ? "default" : "secondary"}>
                    {githubValid ? githubOrg : "Skipped"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notifications</span>
                  <Badge
                    variant={
                      discordWebhook || slackWebhook ? "default" : "secondary"
                    }
                  >
                    {discordWebhook || slackWebhook ? "Configured" : "None"}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={saveAndFinish}
                disabled={saving}
                className="w-full"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
