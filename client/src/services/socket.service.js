import { io } from 'socket.io-client'

const SOCKET_URL = (() => {
  const api = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
  return api.replace('/api/v1', '')
})()

let socket = null

export function connectSocket(token) {
  if (socket?.connected) return socket
  if (socket) socket.disconnect()

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket() {
  return socket
}
