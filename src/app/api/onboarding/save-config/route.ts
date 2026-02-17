import { NextResponse } from "next/server";
import { setCredential } from "@/lib/connections/credentials";
import { readConfig, writeConfig } from "@/lib/config";
import { initializeDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { authMode, apiKey, maxAuth, machineSpecs, github, notifications } = body;

    // Ensure DB is initialized
    initializeDb();

    // Save auth configuration
    if (authMode === "apikey" && apiKey) {
      setCredential("anthropic", "api_key", apiKey);
    }

    // Update config
    const config = readConfig();

    // Save auth mode
    config.authMode = authMode || "apikey";
    if (maxAuth) {
      config.maxSubscription = {
        email: maxAuth.email,
        subscriptionType: maxAuth.subscriptionType,
      };
    }

    if (machineSpecs) {
      config.machineSpecs = machineSpecs;
    }

    if (github) {
      config.github = {
        orgName: github.orgName || "",
        connected: !!github.orgName && !!github.token,
      };
      if (github.token) {
        setCredential("github", "token", github.token);
      }
    }

    if (notifications) {
      config.notifications = {
        discord: {
          mode: notifications.discordWebhook ? "webhook" as const : "off" as const,
          webhookUrl: notifications.discordWebhook || undefined,
        },
        slack: {
          enabled: !!notifications.slackWebhook,
          webhookUrl: notifications.slackWebhook || "",
        },
      };
      if (notifications.discordWebhook) {
        setCredential("discord", "webhook_url", notifications.discordWebhook);
      }
      if (notifications.slackWebhook) {
        setCredential("slack", "webhook_url", notifications.slackWebhook);
      }
    }

    config.onboardingComplete = true;
    config.onboardingCompletedAt = new Date().toISOString();

    writeConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 },
    );
  }
}
