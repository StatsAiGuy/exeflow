"use client";

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

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Settings" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Manage your Claude API key and connection settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Anthropic API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-ant-..."
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Set via ANTHROPIC_API_KEY environment variable.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure Discord and Slack webhook notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discordWebhook">Discord Webhook URL</Label>
              <Input
                id="discordWebhook"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
              <Input
                id="slackWebhook"
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Manage your exeflow data and configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Follow system preference by default.
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
