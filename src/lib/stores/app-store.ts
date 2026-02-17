import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  commandPaletteOpen: boolean;
  activeProjectId: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleChatPanel: () => void;
  setChatPanelOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveProjectId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  chatPanelOpen: false,
  commandPaletteOpen: false,
  activeProjectId: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
  setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
}));
