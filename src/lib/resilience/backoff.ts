export interface BackoffOptions {
  baseDelay?: number;
  maxDelay?: number;
  maxRetries?: number;
  jitterFactor?: number;
}

const DEFAULT_OPTIONS: Required<BackoffOptions> = {
  baseDelay: 1000,
  maxDelay: 60000,
  maxRetries: 5,
  jitterFactor: 0.25,
};

export function calculateBackoff(
  attempt: number,
  options?: BackoffOptions,
): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const delay = Math.min(
    opts.baseDelay * Math.pow(2, attempt),
    opts.maxDelay,
  );
  const jitter = delay * opts.jitterFactor * Math.random();
  return delay + jitter;
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options?: BackoffOptions,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < opts.maxRetries) {
        const delay = calculateBackoff(attempt, opts);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
