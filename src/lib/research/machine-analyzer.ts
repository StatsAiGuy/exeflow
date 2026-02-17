import { getDb, withRetry } from "@/lib/db";
import { scanCapabilities, type MachineCapabilities } from "@/lib/system/capability-scanner";

export function analyzeMachine(): MachineCapabilities {
  const capabilities = scanCapabilities();

  // Store in database
  const db = getDb();
  withRetry(() => {
    db.prepare(
      `INSERT OR REPLACE INTO machine_capabilities (id, capabilities_json, scanned_at)
       VALUES (1, ?, ?)`,
    ).run(JSON.stringify(capabilities), Date.now());
  });

  return capabilities;
}

export function getCachedCapabilities(): MachineCapabilities | null {
  const db = getDb();
  const row = db
    .prepare("SELECT capabilities_json FROM machine_capabilities WHERE id = 1")
    .get() as { capabilities_json: string } | undefined;

  if (!row) return null;
  return JSON.parse(row.capabilities_json);
}

export function getCapabilitiesSummary(caps: MachineCapabilities): string {
  const lines: string[] = [];
  lines.push(`OS: ${caps.os.platform} ${caps.os.version} (${caps.os.arch})`);
  lines.push(`CPU: ${caps.cpu.cores} cores — ${caps.cpu.model}`);
  lines.push(`RAM: ${caps.ram.totalMB}MB total, ${caps.ram.freeMB}MB free`);
  lines.push(`Disk: ${caps.disk.freeMB}MB free / ${caps.disk.totalMB}MB total`);
  if (caps.gpu.available) {
    lines.push(`GPU: ${caps.gpu.name} (${caps.gpu.vramMB}MB VRAM)`);
  }
  lines.push(`Node.js: ${caps.runtime.nodeVersion}`);
  if (caps.runtime.pnpmVersion) lines.push(`pnpm: v${caps.runtime.pnpmVersion}`);
  if (caps.runtime.gitVersion) lines.push(`Git: ${caps.runtime.gitVersion}`);
  if (caps.containerization.dockerAvailable) {
    lines.push(`Docker: ${caps.containerization.dockerVersion}`);
  }
  if (caps.containerization.wslAvailable) {
    lines.push(`WSL: ${caps.containerization.wslDistro || "available"}`);
  }
  return lines.join("\n");
}
