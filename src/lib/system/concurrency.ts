import {
  scanCapabilities,
  calculateMaxParallelAgents,
} from "./capability-scanner";

let cachedMax: number | null = null;

export function getMaxParallelAgents(): number {
  if (cachedMax !== null) return cachedMax;
  const caps = scanCapabilities();
  cachedMax = calculateMaxParallelAgents(caps);
  return cachedMax;
}

export function resetConcurrencyCache(): void {
  cachedMax = null;
}
