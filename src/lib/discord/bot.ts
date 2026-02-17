import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  type TextChannel,
  type Interaction,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import type { DiscordEmbed } from "./embeds";
import { EXEFLOW_COMMANDS } from "./commands";
import {
  handleSlashCommand,
  handleButtonInteraction,
  buildCheckpointButtons,
  type InteractionResponse,
  type ButtonRow,
} from "./interactions";

interface DiscordBotConfig {
  mode: "bot" | "webhook" | "off";
  webhookUrl?: string;
  botToken?: string;
  guildId?: string;
  dmUserId?: string;
}

export class DiscordBot {
  private config: DiscordBotConfig;
  private client: Client | null = null;
  private started = false;

  constructor(config: DiscordBotConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.config.mode === "off") return;

    if (this.config.mode === "webhook") {
      if (!this.config.webhookUrl) {
        throw new Error("Discord webhook URL is required in webhook mode");
      }
      this.started = true;
      return;
    }

    // Bot mode with discord.js
    if (!this.config.botToken) {
      throw new Error("Discord bot token is required in bot mode");
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ],
    });

    // Register event handlers
    this.client.on("interactionCreate", (interaction) =>
      this.handleInteraction(interaction),
    );

    this.client.once("ready", () => {
      console.log(`[Discord] Bot logged in as ${this.client?.user?.tag}`);
    });

    // Login
    await this.client.login(this.config.botToken);

    // Register slash commands with the guild
    await this.registerCommands();

    this.started = true;
  }

  async stop(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    this.started = false;
  }

  async sendEmbed(
    embed: DiscordEmbed,
    channelId?: string,
    components?: ButtonRow[],
  ): Promise<void> {
    if (this.config.mode === "off" || !this.started) return;

    if (this.config.mode === "webhook" && this.config.webhookUrl) {
      await this.sendWebhook(embed);
      return;
    }

    // Bot mode: send to specific channel
    if (this.client && channelId) {
      try {
        const channel = await this.client.channels.fetch(channelId);
        if (channel?.isTextBased() && "send" in channel) {
          const discordEmbed = this.toDiscordEmbed(embed);
          const messageOptions: Record<string, unknown> = {
            embeds: [discordEmbed],
          };
          if (components?.length) {
            messageOptions.components = components.map((row) =>
              this.toActionRow(row),
            );
          }
          await (channel as TextChannel).send(messageOptions);
          return;
        }
      } catch (error) {
        console.error(`[Discord] Failed to send to channel ${channelId}:`, error);
      }
    }

    // Fallback to webhook
    if (this.config.webhookUrl) {
      await this.sendWebhook(embed);
    }
  }

  async sendDM(
    embed: DiscordEmbed,
    components?: ButtonRow[],
  ): Promise<void> {
    if (this.config.mode === "off" || !this.started) return;

    if (this.config.mode === "bot" && this.client && this.config.dmUserId) {
      try {
        const user = await this.client.users.fetch(this.config.dmUserId);
        const dmChannel = await user.createDM();
        const discordEmbed = this.toDiscordEmbed(embed);
        const messageOptions: Record<string, unknown> = {
          embeds: [discordEmbed],
        };
        if (components?.length) {
          messageOptions.components = components.map((row) =>
            this.toActionRow(row),
          );
        }
        await dmChannel.send(messageOptions);
        return;
      } catch (error) {
        console.error("[Discord] Failed to send DM:", error);
      }
    }

    // Fallback to webhook
    if (this.config.webhookUrl) {
      await this.sendWebhook(embed);
    }
  }

  /**
   * Send a checkpoint notification as a DM with approve/reject/defer buttons.
   */
  async sendCheckpointDM(
    embed: DiscordEmbed,
    checkpointId: string,
  ): Promise<void> {
    const buttons = buildCheckpointButtons(checkpointId);
    await this.sendDM(embed, [buttons]);
  }

  /**
   * Create a text channel for a project in the configured guild.
   */
  async createProjectChannel(channelName: string): Promise<string | null> {
    if (this.config.mode !== "bot" || !this.client || !this.config.guildId)
      return null;

    try {
      const guild = await this.client.guilds.fetch(this.config.guildId);
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: `Exeflow project channel for ${channelName}`,
      });
      return channel.id;
    } catch (error) {
      console.error(`[Discord] Failed to create channel ${channelName}:`, error);
      return null;
    }
  }

  // --- Private methods ---

  private async registerCommands(): Promise<void> {
    if (!this.config.botToken || !this.config.guildId) return;

    const rest = new REST().setToken(this.config.botToken);

    // Build slash command definitions from our command spec
    const exeflowCommand = new SlashCommandBuilder()
      .setName("exeflow")
      .setDescription("Exeflow autonomous coding platform");

    for (const cmd of EXEFLOW_COMMANDS) {
      exeflowCommand.addSubcommand((sub) => {
        sub.setName(cmd.name).setDescription(cmd.description);
        if (cmd.options) {
          for (const opt of cmd.options) {
            if (opt.type === 3) {
              sub.addStringOption((o) =>
                o
                  .setName(opt.name)
                  .setDescription(opt.description)
                  .setRequired(opt.required ?? false),
              );
            }
          }
        }
        return sub;
      });
    }

    try {
      await rest.put(
        Routes.applicationGuildCommands(
          this.client!.user!.id,
          this.config.guildId,
        ),
        { body: [exeflowCommand.toJSON()] },
      );
      console.log("[Discord] Slash commands registered");
    } catch (error) {
      console.error("[Discord] Failed to register commands:", error);
    }
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      await this.handleChatCommand(interaction);
    } else if (interaction.isButton()) {
      await this.handleButton(interaction);
    }
  }

  private async handleChatCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    // Only handle /exeflow commands
    if (interaction.commandName !== "exeflow") return;

    const subcommand = interaction.options.getSubcommand();
    const options: Record<string, string> = {};
    for (const opt of interaction.options.data[0]?.options ?? []) {
      if (opt.value !== undefined) {
        options[opt.name] = String(opt.value);
      }
    }

    const response = handleSlashCommand(subcommand, options);
    await this.sendInteractionResponse(interaction, response);
  }

  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    const response = handleButtonInteraction(interaction.customId);
    await this.sendInteractionResponse(interaction, response);
  }

  private async sendInteractionResponse(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    response: InteractionResponse,
  ): Promise<void> {
    try {
      if (response.type === "embed" && response.embed) {
        const embed = this.toDiscordEmbed(response.embed);
        await interaction.reply({
          embeds: [embed],
          ephemeral: response.ephemeral ?? false,
        });
      } else {
        await interaction.reply({
          content: response.content || "Done.",
          ephemeral: response.ephemeral ?? (response.type === "error"),
        });
      }
    } catch (error) {
      console.error("[Discord] Failed to send interaction response:", error);
    }
  }

  private toDiscordEmbed(embed: DiscordEmbed): EmbedBuilder {
    const builder = new EmbedBuilder()
      .setTitle(embed.title)
      .setDescription(embed.description)
      .setColor(embed.color);

    if (embed.fields) {
      for (const field of embed.fields) {
        builder.addFields({
          name: field.name,
          value: field.value,
          inline: field.inline,
        });
      }
    }

    if (embed.timestamp) {
      builder.setTimestamp(new Date(embed.timestamp));
    }

    if (embed.footer) {
      builder.setFooter({ text: embed.footer.text });
    } else {
      builder.setFooter({ text: "Exeflow" });
    }

    return builder;
  }

  private toActionRow(row: ButtonRow): ActionRowBuilder<ButtonBuilder> {
    const actionRow = new ActionRowBuilder<ButtonBuilder>();

    for (const btn of row.components) {
      const styleMap: Record<number, ButtonStyle> = {
        1: ButtonStyle.Primary,
        2: ButtonStyle.Secondary,
        3: ButtonStyle.Success,
        4: ButtonStyle.Danger,
      };

      const button = new ButtonBuilder()
        .setCustomId(btn.custom_id)
        .setLabel(btn.label)
        .setStyle(styleMap[btn.style] || ButtonStyle.Secondary);

      actionRow.addComponents(button);
    }

    return actionRow;
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
        console.error(
          `[Discord] Webhook failed: ${response.status} ${response.statusText}`,
        );
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
