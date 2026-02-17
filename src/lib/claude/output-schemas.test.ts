import { describe, it, expect } from "vitest";
import {
  LeadDecisionSchema,
  ReviewResultSchema,
  TestResultSchema,
  ProposeResultSchema,
  ResearchResultSchema,
} from "./output-schemas";

describe("output schemas", () => {
  it("LeadDecisionSchema has required fields", () => {
    expect(LeadDecisionSchema.type).toBe("object");
    expect(LeadDecisionSchema.required).toContain("action");
    expect(LeadDecisionSchema.required).toContain("reasoning");
    expect(LeadDecisionSchema.required).toContain("confidence");
    expect(LeadDecisionSchema.properties.action.enum).toContain("execute_task");
    expect(LeadDecisionSchema.properties.action.enum).toContain("replan");
    expect(LeadDecisionSchema.properties.action.enum).toContain("checkpoint");
    expect(LeadDecisionSchema.properties.action.enum).toContain("complete");
    expect(LeadDecisionSchema.properties.action.enum).toContain("skip_task");
  });

  it("ReviewResultSchema has score and approved fields", () => {
    expect(ReviewResultSchema.type).toBe("object");
    expect(ReviewResultSchema.properties).toHaveProperty("score");
    expect(ReviewResultSchema.properties).toHaveProperty("approved");
    expect(ReviewResultSchema.properties).toHaveProperty("critical_issues");
    expect(ReviewResultSchema.required).toContain("score");
    expect(ReviewResultSchema.required).toContain("approved");
  });

  it("TestResultSchema has all check categories", () => {
    expect(TestResultSchema.properties).toHaveProperty("typescript");
    expect(TestResultSchema.properties).toHaveProperty("lint");
    expect(TestResultSchema.properties).toHaveProperty("build");
    expect(TestResultSchema.properties).toHaveProperty("tests");
    expect(TestResultSchema.properties).toHaveProperty("security");
    expect(TestResultSchema.properties).toHaveProperty("overall_pass");
    expect(TestResultSchema.required).toContain("overall_pass");
  });

  it("ProposeResultSchema has milestone and project completion fields", () => {
    expect(ProposeResultSchema.properties).toHaveProperty("milestone_complete");
    expect(ProposeResultSchema.properties).toHaveProperty("project_complete");
    expect(ProposeResultSchema.properties).toHaveProperty("commit_message");
    expect(ProposeResultSchema.required).toContain("milestone_complete");
  });

  it("ResearchResultSchema has stack and connections", () => {
    expect(ResearchResultSchema.properties).toHaveProperty("stack");
    expect(ResearchResultSchema.properties).toHaveProperty("connections");
    expect(ResearchResultSchema.properties).toHaveProperty(
      "modelRecommendation",
    );
    expect(ResearchResultSchema.required).toContain("stack");
  });
});
