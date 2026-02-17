import { getDb, withRetry } from "@/lib/db";
import { generateId } from "@/lib/utils/id";
import { eventBus } from "@/lib/events/emitter";
import { detectLoop } from "@/lib/quality/loop-detector";
import { spawnAgent } from "@/lib/claude/sdk";
import { getModelForRole, resolveModelShorthand } from "./model-delegator";
import {
  getLoopState,
  setLoopState,
  pauseLoop,
  completeLoop,
} from "./loop-controller";
import { startChatBridge, stopChatBridge } from "./chat-bridge";
import { createCheckpoint, getPendingCheckpoints } from "./checkpoint";
import {
  buildLeadAgentPrompt,
  buildExecutorPrompt,
  buildReviewerPrompt,
  buildTesterPrompt,
  buildProposePrompt,
  buildPlanPrompt,
} from "./prompt-builder";
import { LeadDecisionSchema } from "@/lib/claude/output-schemas";
import type { OrchestratorState } from "@/types/events";
import type { Project, ModelConfig } from "@/types/project";
import type { Phase, AgentResult } from "@/types/agent";

export interface OrchestratorOptions {
  project: Project;
  planJson: string;
  onStateChange?: (state: OrchestratorState) => void;
}

interface LeadDecision {
  action: "execute_task" | "replan" | "checkpoint" | "complete" | "skip_task";
  task_id?: string;
  task_description?: string;
  milestone_id?: string;
  agent_role?: string;
  phase?: Phase;
  model?: string;
  complexity?: string;
  expected_files?: string[];
  parallel_eligible?: boolean;
  retry_context?: string | null;
  previous_review_feedback?: string | null;
  previous_test_errors?: string | null;
  max_turns?: number;
  replan_reason?: string;
  replan_direction?: string;
  preserve_completed?: boolean;
  failed_approaches?: string[];
  checkpoint_type?: string;
  question?: string;
  options?: string[];
  recommendation?: string | null;
  context?: string;
  completion_scope?: string;
  summary?: string;
  next_milestone_id?: string | null;
  skip_reason?: string;
  reasoning: string;
  confidence: string;
}

export class Orchestrator {
  private project: Project;
  private planJson: string;
  private abortController: AbortController;
  private running = false;
  private onStateChange?: (state: OrchestratorState) => void;

  constructor(options: OrchestratorOptions) {
    this.project = options.project;
    this.planJson = options.planJson;
    this.abortController = new AbortController();
    this.onStateChange = options.onStateChange;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Start chat bridge so agent activity appears in the chat panel
    startChatBridge();

    // Check for existing state (session recovery)
    let loopState = getLoopState(this.project.id);
    if (!loopState) {
      setLoopState(this.project.id, "initializing", {
        cycleNumber: 0,
        planJson: this.planJson,
      });
      loopState = getLoopState(this.project.id)!;
    }

    this.transitionTo(loopState.state);

    try {
      await this.runLoop();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logError("orchestrator_crash", errMsg);
      pauseLoop(this.project.id, "paused_error");
    } finally {
      this.running = false;
    }
  }

  stop(): void {
    this.running = false;
    this.abortController.abort();
    stopChatBridge();
  }

  private async runLoop(): Promise<void> {
    while (this.running && !this.abortController.signal.aborted) {
      const state = getLoopState(this.project.id);
      if (!state) break;

      // Check if paused or terminal
      if (this.isTerminalState(state.state) || this.isPausedState(state.state)) {
        break;
      }

      // Check for loops
      const loopDetection = detectLoop(this.project.id);
      if (loopDetection.detected) {
        pauseLoop(this.project.id, "paused_loop_detected");
        createCheckpoint(
          this.project.id,
          "clarification",
          `Loop detected (${loopDetection.type}): ${loopDetection.evidence}. How should I proceed?`,
          { loopType: loopDetection.type, evidence: loopDetection.evidence },
        );
        break;
      }

      // Invoke lead agent to decide next action
      const decision = await this.invokeLeadAgent(state);
      if (!decision) {
        pauseLoop(this.project.id, "paused_error");
        break;
      }

      // Act on decision
      await this.processDecision(decision, state);
    }
  }

