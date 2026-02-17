"use client";

import { motion } from "framer-motion";
import {
  ClipboardList,
  Code,
  Search,
  TestTube,
  Rocket,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const phaseIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Plan: ClipboardList,
  Execute: Code,
  Review: Search,
  Test: TestTube,
  Propose: Rocket,
};

type PhaseState = "active" | "completed" | "upcoming";

interface PhaseNodeProps {
  phase: string;
  state: PhaseState;
  statusText?: string;
  className?: string;
}

export function PhaseNode({ phase, state, statusText, className }: PhaseNodeProps) {
  const Icon = phaseIcons[phase] ?? ClipboardList;

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative">
        {/* Pulsing ring for active state */}
        {state === "active" && (
          <motion.div
            className="absolute -inset-1.5 rounded-xl border-2 border-primary"
            animate={{
              opacity: [1, 0.3, 1],
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Node body */}
        <motion.div
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
            state === "active" && "bg-primary text-primary-foreground shadow-md",
            state === "completed" && "bg-muted text-muted-foreground border border-green-500/40",
            state === "upcoming" && "border border-dashed border-border text-muted-foreground/50",
          )}
          initial={false}
          animate={{
            scale: state === "active" ? 1 : 0.92,
            opacity: state === "upcoming" ? 0.5 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Icon className="h-5 w-5" />

          {/* Green checkmark overlay for completed phases */}
          {state === "completed" && (
            <motion.div
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-[11px] font-medium leading-none",
          state === "active" && "text-foreground",
          state === "completed" && "text-muted-foreground",
          state === "upcoming" && "text-muted-foreground/50",
        )}
      >
        {phase}
      </span>

      {/* Optional status text */}
      {statusText && state === "active" && (
        <motion.span
          className="max-w-[100px] truncate text-[10px] text-muted-foreground"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          title={statusText}
        >
          {statusText}
        </motion.span>
      )}
    </div>
  );
}
