"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Settings,
  Plug,
  Plus,
  Search,
  Home,
  Activity,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const commands: CommandItem[] = [
    {
      id: "home",
      label: "Dashboard",
      description: "Go to the dashboard",
      icon: <Home className="h-4 w-4" />,
      action: () => router.push("/"),
      keywords: ["home", "main"],
    },
    {
      id: "new-project",
      label: "New Project",
      description: "Create a new project",
      icon: <Plus className="h-4 w-4" />,
      action: () => router.push("/projects/new"),
      keywords: ["create", "add"],
    },
    {
      id: "connections",
      label: "Connections",
      description: "Manage global connections",
      icon: <Plug className="h-4 w-4" />,
      action: () => router.push("/connections"),
      keywords: ["mcp", "integrations"],
    },
    {
      id: "settings",
      label: "Settings",
      description: "Global settings",
      icon: <Settings className="h-4 w-4" />,
      action: () => router.push("/settings"),
      keywords: ["config", "preferences"],
    },
  ];

  const filtered = search
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(search.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(search.toLowerCase()) ||
          cmd.keywords?.some((kw) =>
            kw.toLowerCase().includes(search.toLowerCase()),
          ),
      )
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setSearch("");
      }

      if (!open) return;

      if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        setOpen(false);
      }
    },
    [open, filtered, selectedIndex],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-background shadow-2xl">
        {/* Search input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No commands found
            </p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                  i === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <span className="text-muted-foreground">{cmd.icon}</span>
                <div>
                  <p className="font-medium">{cmd.label}</p>
                  {cmd.description && (
                    <p className="text-xs text-muted-foreground">
                      {cmd.description}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            <kbd className="rounded border border-border px-1">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="rounded border border-border px-1">↵</kbd> Select
          </span>
          <span>
            <kbd className="rounded border border-border px-1">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
