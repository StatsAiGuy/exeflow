export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenSuccessThreshold?: number;
  windowSize?: number;
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenSuccessThreshold: 2,
  windowSize: 300000, // 5 minutes
};

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures: number[] = [];
  private halfOpenSuccesses = 0;
  private lastFailureTime = 0;
  private options: Required<CircuitBreakerOptions>;

  constructor(
    private name: string,
    options?: CircuitBreakerOptions,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  getState(): CircuitState {
    if (this.state === "open") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.options.resetTimeout) {
        this.state = "half-open";
        this.halfOpenSuccesses = 0;
      }
    }
    return this.state;
  }

  canExecute(): boolean {
    const currentState = this.getState();
    return currentState === "closed" || currentState === "half-open";
  }

  recordSuccess(): void {
    if (this.state === "half-open") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.options.halfOpenSuccessThreshold) {
        this.state = "closed";
        this.failures = [];
        this.halfOpenSuccesses = 0;
      }
    } else if (this.state === "closed") {
      // Remove old failures outside the window
      const now = Date.now();
      this.failures = this.failures.filter(
        (t) => now - t < this.options.windowSize,
      );
    }
  }

  recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;

    if (this.state === "half-open") {
      this.state = "open";
      return;
    }

    this.failures.push(now);

    // Remove old failures outside the window
    this.failures = this.failures.filter(
      (t) => now - t < this.options.windowSize,
    );

    if (this.failures.length >= this.options.failureThreshold) {
      this.state = "open";
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error(
        `Circuit breaker "${this.name}" is open — service unavailable`,
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  reset(): void {
    this.state = "closed";
    this.failures = [];
    this.halfOpenSuccesses = 0;
    this.lastFailureTime = 0;
  }
}
