import { getDb, withRetry } from "@/lib/db";
import { generateId } from "@/lib/utils/id";
import { eventBus } from "@/lib/events/emitter";
import type { NotificationPayload, NotificationConfig } from "./types";

// Rate limiting: track last notification per level
const lastNotification = new Map<string, number>();
const RATE_LIMITS: Record<string, number> = {
  info: 300000,      // 5 minutes
  warning: 0,         // immediate (deduplicated)
  error: 0,           // immediate
  critical: 0,        // immediate
};

export class NotificationRouter {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  async send(payload: NotificationPayload): Promise<void> {
    // Rate limiting
    const key = `${payload.level}:${payload.projectId}`;
    const lastTime = lastNotification.get(key) || 0;
    const limit = RATE_LIMITS[payload.level] || 0;
    if (limit > 0 && Date.now() - lastTime < limit) {
      return; // Throttled
    }
    lastNotification.set(key, Date.now());

    // Persist to database
    this.persistNotification(payload);

    // Send to all enabled channels
    const promises: Promise<void>[] = [];

    if (this.config.web.enabled) {
      promises.push(this.sendWeb(payload));
    }

    if (this.config.discord?.mode === "webhook" && this.config.discord.webhookUrl) {
      promises.push(this.sendDiscordWebhook(payload));
    }

    if (this.config.slack?.enabled && this.config.slack.webhookUrl) {
      promises.push(this.sendSlackWebhook(payload));
    }

    await Promise.allSettled(promises);
  }

  private persistNotification(payload: NotificationPayload): void {
    try {
      const db = getDb();
      withRetry(() => {
        db.prepare(
          `INSERT INTO notifications (id, project_id, level, title, message, action_required, action_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          generateId(),
          payload.projectId,
          payload.level,
          payload.title,
          payload.message,
          payload.actionRequired ? 1 : 0,
          payload.actionUrl || null,
          Date.now(),
        );
      });
    } catch {
      // Don't block on DB errors
    }
  }

  private async sendWeb(payload: NotificationPayload): Promise<void> {
    eventBus.emit("notification", payload.projectId, {
      title: payload.title,
      message: payload.message,
      level: payload.level,
      actionRequired: payload.actionRequired,
    });
  }

  private async sendDiscordWebhook(payload: NotificationPayload): Promise<void> {
    const webhookUrl = this.config.discord?.webhookUrl;
    if (!webhookUrl) return;

    const colorMap = {
      info: 0x3b82f6,
      warning: 0xf59e0b,
      error: 0xef4444,
      critical: 0xdc2626,
    };

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: payload.title,
              description: payload.message,
              color: colorMap[payload.level],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch {
      // Webhook failures are non-critical
    }
  }

  private async sendSlackWebhook(payload: NotificationPayload): Promise<void> {
    const webhookUrl = this.config.slack?.webhookUrl;
    if (!webhookUrl) return;

    const emojiMap = {
      info: ":information_source:",
      warning: ":warning:",
      error: ":x:",
      critical: ":rotating_light:",
    };

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${emojiMap[payload.level]} *${payload.title}*\n${payload.message}`,
        }),
      });
    } catch {
      // Webhook failures are non-critical
    }
  }
}
