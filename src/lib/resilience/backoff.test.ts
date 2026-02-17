import { describe, it, expect, vi } from "vitest";
import { calculateBackoff, withExponentialBackoff } from "./backoff";

describe("calculateBackoff", () => {
  it("returns base delay for attempt 0", () => {
    // With jitter disabled (factor 0)
    const delay = calculateBackoff(0, { jitterFactor: 0 });
    expect(delay).toBe(1000);
  });

  it("doubles delay for each attempt", () => {
    const d0 = calculateBackoff(0, { jitterFactor: 0 });
    const d1 = calculateBackoff(1, { jitterFactor: 0 });
    const d2 = calculateBackoff(2, { jitterFactor: 0 });
    expect(d1).toBe(d0 * 2);
    expect(d2).toBe(d0 * 4);
  });

  it("caps at maxDelay", () => {
    const delay = calculateBackoff(20, { jitterFactor: 0, maxDelay: 5000 });
    expect(delay).toBe(5000);
  });

  it("adds jitter within expected range", () => {
    const results = Array.from({ length: 100 }, () =>
      calculateBackoff(0, { baseDelay: 1000, jitterFactor: 0.25 }),
    );
    // All should be between 1000 and 1250
    for (const r of results) {
      expect(r).toBeGreaterThanOrEqual(1000);
      expect(r).toBeLessThanOrEqual(1250);
    }
  });
});

describe("withExponentialBackoff", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withExponentialBackoff(fn, { maxRetries: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"))
      .mockResolvedValue("ok");

    const result = await withExponentialBackoff(fn, {
      maxRetries: 3,
      baseDelay: 1,
      jitterFactor: 0,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws last error after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent"));

    await expect(
      withExponentialBackoff(fn, {
        maxRetries: 2,
        baseDelay: 1,
        jitterFactor: 0,
      }),
    ).rejects.toThrow("persistent");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
