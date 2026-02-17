"use client";

import { CommandPalette } from "@/components/dashboard/command-palette";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CommandPalette />
      {children}
    </>
  );
}
