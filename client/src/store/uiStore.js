import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  language: 'ar',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  setLanguage: (language) => set({ language }),
}))
