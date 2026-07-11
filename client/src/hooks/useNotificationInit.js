import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { useNotificationStore } from '../store/notificationStore.js'
import { connectSocket, disconnectSocket } from '../services/socket.service.js'
import api from '../utils/api.js'

// Reconciliation poll interval for the unread badge. The socket already
// pushes live increments (see notification:new below); this is a safety net
// for missed events (brief disconnects, multiple open tabs) — not the
// primary update path, so it can be relatively infrequent.
const UNREAD_COUNT_POLL_MS = 60 * 1000

export function useNotificationInit() {
  const { accessToken, isAuthenticated } = useAuthStore()
  const { addNotification, setNotifications, setUnreadCount } = useNotificationStore()

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    function syncUnreadCount() {
      // The authoritative unread count comes from a dedicated, unbounded
      // COUNT query — never from counting the capped preview list, which
      // would silently undercount once a user passes ~30 unread items.
      api.get('/notifications/unread-count').then(r => {
        const count = r.data?.data?.count
        if (typeof count === 'number') setUnreadCount(count)
      }).catch(() => {})
    }

    // Fetch initial notification preview list + authoritative unread count
    api.get('/notifications?limit=30').then(r => {
      const data = r.data?.data
      if (Array.isArray(data?.notifications)) {
        setNotifications(data.notifications)
      }
    }).catch(() => {})
    syncUnreadCount()

    const pollId = setInterval(syncUnreadCount, UNREAD_COUNT_POLL_MS)

    // Connect socket
    const socket = connectSocket(accessToken)

    socket.on('notification:new', (notif) => {
      addNotification(notif)
    })
    // Reconcile immediately on reconnect too, in case events were missed
    // while disconnected (e.g. brief network drop, tab was backgrounded).
    socket.on('connect', syncUnreadCount)

    return () => {
      clearInterval(pollId)
      socket.off('notification:new')
      socket.off('connect', syncUnreadCount)
    }
    // addNotification/setNotifications/setUnreadCount are stable Zustand action
    // references (identity never changes), so this effect still only re-runs on auth change.
  }, [isAuthenticated, accessToken, addNotification, setNotifications, setUnreadCount])

  useEffect(() => {
    return () => {
      disconnectSocket()
    }
  }, [])
}
