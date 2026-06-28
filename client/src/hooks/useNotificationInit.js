import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore.js'
import { useNotificationStore } from '../store/notificationStore.js'
import { connectSocket, disconnectSocket } from '../services/socket.service.js'
import api from '../utils/api.js'

export function useNotificationInit() {
  const { accessToken, isAuthenticated } = useAuthStore()
  const { addNotification, setUnreadCount, setNotifications } = useNotificationStore()

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    // Fetch initial notifications + unread count
    api.get('/notifications?limit=30').then(r => {
      const data = r.data.data
      if (data?.notifications) {
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
  }, [isAuthenticated, accessToken])

  useEffect(() => {
    return () => {
      disconnectSocket()
    }
  }, [])
}
