"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  text?: string;
  className?: string;
}

export function ThinkingIndicator({
  text,
  className,
}: ThinkingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      {text && (
        <span className="text-xs text-muted-foreground">{text}</span>
      )}
    </div>
  );
}
