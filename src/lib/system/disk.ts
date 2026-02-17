import { scanCapabilities } from "./capability-scanner";

export type DiskStatus = "ok" | "warning" | "critical";

export interface DiskCheckResult {
  status: DiskStatus;
  freeMB: number;
  message: string;
}

const WARNING_THRESHOLD_MB = 500;
const CRITICAL_THRESHOLD_MB = 100;

export function checkDiskSpace(): DiskCheckResult {
  const caps = scanCapabilities();
  const freeMB = caps.disk.freeMB;

  if (freeMB <= CRITICAL_THRESHOLD_MB) {
    return {
      status: "critical",
      freeMB,
      message: `Critical: Only ${freeMB}MB disk space remaining. Agent sessions paused.`,
    };
  }

  if (freeMB <= WARNING_THRESHOLD_MB) {
    return {
      status: "warning",
      freeMB,
      message: `Warning: ${freeMB}MB disk space remaining. Consider freeing space.`,
    };
  }

  return {
    status: "ok",
    freeMB,
    message: `Disk OK: ${freeMB}MB free.`,
  };
}