  private async invokeLeadAgent(state: ReturnType<typeof getLoopState> & object): Promise<LeadDecision | null> {
    const contextJson = state.contextJson ? JSON.parse(state.contextJson) : {};
    contextJson.cycleNumber = state.cycleNumber;
    const prompt = buildLeadAgentPrompt(this.project, state.planJson, contextJson);

    const result = await spawnAgent({
      role: "lead",
      phase: "plan",
      model: getModelForRole("lead", this.project.modelConfig),
      prompt,
      cwd: this.project.projectPath,
      maxTurns: 5,
      allowedTools: ["Read", "Glob", "Grep"],
      outputSchema: LeadDecisionSchema,
      projectId: this.project.id,
      cycleId: undefined,
    });

    if (result.status === "failed") {
      this.logError("lead_agent_failed", this.extractErrorMessage(result));
      return null;
    }

    if (!result.output) {
      this.logError("lead_agent_empty", "Lead agent returned no output");
      return null;
    }

    // With outputFormat + json_schema, the SDK guarantees valid JSON
    // but we still guard against unexpected shapes
    const output = result.output as Record<string, unknown>;
    if (!output.action || !output.reasoning) {
      this.logError("lead_agent_invalid", `Missing required fields in lead output: ${JSON.stringify(output).slice(0, 500)}`);
      return null;
    }

    return output as unknown as LeadDecision;
  }

  private async processDecision(
    decision: LeadDecision,
    state: NonNullable<ReturnType<typeof getLoopState>>,
  ): Promise<void> {
    switch (decision.action) {
      case "execute_task":
        await this.handleExecuteTask(decision, state);
        break;
      case "replan":
        await this.handleReplan(decision, state);
        break;
      case "checkpoint":
        this.handleCheckpoint(decision);
        break;
      case "complete":
        this.handleComplete(decision);
        break;
      case "skip_task":
        this.handleSkipTask(decision);
        break;
    }
  }

  private async handleExecuteTask(
    decision: LeadDecision,
    state: NonNullable<ReturnType<typeof getLoopState>>,
  ): Promise<void> {
    const phase = decision.phase || "execute";
    const model = decision.model
      ? resolveModelShorthand(decision.model as "opus" | "haiku" | "sonnet")
      : getModelForRole(
          "executor",
          this.project.modelConfig,
          decision.complexity as "simple" | "complex",
        );

    this.transitionTo(phase === "execute" ? "executing" : phase === "review" ? "reviewing" : "testing");

    // Create execution cycle if needed
    const cycleId = this.ensureCycle(state, phase);

    // Build phase-specific prompt from template
    const contextJson = state.contextJson ? JSON.parse(state.contextJson) : {};
    const taskDescription = decision.task_description || "";
    const retryCount = contextJson.retryCount ?? 0;
    let prompt: string;

    if (phase === "review") {
      prompt = buildReviewerPrompt(this.project, taskDescription, contextJson.lastPhaseOutcome);
    } else if (phase === "test") {
      const isBootstrap = state.cycleNumber === 0;
      prompt = buildTesterPrompt(this.project, taskDescription, isBootstrap);
    } else {
      prompt = buildExecutorPrompt(this.project, taskDescription, decision, retryCount);
    }

    const result = await spawnAgent({
      role: decision.agent_role === "reviewer" ? "reviewer" : decision.agent_role === "tester" ? "tester" : "executor",
      phase: phase,
      model,
      prompt,
      cwd: this.project.projectPath,
      maxTurns: decision.max_turns || 30,
      projectId: this.project.id,
      cycleId,
    });

    // Record phase result
    this.recordPhaseResult(phase, decision.task_description || "", result);

    // Build outcome context including error details when applicable
    const outcomeContext: Record<string, unknown> = {
      lastPhase: phase,
      lastPhaseOutcome: result.output,
      lastAgentStatus: result.status,
      lastAgentDuration: result.duration,
      lastAgentTokens: { input: result.tokensInput, output: result.tokensOutput },
    };

    // If the agent failed, extract actionable error info for the lead agent
    if (result.status === "failed") {
      outcomeContext.errorMessage = this.extractErrorMessage(result);
    }

    // Update context for next lead agent invocation
    setLoopState(this.project.id, "checkpoint", {
      contextJson: JSON.stringify(outcomeContext),
    });
  }

  private async handleReplan(
    decision: LeadDecision,
    state: NonNullable<ReturnType<typeof getLoopState>>,
  ): Promise<void> {
    this.transitionTo("planning");

    const prompt = buildPlanPrompt(
      this.project,
      state.planJson,
      "replan",
      decision.failed_approaches,
    );

    const result = await spawnAgent({
      role: "planner",
      phase: "plan",
      model: getModelForRole("lead", this.project.modelConfig),
      prompt,
      cwd: this.project.projectPath,
      maxTurns: 15,
      projectId: this.project.id,
    });

    if (result.status === "completed" && result.output) {
      setLoopState(this.project.id, "checkpoint", {
        planJson: JSON.stringify(result.output),
        contextJson: JSON.stringify({
          lastPhase: "plan",
          lastPhaseOutcome: result.output,
          invocationTrigger: "AFTER_REPLAN",
        }),
      });
    } else {
      // Replan failed — pause with error context so user can intervene
      this.logError("replan_failed", this.extractErrorMessage(result));
      pauseLoop(this.project.id, "paused_error");
    }
  }

