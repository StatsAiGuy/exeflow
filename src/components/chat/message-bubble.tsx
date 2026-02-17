"use client";

import { cn } from "@/lib/utils";
import { Bot, User, Info } from "lucide-react";
import { format } from "date-fns";
import type { ChatMessage } from "@/types/events";

interface MessageBubbleProps {
  message: ChatMessage;
  className?: string;
}

function formatTimestamp(dateStr: string): string {
  try {
    return format(new Date(dateStr), "HH:mm");
  } catch {
    return "";
  }
}

function RoleIcon({ role }: { role: ChatMessage["role"] }) {
  switch (role) {
    case "user":
      return <User className="size-3.5" />;
    case "agent":
      return <Bot className="size-3.5" />;
    case "system":
      return <Info className="size-3.5" />;
  }
}

function roleLabel(role: ChatMessage["role"]): string {
  switch (role) {
    case "user":
      return "You";
    case "agent":
      return "Agent";
    case "system":
      return "System";
  }
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const { role, content, createdAt } = message;
  const time = formatTimestamp(createdAt);

  // System messages: centered, no bubble
  if (role === "system") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-1 px-4 py-2",
          className,
        )}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RoleIcon role={role} />
          <span>{roleLabel(role)}</span>
          {time && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>{time}</span>
            </>
          )}
        </div>
        <p className="text-center text-sm text-muted-foreground whitespace-pre-wrap">
          {content}
        </p>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-4",
        isUser ? "items-end" : "items-start",
        className,
      )}
    >
      {/* Role label + timestamp */}
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          isUser ? "flex-row-reverse" : "flex-row",
        )}
      >
        <RoleIcon role={role} />
        <span>{roleLabel(role)}</span>
        {time && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span>{time}</span>
          </>
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
        )}
      >
        {content}
      </div>
    </div>
  );
}
