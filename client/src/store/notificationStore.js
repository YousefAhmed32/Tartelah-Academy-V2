import { create } from 'zustand'

export const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  notifications: [],

  setUnreadCount: (count) => set({ unreadCount: count }),
  setNotifications: (notifications) => set({ notifications }),

  markRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) =>
      n._id === id ? { ...n, isRead: true } : n
    ),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),

  addNotification: (notification) => set((s) => ({
    notifications: [notification, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),
}))
