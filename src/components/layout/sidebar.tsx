"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  Plug,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/stores/app-store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar"
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-3">
        {sidebarOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-bold text-foreground"
          >
            exeflow
          </motion.span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* New Project Button */}
      <div className="px-3 pb-2">
        <Link href="/projects/new">
          <Button
            variant="default"
            className={cn(
              "w-full justify-start gap-2",
              !sidebarOpen && "justify-center px-0",
            )}
          >
            <Plus className="h-4 w-4" />
            {sidebarOpen && <span>New Project</span>}
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  !sidebarOpen && "justify-center px-0",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
