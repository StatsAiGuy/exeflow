import { describe, it, expect } from "vitest";
import { searchRegistry, getRecommendationsForProjectType } from "./mcp-registry";

describe("MCP Registry", () => {
  describe("searchRegistry", () => {
    it("finds Supabase by name", () => {
      const results = searchRegistry("supabase");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain("supabase");
    });

    it("finds Vercel by name", () => {
      const results = searchRegistry("vercel");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for unknown query", () => {
      const results = searchRegistry("xyznonexistent123");
      expect(results).toEqual([]);
    });

    it("is case insensitive", () => {
      const lower = searchRegistry("stripe");
      const upper = searchRegistry("STRIPE");
      expect(lower.length).toBe(upper.length);
    });
  });

  describe("getRecommendationsForProjectType", () => {
    it("returns recommendations for saas", () => {
      const recs = getRecommendationsForProjectType("saas");
      expect(recs.length).toBeGreaterThan(0);
    });

    it("returns recommendations for web-app", () => {
      const recs = getRecommendationsForProjectType("web-app");
      expect(recs.length).toBeGreaterThan(0);
    });
  });
});
