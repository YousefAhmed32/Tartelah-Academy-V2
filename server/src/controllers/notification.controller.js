const Notification = require('../models/Notification')
const User = require('../models/User')
const { sendSuccess } = require('../utils/response')

exports.getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
    sendSuccess(res, notifications)
  } catch (err) {
    next(err)
  }
}

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true, readAt: new Date() })
    sendSuccess(res, null, 'تم تحديد الكل كمقروء')
  } catch (err) {
    next(err)
  }
}

exports.markOneRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true, readAt: new Date() })
    sendSuccess(res, null, 'تم تحديث الإشعار')
  } catch (err) {
    next(err)
  }
}

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false })
    sendSuccess(res, { count })
  } catch (err) {
    next(err)
  }
}

exports.broadcastNotification = async (req, res, next) => {
  try {
    const { titleAr, bodyAr, type, target, role } = req.body
    let users
    if (target === 'all') {
      users = await User.find({ isActive: true }).select('_id')
    } else {
      users = await User.find({ role, isActive: true }).select('_id')
    }
    const notifications = users.map(u => ({ userId: u._id, titleAr, bodyAr, type: type || 'system' }))
    await Notification.insertMany(notifications)
    sendSuccess(res, { sent: notifications.length }, 'تم إرسال الإشعارات')
  } catch (err) {
    next(err)
  }
}

exports.getAdminNotificationLogs = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ type: 'system' })
      .sort({ createdAt: -1 })
      .limit(50)
    sendSuccess(res, notifications)
  } catch (err) {
    next(err)
  }
}
