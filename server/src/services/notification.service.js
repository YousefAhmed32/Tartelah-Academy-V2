const Notification = require('../models/Notification')
const socketService = require('./socket.service')

async function createNotification({ userId, titleAr, bodyAr, type, priority, actionUrl, relatedId, metadata }) {
  const notif = await Notification.create({
    userId,
    titleAr,
    bodyAr,
    type,
    priority: priority || 'medium',
    actionUrl,
    relatedId,
    metadata,
  })
  socketService.emitToUser(userId, 'notification:new', notif)
  return notif
}

async function createNotifications(notifications) {
  if (!notifications || !notifications.length) return []
  const docs = notifications.map(n => ({ ...n, priority: n.priority || 'medium' }))
  const created = await Notification.insertMany(docs)
  for (const n of created) {
    socketService.emitToUser(n.userId, 'notification:new', n)
  }
  return created
}

module.exports = { createNotification, createNotifications }
