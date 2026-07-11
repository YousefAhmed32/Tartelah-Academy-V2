import { create } from 'zustand'
import toast from 'react-hot-toast'

export const useNotificationStore = create((set) => ({
  unreadCount: 0,
  notifications: [],
  dropdownOpen: false,

  setUnreadCount: (count) => set({ unreadCount: count }),

  // Does NOT derive unreadCount from this list — the list is capped (last ~30
  // fetched) so counting within it would silently undercount whenever a user
  // has more unread notifications than that cap. unreadCount is kept in sync
  // separately from the dedicated /notifications/unread-count endpoint (see
  // useNotificationInit.js), which is the only authoritative source.
  setNotifications: (notifications) => set({ notifications }),

  prependNotifications: (list) => set((s) => {
    const existing = new Set(s.notifications.map(n => n._id))
    const newOnes = list.filter(n => !existing.has(n._id))
    return { notifications: [...newOnes, ...s.notifications] }
  }),

  addNotification: (notification) => {
    set((s) => ({
      notifications: [notification, ...s.notifications].slice(0, 200),
      unreadCount: s.unreadCount + 1,
    }))
    toast(notification.titleAr || notification.title || 'إشعار جديد', {
      style: {
        background: '#1d0a3f',
        color: '#fff',
        border: '1px solid rgba(232,199,106,0.25)',
        borderRadius: '14px',
        fontSize: '13px',
        fontWeight: '600',
        direction: 'rtl',
        padding: '12px 16px',
      },
      duration: 5000,
    })
  },

  toggleDropdown: () => set(s => ({ dropdownOpen: !s.dropdownOpen })),
  openDropdown: () => set({ dropdownOpen: true }),
  closeDropdown: () => set({ dropdownOpen: false }),

  markRead: (id) => set((s) => {
    const notif = s.notifications.find(n => n._id === id)
    if (!notif || notif.isRead) return s
    return {
      notifications: s.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }
  }),

  markUnread: (id) => set((s) => {
    const notif = s.notifications.find(n => n._id === id)
    if (!notif || !notif.isRead) return s
    return {
      notifications: s.notifications.map(n => n._id === id ? { ...n, isRead: false } : n),
      unreadCount: s.unreadCount + 1,
    }
  }),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),

  removeNotification: (id) => set((s) => {
    const notif = s.notifications.find(n => n._id === id)
    return {
      notifications: s.notifications.filter(n => n._id !== id),
      unreadCount: notif && !notif.isRead ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
    }
  }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}))
