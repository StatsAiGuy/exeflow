import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "discord.js",
    "@discordjs/ws",
    "@discordjs/rest",
    "better-sqlite3",
    "@anthropic-ai/claude-agent-sdk",
    "@modelcontextprotocol/sdk",
  ],
};

export default nextConfig;
