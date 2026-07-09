import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { useNotificationStore } from '../store/notificationStore.js'
import { connectSocket, disconnectSocket } from '../services/socket.service.js'
import api from '../utils/api.js'

export function useNotificationInit() {
  const { accessToken, isAuthenticated } = useAuthStore()
  const { addNotification, setNotifications } = useNotificationStore()

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    // Fetch initial notifications + unread count
    api.get('/notifications?limit=30').then(r => {
      const data = r.data?.data
      if (Array.isArray(data?.notifications)) {
        setNotifications(data.notifications)
      }
    }).catch(() => {})

    // Connect socket
    const socket = connectSocket(accessToken)

    socket.on('notification:new', (notif) => {
      addNotification(notif)
    })

    return () => {
      socket.off('notification:new')
    }
    // addNotification/setNotifications are stable Zustand action references
    // (identity never changes), so this effect still only re-runs on auth change.
  }, [isAuthenticated, accessToken, addNotification, setNotifications])

  useEffect(() => {
    return () => {
      disconnectSocket()
    }
  }, [])
}
