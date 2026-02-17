import { eventBus } from "@/lib/events/emitter";
import { initDiscordBot, getDiscordBot } from "@/lib/discord/bot";
import { NotificationRouter } from "./router";
import { readConfig } from "@/lib/config";
import type { ExeflowEvent } from "@/types/events";
import type { NotificationConfig } from "./types";

/**
 * Notification bridge: connects the event bus to the notification router.
 *
 * Initializes the Discord bot (if configured), creates a NotificationRouter,
 * and subscribes to key events to send notifications to all configured channels.
 */

let router: NotificationRouter | null = null;
let unsubscribe: (() => void) | null = null;

export async function startNotificationBridge(): Promise<void> {
  if (router) return;

  const config = readConfig();
  const discordConfig = config.notifications?.discord;
  const slackConfig = config.notifications?.slack;

  // Initialize Discord bot if configured
  if (discordConfig && discordConfig.mode !== "off") {
    try {
      const bot = initDiscordBot({
        mode: discordConfig.mode,
        webhookUrl: discordConfig.webhookUrl,
        botToken: discordConfig.botToken,
        guildId: discordConfig.guildId,
        dmUserId: discordConfig.dmUserId,
      });
      await bot.start();
    } catch (error) {
      console.error("[Notifications] Failed to start Discord bot:", error);
    }
  }

  // Build notification config
  const notifConfig: NotificationConfig = {
    discord: discordConfig
      ? {
          mode: discordConfig.mode,
          webhookUrl: discordConfig.webhookUrl,
          botToken: discordConfig.botToken,
          guildId: discordConfig.guildId,
          dmUserId: discordConfig.dmUserId,
        }
      : undefined,
    slack: slackConfig
      ? {
          enabled: slackConfig.enabled,
          webhookUrl: slackConfig.webhookUrl,
        }
      : undefined,
    web: { enabled: true },
  };

  router = new NotificationRouter(notifConfig);

  // Subscribe to events
  unsubscribe = eventBus.onAll((event: ExeflowEvent) => {
    if (!event.projectId || !router) return;

    const payload = eventToNotification(event);
    if (payload) {
      router.send(payload).catch(() => {
        // Notification failures are non-critical
      });
    }
  });
}

export function stopNotificationBridge(): void {
  unsubscribe?.();
  unsubscribe = null;
  router = null;

  const bot = getDiscordBot();
  if (bot) {
    bot.stop().catch(() => {});
  }
}

function eventToNotification(event: ExeflowEvent) {
  const data = event.data ?? {};

  switch (event.eventType) {
    case "project_completed":
      return {
        projectId: event.projectId!,
        title: "Project Completed",
        message: `Project has been completed successfully.${data.summary ? ` Summary: ${data.summary}` : ""}`,
        level: "info" as const,
        actionRequired: false,
      };

    case "project_paused":
      return {
        projectId: event.projectId!,
        title: "Project Paused",
        message: `Project paused. Reason: ${data.reason || "user requested"}`,
        level: "warning" as const,
        actionRequired: data.reason === "paused_awaiting_input",
      };

    case "checkpoint_created":
      return {
        projectId: event.projectId!,
        title: "Checkpoint — Input Needed",
        message: (data.question as string) || "Agent needs your input",
        level: "warning" as const,
        actionRequired: true,
        actionUrl: `/projects/${event.projectId}`,
      };

    case "milestone_completed":
      return {
        projectId: event.projectId!,
        title: "Milestone Reached",
        message: `Milestone "${data.title || "Milestone"}" completed.`,
        level: "info" as const,
        actionRequired: false,
      };

    case "error":
      return {
        projectId: event.projectId!,
        title: "Error",
        message: `${data.message || data.error || "An error occurred"}`,
        level: "error" as const,
        actionRequired: false,
      };

    case "agent_failed":
      return {
        projectId: event.projectId!,
        title: "Agent Failed",
        message: `${data.role || "Agent"} failed: ${data.error || "unknown error"}`,
        level: "error" as const,
        actionRequired: false,
      };

    default:
      return null;
  }
}
