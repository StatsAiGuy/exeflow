import { describe, it, expect, beforeEach, vi } from "vitest";
import { CircuitBreaker } from "./circuit-breaker";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker("test", {
      failureThreshold: 3,
      resetTimeout: 1000,
      halfOpenSuccessThreshold: 2,
      windowSize: 5000,
    });
  });

  it("starts in closed state", () => {
    expect(breaker.getState()).toBe("closed");
    expect(breaker.canExecute()).toBe(true);
  });

  it("stays closed after fewer failures than threshold", () => {
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe("closed");
    expect(breaker.canExecute()).toBe(true);
  });

  it("opens after reaching failure threshold", () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe("open");
    expect(breaker.canExecute()).toBe(false);
  });

  it("transitions from open to half-open after reset timeout", () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe("open");

    // Advance time past reset timeout
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);
    expect(breaker.getState()).toBe("half-open");
    expect(breaker.canExecute()).toBe(true);
    vi.useRealTimers();
  });

  it("closes after enough successes in half-open state", () => {
    // Get to half-open
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);
    breaker.getState(); // trigger transition

    breaker.recordSuccess();
    expect(breaker.getState()).toBe("half-open");
    breaker.recordSuccess();
    expect(breaker.getState()).toBe("closed");
    vi.useRealTimers();
  });

  it("re-opens on failure in half-open state", () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);
    breaker.getState();

    breaker.recordFailure();
    expect(breaker.getState()).toBe("open");
    vi.useRealTimers();
  });

  it("execute runs function when closed", async () => {
    const result = await breaker.execute(async () => "ok");
    expect(result).toBe("ok");
  });

  it("execute throws when open", async () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    await expect(breaker.execute(async () => "ok")).rejects.toThrow(
      /circuit breaker.*open/i,
    );
  });

  it("execute records failure on throw", async () => {
    await expect(
      breaker.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");

    // Still closed after 1 failure
    expect(breaker.getState()).toBe("closed");
  });

  it("reset restores to initial state", () => {
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe("open");

    breaker.reset();
    expect(breaker.getState()).toBe("closed");
    expect(breaker.canExecute()).toBe(true);
  });
});