  private handleCheckpoint(decision: LeadDecision): void {
    createCheckpoint(
      this.project.id,
      (decision.checkpoint_type || "clarification") as "clarification" | "approval" | "review" | "decision",
      decision.question || "Agent needs input",
      {
        options: decision.options,
        recommendation: decision.recommendation,
        context: decision.context,
      },
    );

    pauseLoop(this.project.id, "paused_awaiting_input");
  }

  private handleComplete(decision: LeadDecision): void {
    if (decision.completion_scope === "project") {
      completeLoop(this.project.id);
    } else {
      // Milestone complete, continue to next
      setLoopState(this.project.id, "checkpoint", {
        contextJson: JSON.stringify({
          lastPhase: "propose",
          lastPhaseOutcome: { milestoneComplete: true, summary: decision.summary },
          invocationTrigger: "AFTER_PROPOSE",
          nextMilestoneId: decision.next_milestone_id,
        }),
      });
    }
  }

  private handleSkipTask(decision: LeadDecision): void {
    if (decision.task_id) {
      const db = getDb();
      db.prepare(
        "UPDATE tasks SET status = 'skipped', updated_at = datetime('now') WHERE id = ?",
      ).run(decision.task_id);
    }

    // Continue loop — lead agent will pick next task
    setLoopState(this.project.id, "checkpoint", {
      contextJson: JSON.stringify({
        lastPhase: "skip",
        lastPhaseOutcome: { skippedTaskId: decision.task_id, reason: decision.skip_reason },
      }),
    });
  }

  private ensureCycle(
    state: NonNullable<ReturnType<typeof getLoopState>>,
    phase: string,
  ): string {
    const db = getDb();
    const cycleId = generateId();

    db.prepare(
      `INSERT INTO execution_cycles (id, project_id, cycle_number, phase, status, started_at)
       VALUES (?, ?, ?, ?, 'running', datetime('now'))`,
    ).run(cycleId, this.project.id, state.cycleNumber, phase);

    eventBus.emit("cycle_started", this.project.id, {
      cycleId,
      cycleNumber: state.cycleNumber,
      phase,
    });

    return cycleId;
  }

  private recordPhaseResult(
    phase: string,
    taskDescription: string,
    result: { status: string; output: unknown; duration: number },
  ): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO phase_history (id, project_id, phase_name, task_description, outcome, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      generateId(),
      this.project.id,
      phase,
      taskDescription.slice(0, 500),
      result.status === "completed" ? "success" : "failure",
      result.duration,
      Date.now(),
    );
  }

  private transitionTo(newState: OrchestratorState): void {
    setLoopState(this.project.id, newState);
    this.onStateChange?.(newState);
    eventBus.emit("phase_started", this.project.id, { state: newState });
  }

  private isTerminalState(state: OrchestratorState): boolean {
    return state === "completed" || state === "abandoned";
  }

  private isPausedState(state: OrchestratorState): boolean {
    return state.startsWith("paused_");
  }

  /**
   * Extract a human-readable error message from a failed agent result.
   * The SDK returns structured error info in the output when a session fails.
   */
  private extractErrorMessage(result: AgentResult): string {
    if (!result.output) return "Unknown error (no output)";

    const output = result.output as Record<string, unknown>;

    // SDK error structure: { error: "error_type", errors: [...], permissionDenials: [...] }
    if (output.error) {
      const errors = Array.isArray(output.errors) ? output.errors : [];
      const errorType = String(output.error);

      switch (errorType) {
        case "error_max_turns":
          return `Agent exceeded max turns limit. Errors: ${errors.join("; ") || "none"}`;
        case "error_max_budget_usd":
          return `Agent exceeded budget limit. Errors: ${errors.join("; ") || "none"}`;
        case "error_max_structured_output_retries":
          return `Agent failed to produce valid structured output after retries. Errors: ${errors.join("; ") || "none"}`;
        case "error_during_execution":
          return `Agent execution error: ${errors.join("; ") || "unknown"}`;
        default:
          return `Agent failed (${errorType}): ${errors.join("; ") || String(output.error)}`;
      }
    }

    return JSON.stringify(output).slice(0, 500);
  }

  private logError(code: string, message: string): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO error_log (id, project_id, category, severity, code, message, context_json, created_at)
       VALUES (?, ?, 'agent_session', 'error', ?, ?, '{}', ?)`,
    ).run(generateId(), this.project.id, code, message, Date.now());
  }
}
