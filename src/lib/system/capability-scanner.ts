import os from "os";
import { execSync } from "child_process";

export interface MachineCapabilities {
  cpu: {
    cores: number;
    model: string;
  };
  ram: {
    totalMB: number;
    freeMB: number;
  };
  disk: {
    freeMB: number;
    totalMB: number;
  };
  gpu: {
    available: boolean;
    name: string | null;
    vramMB: number | null;
  };
  os: {
    platform: NodeJS.Platform;
    version: string;
    arch: string;
  };
  runtime: {
    nodeVersion: string;
    npmVersion: string | null;
    pnpmVersion: string | null;
    gitVersion: string | null;
  };
  containerization: {
    dockerAvailable: boolean;
    dockerVersion: string | null;
    wslAvailable: boolean;
    wslDistro: string | null;
  };
}

function tryExec(command: string): string | null {
  try {
    return execSync(command, { encoding: "utf8", timeout: 10000 }).trim();
  } catch {
    return null;
  }
}

function getDiskSpace(): { freeMB: number; totalMB: number } {
  try {
    if (process.platform === "win32") {
      const output = tryExec(
        'wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /format:csv',
      );
      if (output) {
        const lines = output.split("\n").filter((l) => l.trim());
        const last = lines[lines.length - 1];
        const parts = last.split(",");
        if (parts.length >= 3) {
          return {
            freeMB: Math.round(parseInt(parts[1]) / 1048576),
            totalMB: Math.round(parseInt(parts[2]) / 1048576),
          };
        }
      }
    } else {
      const output = tryExec("df -m / | tail -1");
      if (output) {
        const parts = output.split(/\s+/);
        return {
          totalMB: parseInt(parts[1]) || 0,
          freeMB: parseInt(parts[3]) || 0,
        };
      }
    }
  } catch {
    // Fall through
  }
  return { freeMB: 0, totalMB: 0 };
}

function getGpuInfo(): { available: boolean; name: string | null; vramMB: number | null } {
  const nvidiaSmi = tryExec("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits");
  if (nvidiaSmi) {
    const parts = nvidiaSmi.split(",").map((s) => s.trim());
    return {
      available: true,
      name: parts[0] || null,
      vramMB: parts[1] ? parseInt(parts[1]) : null,
    };
  }
  return { available: false, name: null, vramMB: null };
}

export function scanCapabilities(): MachineCapabilities {
  const cpus = os.cpus();
  const disk = getDiskSpace();
  const gpu = getGpuInfo();

  return {
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || "Unknown",
    },
    ram: {
      totalMB: Math.round(os.totalmem() / 1048576),
      freeMB: Math.round(os.freemem() / 1048576),
    },
    disk,
    gpu,
    os: {
      platform: os.platform(),
      version: os.release(),
      arch: os.arch(),
    },
    runtime: {
      nodeVersion: process.version,
      npmVersion: tryExec("npm --version"),
      pnpmVersion: tryExec("pnpm --version"),
      gitVersion: tryExec("git --version")?.replace("git version ", "") ?? null,
    },
    containerization: {
      dockerAvailable: tryExec("docker --version") !== null,
      dockerVersion: tryExec("docker --version")?.replace("Docker version ", "")?.split(",")[0] ?? null,
      wslAvailable: process.platform === "win32" && tryExec("wsl --status") !== null,
      wslDistro: process.platform === "win32" ? tryExec("wsl -l -q")?.split("\n")[0]?.trim() ?? null : null,
    },
  };
}

export function calculateMaxParallelAgents(capabilities: MachineCapabilities): number {
  const ramBased = Math.floor(capabilities.ram.freeMB / 350);
  const cpuBased = Math.max(capabilities.cpu.cores - 1, 1);
  const hardCap = 4;
  return Math.max(1, Math.min(ramBased, cpuBased, hardCap));
}
