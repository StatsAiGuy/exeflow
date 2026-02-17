"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CycleCounterProps {
  cycleNumber: number;
  className?: string;
}

export function CycleCounter({ cycleNumber, className }: CycleCounterProps) {
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={cycleNumber}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 20 }}
        >
          <Badge variant="secondary" className="text-[11px] font-semibold tabular-nums">
            Cycle {cycleNumber}
          </Badge>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
