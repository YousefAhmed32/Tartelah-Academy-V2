import { io } from 'socket.io-client'
import { BACKEND_URL } from '../config/constants.js'

let socket = null

export function connectSocket(token) {
  if (socket?.connected) return socket
  if (socket) socket.disconnect()

  socket = io(BACKEND_URL, {
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
