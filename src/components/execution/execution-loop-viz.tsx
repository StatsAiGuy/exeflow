"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PhaseNode } from "@/components/execution/phase-node";
import { CycleCounter } from "@/components/execution/cycle-counter";

const PHASES = ["Plan", "Execute", "Review", "Test", "Propose"] as const;

type PhaseState = "active" | "completed" | "upcoming";

interface ExecutionLoopVizProps {
  currentPhase: string | null;
  cycleNumber: number;
  completedPhases: string[];
  /** Optional per-phase status text (e.g. { Execute: "Writing auth middleware..." }) */
  phaseStatusText?: Record<string, string>;
  className?: string;
}

export function ExecutionLoopViz({
  currentPhase,
  cycleNumber,
  completedPhases,
  phaseStatusText,
  className,
}: ExecutionLoopVizProps) {
  const phaseStates = useMemo(() => {
    const currentIndex = currentPhase
      ? PHASES.indexOf(currentPhase as (typeof PHASES)[number])
      : -1;

    return PHASES.map((phase, index) => {
      let state: PhaseState;
      if (completedPhases.includes(phase)) {
        state = "completed";
      } else if (phase === currentPhase) {
        state = "active";
      } else if (currentIndex >= 0 && index > currentIndex) {
        state = "upcoming";
      } else {
        state = "upcoming";
      }
      return { phase, state };
    });
  }, [currentPhase, completedPhases]);

  return (
    <div
      className={cn(
        "relative flex h-20 items-center rounded-lg border border-border bg-card px-4",
        className,
      )}
    >
      {/* Cycle counter badge in top-left */}
      <CycleCounter cycleNumber={cycleNumber} className="absolute -top-2.5 left-3" />

      {/* Phase pipeline */}
      <div className="flex w-full items-center justify-center">
        {phaseStates.map(({ phase, state }, index) => (
          <div key={phase} className="flex items-center">
            <PhaseNode
              phase={phase}
              state={state}
              statusText={phaseStatusText?.[phase]}
            />

            {/* Connector arrow between nodes */}
            {index < PHASES.length - 1 && (
              <PhaseConnector
                state={
                  phaseStates[index].state === "completed" &&
                  (phaseStates[index + 1].state === "completed" ||
                    phaseStates[index + 1].state === "active")
                    ? "done"
                    : phaseStates[index].state === "active"
                      ? "active"
                      : "upcoming"
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Connector Line Between Phases ──────────────────────────────── */

function PhaseConnector({
  state,
}: {
  state: "done" | "active" | "upcoming";
}) {
  return (
    <div className="relative mx-1.5 flex w-8 items-center">
      {/* Base line */}
      <div
        className={cn(
          "h-px w-full",
          state === "done" && "bg-green-500/60",
          state === "active" && "bg-primary/50",
          state === "upcoming" && "bg-border",
        )}
      />

      {/* Animated flow dot for active connector */}
      {state === "active" && (
        <motion.div
          className="absolute h-1.5 w-1.5 rounded-full bg-primary"
          animate={{ left: ["0%", "100%"] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Arrow tip */}
      <svg
        className={cn(
          "absolute -right-0.5 h-2 w-2 shrink-0",
          state === "done" && "text-green-500/60",
          state === "active" && "text-primary/50",
          state === "upcoming" && "text-border",
        )}
        viewBox="0 0 8 8"
        fill="none"
      >
        <path d="M1 1L5 4L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
