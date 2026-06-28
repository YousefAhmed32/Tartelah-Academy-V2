const jwt = require('jsonwebtoken')

let _io = null

function init(httpServer) {
  const { Server } = require('socket.io')
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
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
    }
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`)
    }
    socket.on('disconnect', () => {})
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

module.exports = { init, emitToUser, emitToRole, getIO }
