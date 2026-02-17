"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  Bell,
  Monitor,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Cpu,
} from "lucide-react";

interface MachineSpecs {
  os: string;
  cpuCores: number;
  cpuModel: string;
  totalRamMb: number;
  freeRamMb: number;
  freeDiskMb: number;
  nodeVersion: string;
  gitVersion: string;
}

export default function SettingsPage() {
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [specs, setSpecs] = useState<MachineSpecs | null>(null);
  const [discordUrl, setDiscordUrl] = useState("");
  const [slackUrl, setSlackUrl] = useState("");

  useEffect(() => {
    // Load machine specs
    fetch("/api/onboarding/machine-specs")
      .then((res) => res.json())
      .then((data) => {
        if (data.specs) setSpecs(data.specs);
      })
      .catch(() => {});
  }, []);

  const checkApiKey = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/onboarding/validate-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setApiKeyValid(data.valid ?? false);
    } catch {
      setApiKeyValid(false);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="Settings" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
        {/* API Key */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <CardTitle className="text-base">API Configuration</CardTitle>
            </div>
            <CardDescription>
              Your Claude API key is read from the ANTHROPIC_API_KEY environment
              variable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                type="password"
                value="sk-ant-••••••••••••••••"
                disabled
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={checkApiKey}
                disabled={checking}
              >
                {checking ? (
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                ) : apiKeyValid === true ? (
                  <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />
                ) : apiKeyValid === false ? (
                  <XCircle className="mr-1 h-3 w-3 text-red-500" />
                ) : null}
                Validate
              </Button>
            </div>
            {apiKeyValid === true && (
              <p className="text-xs text-green-500">API key is valid</p>
            )}
            {apiKeyValid === false && (
              <p className="text-xs text-red-500">
                API key is invalid or not set
              </p>
            )}
          </CardContent>
        </Card>

        {/* Machine Specs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              <CardTitle className="text-base">Machine</CardTitle>
            </div>
            <CardDescription>
              System capabilities detected by exeflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {specs ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">OS</Label>
                  <p>{specs.os}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CPU</Label>
                  <p>
                    {specs.cpuModel} ({specs.cpuCores} cores)
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">RAM</Label>
                  <p>
                    {Math.round(specs.totalRamMb / 1024)} GB (
                    {Math.round(specs.freeRamMb / 1024)} GB free)
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Disk</Label>
                  <p>{Math.round(specs.freeDiskMb / 1024)} GB free</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Node.js
                  </Label>
                  <p>{specs.nodeVersion}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Git</Label>
                  <p>{specs.gitVersion}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading specs...</p>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure webhook URLs for remote notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discord">Discord Webhook URL</Label>
              <Input
                id="discord"
                placeholder="https://discord.com/api/webhooks/..."
                value={discordUrl}
                onChange={(e) => setDiscordUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slack">Slack Webhook URL</Label>
              <Input
                id="slack"
                placeholder="https://hooks.slack.com/services/..."
                value={slackUrl}
                onChange={(e) => setSlackUrl(e.target.value)}
              />
            </div>
            <Button size="sm">Save Notification Settings</Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <CardTitle className="text-base">Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Follow system preference by default
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Sound Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Play a sound on checkpoints
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <CardTitle className="text-base">Data Management</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-muted-foreground">
                  SQLite database stored locally
                </p>
              </div>
              <Badge variant="secondary">SQLite</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Learning Data</p>
                <p className="text-xs text-muted-foreground">
                  Cross-project learnings by type
                </p>
              </div>
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
