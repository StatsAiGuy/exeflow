"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/stores/app-store";
import { useChat } from "@/lib/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  PanelRightClose,
  SendHorizonal,
  GripVertical,
} from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { CheckpointCard } from "@/components/chat/checkpoint-card";
import { ToolActivityBadge } from "@/components/chat/tool-activity-badge";
import type { ChatMessage } from "@/types/events";

const MIN_WIDTH = 320;
const DEFAULT_WIDTH = 400;
const MAX_WIDTH_RATIO = 0.5; // 50vw

type ApprovalMode = "suggest" | "auto-edit" | "full-auto";

interface ChatPanelProps {
  className?: string;
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Agent message skeleton */}
      <div className="flex flex-col gap-1 items-start">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-16 w-[70%] rounded-2xl" />
      </div>
      {/* User message skeleton */}
      <div className="flex flex-col gap-1 items-end">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-10 w-[55%] rounded-2xl" />
      </div>
      {/* Agent message skeleton */}
      <div className="flex flex-col gap-1 items-start">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-20 w-[65%] rounded-2xl" />
      </div>
      {/* Checkpoint skeleton */}
      <Skeleton className="h-28 w-full rounded-xl" />
      {/* Agent message skeleton */}
      <div className="flex flex-col gap-1 items-start">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-12 w-[60%] rounded-2xl" />
      </div>
    </div>
  );
}

function renderMessage(
  message: ChatMessage,
  onApprove: (checkpointId: string) => void,
  onApproveAndEdit: (checkpointId: string) => void,
  onReject: (checkpointId: string, reason: string) => void,
  isAnswering: boolean,
) {
  switch (message.messageType) {
    case "checkpoint":
      return (
        <CheckpointCard
          key={message.id}
          message={message}
          onApprove={onApprove}
          onApproveAndEdit={onApproveAndEdit}
          onReject={onReject}
          isAnswering={isAnswering}
        />
      );

    case "tool_activity":
      return <ToolActivityBadge key={message.id} message={message} />;

    case "file_change":
      return (
        <div key={message.id} className="px-4">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-blue-500" />
            <span className="truncate">{message.content}</span>
          </div>
        </div>
      );

    case "error":
      return (
        <div key={message.id} className="px-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {message.content}
          </div>
        </div>
      );

    case "text":
    default:
      return <MessageBubble key={message.id} message={message} />;
  }
}

export function ChatPanel({ className }: ChatPanelProps) {
  const chatPanelOpen = useAppStore((s) => s.chatPanelOpen);
  const setChatPanelOpen = useAppStore((s) => s.setChatPanelOpen);
  const activeProjectId = useAppStore((s) => s.activeProjectId);

  const {
    messages,
    isLoading,
    send,
    isSending,
    answerCheckpoint,
    isAnswering,
  } = useChat(activeProjectId);

  const [inputValue, setInputValue] = useState("");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("suggest");
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isResizing = useRef(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-slot='scroll-area-viewport']",
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (chatPanelOpen) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [chatPanelOpen]);

  // Handle resize drag
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;

      const startX = e.clientX;
      const startWidth = panelWidth;
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;

      function onMouseMove(ev: MouseEvent) {
        if (!isResizing.current) return;
        // Dragging left increases width (panel is on the right)
        const delta = startX - ev.clientX;
        const newWidth = Math.min(
          Math.max(startWidth + delta, MIN_WIDTH),
          maxWidth,
        );
        setPanelWidth(newWidth);
      }

      function onMouseUp() {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [panelWidth],
  );

  // Send message handler
  function handleSend() {
    if (!inputValue.trim() || isSending) return;
    send(inputValue);
    setInputValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Checkpoint handlers
  function handleApprove(checkpointId: string) {
    answerCheckpoint({ checkpointId, action: "approve" });
  }

  function handleApproveAndEdit(checkpointId: string) {
    answerCheckpoint({ checkpointId, action: "edit" });
  }

  function handleReject(checkpointId: string, reason: string) {
    answerCheckpoint({ checkpointId, action: "reject", reason });
  }

  return (
    <AnimatePresence>
      {chatPanelOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: panelWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "relative flex h-full flex-col border-l bg-background",
            className,
          )}
          style={{ minWidth: 0 }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 z-10 flex h-full w-1.5 cursor-col-resize items-center justify-center hover:bg-border/50 active:bg-border transition-colors"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
          >
            <GripVertical className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Chat</h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Approval mode selector */}
              <Select
                value={approvalMode}
                onValueChange={(v) => setApprovalMode(v as ApprovalMode)}
              >
                <SelectTrigger size="sm" className="h-7 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggest">Suggest</SelectItem>
                  <SelectItem value="auto-edit">Auto-edit</SelectItem>
                  <SelectItem value="full-auto">Full-auto</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setChatPanelOpen(false)}
                aria-label="Close chat panel"
              >
                <PanelRightClose className="size-4" />
              </Button>
            </div>
          </div>

          {/* Messages area */}
          <ScrollArea ref={scrollRef} className="flex-1 overflow-hidden">
            {isLoading ? (
              <ChatSkeleton />
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                  <MessageSquare className="mx-auto size-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No messages yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Agent activity and messages will appear here
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-4">
                {messages.map((message) =>
                  renderMessage(
                    message,
                    handleApprove,
                    handleApproveAndEdit,
                    handleReject,
                    isAnswering,
                  ),
                )}
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Input area */}
          <div className="p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeProjectId
                    ? "Send a message..."
                    : "Select a project first"
                }
                disabled={!activeProjectId || isSending}
                className="min-h-9 max-h-32 resize-none text-sm"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending || !activeProjectId}
                aria-label="Send message"
              >
                <SendHorizonal className="size-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground/60">
              Enter to send, Shift+Enter for newline
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
