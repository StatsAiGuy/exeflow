"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Check,
  X,
  Pencil,
  AlertTriangle,
  Info,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { ChatMessage } from "@/types/events";

type CheckpointSeverity = "info" | "approval" | "critical";

interface CheckpointCardProps {
  message: ChatMessage;
  onApprove: (checkpointId: string) => void;
  onApproveAndEdit: (checkpointId: string) => void;
  onReject: (checkpointId: string, reason: string) => void;
  isAnswering?: boolean;
  className?: string;
}

function getSeverity(metadata: Record<string, unknown> | null): CheckpointSeverity {
  if (!metadata) return "info";
  const type = metadata.type as string | undefined;
  const severity = metadata.severity as string | undefined;

  if (severity === "critical" || type === "critical") return "critical";
  if (
    severity === "approval" ||
    type === "approval" ||
    type === "review" ||
    type === "decision"
  )
    return "approval";
  return "info";
}

const severityConfig: Record<
  CheckpointSeverity,
  { borderColor: string; icon: typeof Info; iconColor: string; label: string }
> = {
  info: {
    borderColor: "border-l-blue-500",
    icon: Info,
    iconColor: "text-blue-500",
    label: "Information",
  },
  approval: {
    borderColor: "border-l-yellow-500",
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
    label: "Approval Needed",
  },
  critical: {
    borderColor: "border-l-red-500",
    icon: AlertCircle,
    iconColor: "text-red-500",
    label: "Critical",
  },
};

export function CheckpointCard({
  message,
  onApprove,
  onApproveAndEdit,
  onReject,
  isAnswering = false,
  className,
}: CheckpointCardProps) {
  const [answered, setAnswered] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const checkpointId =
    (message.metadata?.checkpointId as string) ?? message.id;
  const context = message.metadata?.context as string | undefined;
  const severity = getSeverity(message.metadata);
  const config = severityConfig[severity];
  const SeverityIcon = config.icon;

  const time = (() => {
    try {
      return format(new Date(message.createdAt), "HH:mm");
    } catch {
      return "";
    }
  })();

  function handleApprove() {
    setAnswered(true);
    onApprove(checkpointId);
  }

  function handleApproveAndEdit() {
    onApproveAndEdit(checkpointId);
  }

  function handleRejectSubmit() {
    if (!rejectReason.trim()) return;
    setAnswered(true);
    onReject(checkpointId, rejectReason.trim());
  }

  return (
    <div className={cn("px-4", className)}>
      <AnimatePresence mode="wait">
        {answered ? (
          <motion.div
            key="resolved"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 py-2 text-xs text-muted-foreground"
          >
            <Check className="size-3.5 text-green-500" />
            <span>Checkpoint resolved</span>
          </motion.div>
        ) : (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card
              className={cn(
                "border-l-4 py-4 gap-3",
                config.borderColor,
              )}
            >
              <CardContent className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SeverityIcon className={cn("size-4", config.iconColor)} />
                    <span className="text-xs font-medium text-muted-foreground">
                      {config.label}
                    </span>
                  </div>
                  {time && (
                    <span className="text-xs text-muted-foreground">{time}</span>
                  )}
                </div>

                {/* Question */}
                <p className="text-sm leading-relaxed">{message.content}</p>

                {/* Context */}
                {context && (
                  <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
                    {context}
                  </p>
                )}

                {/* Reject reason input */}
                <AnimatePresence>
                  {showRejectInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <Textarea
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="min-h-16 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleRejectSubmit();
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={handleRejectSubmit}
                          disabled={!rejectReason.trim() || isAnswering}
                        >
                          Submit
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setShowRejectInput(false);
                            setRejectReason("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                {!showRejectInput && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      onClick={handleApprove}
                      disabled={isAnswering}
                    >
                      <Check className="size-3" />
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleApproveAndEdit}
                      disabled={isAnswering}
                    >
                      <Pencil className="size-3" />
                      Approve & Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setShowRejectInput(true)}
                      disabled={isAnswering}
                    >
                      <X className="size-3" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
