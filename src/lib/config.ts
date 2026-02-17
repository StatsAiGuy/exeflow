import fs from "fs";
import path from "path";
import { getConfigPath, getExeflowDataDir } from "@/lib/claude/paths";

export interface ExeflowConfig {
  onboardingComplete: boolean;
  onboardingCompletedAt?: string;
  machineSpecs?: Record<string, unknown>;
  github?: {
    orgName: string;
    connected: boolean;
  };
  notifications?: {
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
  };
  preferences?: {
    defaultModel?: string;
    theme?: string;
  };
}

const DEFAULT_CONFIG: ExeflowConfig = {
  onboardingComplete: false,
};

export function readConfig(): ExeflowConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: ExeflowConfig): void {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
}

export function isOnboardingComplete(): boolean {
  return readConfig().onboardingComplete;
}

export function ensureDataDir(): void {
  const dataDir = getExeflowDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}
