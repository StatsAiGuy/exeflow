#!/usr/bin/env node

import { Command } from "commander";
import { execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

const program = new Command();

program
  .name("exeflow")
  .description("Autonomous vibecoding platform")
  .version("0.1.0");

program
  .command("start")
  .description("Start the exeflow web interface")
  .option("-p, --port <port>", "Port number", "3001")
  .action(async (options) => {
    console.log("Starting exeflow...");

    // Ensure data directory exists
    const dataDir = path.join(os.homedir(), ".exeflow");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Check if this is first launch
    const configPath = path.join(dataDir, "config.json");
    const isFirstLaunch = !fs.existsSync(configPath);

    if (isFirstLaunch) {
      console.log("First launch detected — opening setup wizard");
    }

    // Start Next.js
    const port = options.port || "3001";
    process.env.PORT = port;

    try {
      execSync(`npx next dev -p ${port}`, {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
        env: { ...process.env, PORT: port },
      });
    } catch {
      // User interrupted with Ctrl+C
    }
  });

program
  .command("doctor")
  .description("Check system prerequisites")
  .action(() => {
    console.log("Running exeflow doctor...\n");
    const checks: Array<{ name: string; status: "ok" | "warn" | "fail"; message: string }> = [];

    // Node.js version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1));
    checks.push({
      name: "Node.js",
      status: nodeMajor >= 20 ? "ok" : "fail",
      message: nodeMajor >= 20 ? `${nodeVersion}` : `${nodeVersion} (requires >=20)`,
    });

    // Git
    try {
      const gitVersion = execSync("git --version", { encoding: "utf8" }).trim();
      checks.push({ name: "Git", status: "ok", message: gitVersion });
    } catch {
      checks.push({ name: "Git", status: "fail", message: "Not found" });
    }

    // pnpm
    try {
      const pnpmVersion = execSync("pnpm --version", { encoding: "utf8" }).trim();
      checks.push({ name: "pnpm", status: "ok", message: `v${pnpmVersion}` });
    } catch {
      checks.push({ name: "pnpm", status: "warn", message: "Not found (npm will be used)" });
    }

    // Claude Code CLI
    try {
      const claudeVersion = execSync("claude --version", { encoding: "utf8" }).trim();
      checks.push({ name: "Claude Code", status: "ok", message: claudeVersion });
    } catch {
      checks.push({ name: "Claude Code", status: "fail", message: "Not found — install with: npm install -g @anthropic-ai/claude-code" });
    }

    // API Key
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    checks.push({
      name: "API Key",
      status: hasApiKey ? "ok" : "warn",
      message: hasApiKey ? "ANTHROPIC_API_KEY set" : "ANTHROPIC_API_KEY not set",
    });

    // GitHub CLI
    try {
      execSync("gh --version", { encoding: "utf8" });
      checks.push({ name: "GitHub CLI", status: "ok", message: "Available" });
    } catch {
      checks.push({ name: "GitHub CLI", status: "warn", message: "Not found (optional)" });
    }

    // Disk space
    const dataDir = path.join(os.homedir(), ".exeflow");
    checks.push({
      name: "Data Directory",
      status: "ok",
      message: dataDir,
    });

    // RAM
    const totalRam = Math.round(os.totalmem() / 1048576);
    const freeRam = Math.round(os.freemem() / 1048576);
    checks.push({
      name: "RAM",
      status: freeRam > 2000 ? "ok" : freeRam > 500 ? "warn" : "fail",
      message: `${freeRam}MB free / ${totalRam}MB total`,
    });

    // Print results
    for (const check of checks) {
      const icon = check.status === "ok" ? "\u2713" : check.status === "warn" ? "!" : "\u2717";
      const color = check.status === "ok" ? "\x1b[32m" : check.status === "warn" ? "\x1b[33m" : "\x1b[31m";
      console.log(`  ${color}${icon}\x1b[0m ${check.name}: ${check.message}`);
    }

    const failures = checks.filter((c) => c.status === "fail");
    if (failures.length > 0) {
      console.log(`\n\x1b[31m${failures.length} check(s) failed.\x1b[0m Fix these before running exeflow.`);
      process.exit(1);
    } else {
      console.log("\n\x1b[32mAll checks passed!\x1b[0m");
    }
  });

program.parse();
