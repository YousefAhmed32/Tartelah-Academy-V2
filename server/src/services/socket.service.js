const { verifyAccessToken } = require('../config/jwt')

let _io = null

// Lightweight online-presence tracking, keyed by userId → open socket count
// (a user can have multiple tabs/devices open; only remove them from
// "online" once their LAST socket disconnects, not the first one). This is
// intentionally in-memory/per-process — fine for this single-instance
// deployment (see docs/DEPLOYMENT.md); a multi-instance deployment would
// need to move this to a shared store (Redis) instead.
const onlineUsers = new Map() // userId -> { role, count }

function markOnline(userId, role) {
  if (!userId) return
  const entry = onlineUsers.get(userId)
  if (entry) entry.count += 1
  else onlineUsers.set(userId, { role, count: 1 })
}

function markOffline(userId) {
  if (!userId) return
  const entry = onlineUsers.get(userId)
  if (!entry) return
  entry.count -= 1
  if (entry.count <= 0) onlineUsers.delete(userId)
}

function getOnlineCounts() {
  const counts = { admin: 0, teacher: 0, student: 0 }
  for (const { role } of onlineUsers.values()) {
    if (counts[role] !== undefined) counts[role] += 1
  }
  return counts
}

function init(httpServer) {
  const { Server } = require('socket.io')
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token'))
    try {
      const decoded = verifyAccessToken(token)
      socket.userId = (decoded.id || decoded._id || decoded.sub || '').toString()
      socket.userRole = decoded.role || ''
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`)
      markOnline(socket.userId, socket.userRole)
    }
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`)
    }
    socket.on('disconnect', () => {
      markOffline(socket.userId)
    })
  })

  _io = io
  return io
}

function emitToUser(userId, event, data) {
  if (_io && userId) {
    _io.to(`user:${userId.toString()}`).emit(event, data)
  }
}

function emitToRole(role, event, data) {
  if (_io && role) {
    _io.to(`role:${role}`).emit(event, data)
  }
}

function getIO() {
  return _io
}

module.exports = { init, emitToUser, emitToRole, getIO, getOnlineCounts }
