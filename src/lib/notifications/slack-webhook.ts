interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
  elements?: Array<{ type: string; text: string }>;
}

export class SlackWebhook {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(title: string, message: string, color?: string, fields?: Array<{ label: string; value: string }>): Promise<void> {
    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: { type: "plain_text", text: title, emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: message },
      },
    ];

    if (fields && fields.length > 0) {
      blocks.push({
        type: "section",
        fields: fields.map((f) => ({
          type: "mrkdwn",
          text: `*${f.label}*\n${f.value}`,
        })),
      });
    }

    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `_Exeflow • ${new Date().toLocaleTimeString()}_` }],
    });

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });

      if (!response.ok) {
        console.error(`[Slack] Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error("[Slack] Webhook error:", error);
    }
  }
}
