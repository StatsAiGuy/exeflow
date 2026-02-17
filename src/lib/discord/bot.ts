import type { DiscordEmbed } from "./embeds";

interface DiscordBotConfig {
  mode: "bot" | "webhook" | "off";
  webhookUrl?: string;
  botToken?: string;
  guildId?: string;
  dmUserId?: string;
}

export class DiscordBot {
  private config: DiscordBotConfig;
  private started = false;

  constructor(config: DiscordBotConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.config.mode === "off") return;

    if (this.config.mode === "webhook") {
      // Webhook mode: no bot to start, just validates the URL
      if (!this.config.webhookUrl) {
        throw new Error("Discord webhook URL is required in webhook mode");
      }
      this.started = true;
      return;
    }

    // Bot mode requires discord.js (optional dependency)
    // For now, fall back to webhook mode if discord.js isn't installed
    console.log("[Discord] Bot mode requires discord.js — falling back to webhook mode");
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  async sendEmbed(embed: DiscordEmbed, channelId?: string): Promise<void> {
    if (this.config.mode === "off" || !this.started) return;

    if (this.config.mode === "webhook" && this.config.webhookUrl) {
      await this.sendWebhook(embed);
      return;
    }

    // Bot mode: would use discord.js client.channels.cache.get(channelId).send()
    // For now, fall back to webhook
    if (this.config.webhookUrl) {
      await this.sendWebhook(embed);
    }
  }

  async sendDM(embed: DiscordEmbed): Promise<void> {
    if (this.config.mode !== "bot" || !this.started) return;
    // Would use discord.js to send DM — requires bot mode with discord.js
    console.log("[Discord] DM sending requires full bot mode with discord.js");
  }

  private async sendWebhook(embed: DiscordEmbed): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: embed.title,
              description: embed.description,
              color: embed.color,
              fields: embed.fields,
              timestamp: embed.timestamp,
              footer: embed.footer || { text: "Exeflow" },
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error(`[Discord] Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("[Discord] Webhook error:", error);
    }
  }

  get isActive(): boolean {
    return this.started && this.config.mode !== "off";
  }
}

// Singleton instance
let discordBot: DiscordBot | null = null;

export function getDiscordBot(): DiscordBot | null {
  return discordBot;
}

export function initDiscordBot(config: DiscordBotConfig): DiscordBot {
  discordBot = new DiscordBot(config);
  return discordBot;
}
