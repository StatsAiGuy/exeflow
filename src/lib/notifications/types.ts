export type NotificationChannel = "discord" | "slack" | "web";

export interface NotificationPayload {
  projectId: string;
  title: string;
  message: string;
  level: "info" | "warning" | "error" | "critical";
  actionRequired?: boolean;
  actionUrl?: string;
  data?: Record<string, unknown>;
}

export interface NotificationConfig {
  discord?: {
    mode: "bot" | "webhook" | "off";
    webhookUrl?: string;
    botToken?: string;
    guildId?: string;
    dmUserId?: string;
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
  };
  web: {
    enabled: boolean;
  };
}
