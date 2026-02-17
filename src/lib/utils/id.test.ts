import { describe, it, expect } from "vitest";
import { generateId, generateShortId } from "./id";

describe("generateId", () => {
  it("returns a valid UUID", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("generateShortId", () => {
  it("returns an 8-char hex string", () => {
    const id = generateShortId();
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it("generates unique short IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateShortId()));
    expect(ids.size).toBe(100);
  });
});
