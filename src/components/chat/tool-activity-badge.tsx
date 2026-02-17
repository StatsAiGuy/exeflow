"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Terminal,
  Search,
  Globe,
  Pencil,
  Loader2,
} from "lucide-react";
import type { ChatMessage } from "@/types/events";

interface ToolActivityBadgeProps {
  message: ChatMessage;
  autoDismissMs?: number;
  className?: string;
}

type ToolKind = "read" | "write" | "run" | "search" | "web" | "unknown";

function detectToolKind(content: string): ToolKind {
  const lower = content.toLowerCase();
  if (lower.startsWith("reading") || lower.startsWith("read ")) return "read";
  if (
    lower.startsWith("writing") ||
    lower.startsWith("editing") ||
    lower.startsWith("write ") ||
    lower.startsWith("edit ")
  )
    return "write";
  if (
    lower.startsWith("running") ||
    lower.startsWith("executing") ||
    lower.startsWith("run ")
  )
    return "run";
  if (lower.startsWith("searching") || lower.startsWith("search "))
    return "search";
  if (lower.startsWith("fetching") || lower.startsWith("browsing"))
    return "web";
  return "unknown";
}

const toolIcons: Record<ToolKind, typeof FileText> = {
  read: FileText,
  write: Pencil,
  run: Terminal,
  search: Search,
  web: Globe,
  unknown: Loader2,
};

export function ToolActivityBadge({
  message,
  autoDismissMs = 5000,
  className,
}: ToolActivityBadgeProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs]);

  const toolKind = detectToolKind(message.content);
  const Icon = toolIcons[toolKind];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.2 }}
          className={cn("flex justify-start px-4", className)}
        >
          <Badge
            variant="secondary"
            className="gap-1.5 py-1 px-2.5 text-xs font-normal"
          >
            <Icon
              className={cn(
                "size-3",
                toolKind === "unknown" && "animate-spin",
              )}
            />
            <span className="max-w-[220px] truncate">{message.content}</span>
          </Badge>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
