"use client";

import { useState } from "react";
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
import { CheckCircle, Loader2, ArrowRight, ArrowLeft } from "lucide-react";

const STEPS = [
  "Welcome",
  "API Key",
  "Machine Specs",
  "Setup Research",
  "GitHub",
  "Done",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValid, setKeyValid] = useState(false);
  const [machineSpecs, setMachineSpecs] = useState<Record<string, unknown> | null>(null);
  const [scanningSpecs, setScanningSpecs] = useState(false);
  const [githubOrg, setGithubOrg] = useState("");
  const [githubToken, setGithubToken] = useState("");

  const progress = ((step + 1) / STEPS.length) * 100;

  async function validateApiKey() {
    setValidatingKey(true);
    try {
      const res = await fetch("/api/onboarding/validate-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      setKeyValid(data.valid);
      if (data.valid) setStep(2);
    } catch {
      setKeyValid(false);
    } finally {
      setValidatingKey(false);
    }
  }

  async function scanMachine() {
    setScanningSpecs(true);
    try {
      const res = await fetch("/api/onboarding/machine-specs", {
        method: "POST",
      });
      const data = await res.json();
      setMachineSpecs(data);
      setStep(3);
    } catch {
      // Handle error
    } finally {
      setScanningSpecs(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-4">
            <Progress value={progress} className="h-1" />
            <p className="mt-2 text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <>
              <CardDescription>
                Welcome to Exeflow! This wizard will set up your environment
                for autonomous vibecoding. You will need a Claude API key and
                optionally a GitHub account.
              </CardDescription>
              <Button onClick={() => setStep(1)} className="w-full">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {/* Step 1: API Key */}
          {step === 1 && (
            <>
              <CardDescription>
                Enter your Anthropic API key to power the agent engine.
              </CardDescription>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                >
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
                  Validate
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Machine Specs */}
          {step === 2 && (
            <>
              <CardDescription>
                We will gather your machine specs (CPU, RAM, disk, OS) to
                optimize the vibecoding experience. No sensitive data is
                collected.
              </CardDescription>
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
                  Scan Machine
                </Button>
              </div>
              {machineSpecs && (
                <pre className="mt-4 max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(machineSpecs, null, 2)}
                </pre>
              )}
            </>
          )}

          {/* Step 3: Setup Research */}
          {step === 3 && (
            <>
              <CardDescription>
                Claude is researching the optimal vibecoding setup for your
                machine. This may take a moment.
              </CardDescription>
              <Button onClick={() => setStep(4)} className="w-full">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {/* Step 4: GitHub */}
          {step === 4 && (
            <>
              <CardDescription>
                Connect a GitHub organization for your exeflow projects. Create
                a dedicated org and generate a fine-grained PAT scoped to it.
              </CardDescription>
              <div className="space-y-2">
                <Label htmlFor="githubOrg">GitHub Organization</Label>
                <Input
                  id="githubOrg"
                  placeholder="my-exeflow-projects"
                  value={githubOrg}
                  onChange={(e) => setGithubOrg(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="githubToken">Personal Access Token</Label>
                <Input
                  id="githubToken"
                  type="password"
                  placeholder="github_pat_..."
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => setStep(5)}
                  className="flex-1"
                >
                  {githubOrg && githubToken ? "Connect" : "Skip for Now"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <>
              <div className="flex flex-col items-center gap-4 py-6">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <CardDescription className="text-center">
                  You are all set! Exeflow is ready to build.
                </CardDescription>
              </div>
              <Button
                onClick={() => router.push("/")}
                className="w-full"
              >
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
