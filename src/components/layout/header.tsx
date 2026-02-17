"use client";

import { Bell, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/stores/app-store";

interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  const { setCommandPaletteOpen, toggleChatPanel } = useAppStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        )}
        {children}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleChatPanel}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
