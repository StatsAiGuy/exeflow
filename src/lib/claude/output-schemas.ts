export const LeadDecisionSchema = {
  type: "object" as const,
  properties: {
    action: {
      type: "string" as const,
      enum: ["execute_task", "replan", "checkpoint", "complete", "skip_task"],
    },
    // execute_task fields
    task_id: { type: "string" as const },
    task_description: { type: "string" as const },
    milestone_id: { type: "string" as const },
    agent_role: {
      type: "string" as const,
      enum: ["executor", "reviewer", "tester"],
    },
    phase: {
      type: "string" as const,
      enum: ["execute", "review", "test"],
    },
    model: {
      type: "string" as const,
      enum: ["opus", "haiku", "sonnet"],
    },
    complexity: {
      type: "string" as const,
      enum: ["simple", "complex"],
    },
    expected_files: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    parallel_eligible: { type: "boolean" as const },
    retry_context: { type: ["string", "null"] as const },
    previous_review_feedback: { type: ["string", "null"] as const },
    previous_test_errors: { type: ["string", "null"] as const },
    max_turns: { type: "number" as const },
    // replan fields
    replan_reason: { type: "string" as const },
    replan_direction: { type: "string" as const },
    preserve_completed: { type: "boolean" as const },
    failed_approaches: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    // checkpoint fields
    checkpoint_type: {
      type: "string" as const,
      enum: [
        "clarification",
        "approval",
        "decision",
        "informational",
        "confirmation",
      ],
    },
    question: { type: "string" as const },
    options: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    recommendation: { type: ["string", "null"] as const },
    context: { type: "string" as const },
    // complete fields
    completion_scope: {
      type: "string" as const,
      enum: ["milestone", "project"],
    },
    summary: { type: "string" as const },
    next_milestone_id: { type: ["string", "null"] as const },
    // skip_task fields
    skip_reason: { type: "string" as const },
    // always present
    reasoning: { type: "string" as const },
    confidence: {
      type: "string" as const,
      enum: ["high", "medium", "low"],
    },
  },
  required: ["action", "reasoning", "confidence"] as const,
};

export const ReviewResultSchema = {
  type: "object" as const,
  properties: {
    task_completed: { type: "boolean" as const },
    task_completion_notes: { type: "string" as const },
    score: { type: "number" as const },
    critical_issues: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    suggestions: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    security_concerns: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    regressions_detected: { type: "boolean" as const },
    regression_details: { type: ["string", "null"] as const },
    visual_check: { type: ["string", "null"] as const },
    approved: { type: "boolean" as const },
    summary: { type: "string" as const },
  },
  required: ["score", "approved", "summary"] as const,
};

export const TestResultSchema = {
  type: "object" as const,
  properties: {
    typescript: {
      type: "object" as const,
      properties: {
        status: { type: "string" as const, enum: ["pass", "fail", "skipped"] },
        skip_reason: { type: ["string", "null"] as const },
        error_count: { type: "number" as const },
        errors: { type: "array" as const, items: { type: "string" as const } },
      },
    },
    lint: {
      type: "object" as const,
      properties: {
        status: { type: "string" as const, enum: ["pass", "fail", "skipped"] },
        skip_reason: { type: ["string", "null"] as const },
        error_count: { type: "number" as const },
        warning_count: { type: "number" as const },
        lint_blocking: { type: "boolean" as const },
        errors: { type: "array" as const, items: { type: "string" as const } },
      },
    },
    build: {
      type: "object" as const,
      properties: {
        status: { type: "string" as const, enum: ["pass", "fail", "skipped"] },
        skip_reason: { type: ["string", "null"] as const },
        errors: { type: "array" as const, items: { type: "string" as const } },
      },
    },
    tests: {
      type: "object" as const,
      properties: {
        status: { type: "string" as const, enum: ["pass", "fail", "skipped"] },
        skip_reason: { type: ["string", "null"] as const },
        total: { type: "number" as const },
        passing: { type: "number" as const },
        failing: { type: "number" as const },
        failures: { type: "array" as const, items: { type: "string" as const } },
      },
    },
    security: {
      type: "object" as const,
      properties: {
        status: { type: "string" as const, enum: ["pass", "fail", "skipped"] },
        skip_reason: { type: ["string", "null"] as const },
        high_critical_count: { type: "number" as const },
        vulnerabilities: { type: "array" as const, items: { type: "string" as const } },
      },
    },
    overall_pass: { type: "boolean" as const },
    partial_pass: { type: ["boolean", "null"] as const },
    summary: { type: "string" as const },
    actionable_errors: {
      type: "array" as const,
      items: { type: "string" as const },
    },
  },
  required: ["overall_pass", "summary"] as const,
};

export const ProposeResultSchema = {
  type: "object" as const,
  properties: {
    git_committed: { type: "boolean" as const },
    commit_hash: { type: ["string", "null"] as const },
    commit_message: { type: ["string", "null"] as const },
    git_pushed: { type: "boolean" as const },
    push_notes: { type: ["string", "null"] as const },
    learnings_recorded: { type: "boolean" as const },
    learnings: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    milestone_complete: { type: "boolean" as const },
    milestone_completion_evidence: { type: ["string", "null"] as const },
    improvements: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    next_milestone_id: { type: ["string", "null"] as const },
    next_milestone_title: { type: ["string", "null"] as const },
    project_complete: { type: "boolean" as const },
    completion_reasoning: { type: "string" as const },
  },
  required: ["milestone_complete", "project_complete", "completion_reasoning"] as const,
};

export const ResearchResultSchema = {
  type: "object" as const,
  properties: {
    stack: {
      type: "object" as const,
      properties: {
        framework: { type: "object" as const },
        database: { type: "object" as const },
        auth: { type: "object" as const },
        deployment: { type: "object" as const },
        styling: { type: "object" as const },
      },
    },
    connections: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          mcp_package: { type: "string" as const },
          why_needed: { type: "string" as const },
          score: { type: "number" as const },
          alternatives: {
            type: "array" as const,
            items: { type: "string" as const },
          },
        },
      },
    },
    model_recommendation: {
      type: "object" as const,
      properties: {
        executor_complex: { type: "string" as const },
        executor_routine: { type: "string" as const },
        reasoning: { type: "string" as const },
      },
    },
    risks: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    estimated_complexity: { type: "string" as const },
  },
  required: ["stack", "connections"] as const,
};
