const Notification = require('../models/Notification')
const User = require('../models/User')
const { sendSuccess } = require('../utils/response')
const { createNotifications } = require('../services/notification.service')
const socketService = require('../services/socket.service')

exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, type, isRead, isArchived } = req.query
    const filter = { userId: req.user._id }
    if (type && type !== 'all') filter.type = type
    if (isRead === 'true') filter.isRead = true
    if (isRead === 'false') filter.isRead = false
    // Archived notifications are hidden from the default/inbox view unless explicitly requested —
    // mirrors the "archive" mental model (out of the way, not deleted, still reachable).
    filter.isArchived = isArchived === 'true'

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Notification.countDocuments(filter),
    ])
    sendSuccess(res, { notifications, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    next(err)
  }
}

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false, isArchived: false })
    sendSuccess(res, { count })
  } catch (err) {
    next(err)
  }
}

exports.markOneRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    )
    if (!notif) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' })
    sendSuccess(res, notif, 'تم تحديث الإشعار')
  } catch (err) {
    next(err)
  }
}

exports.markOneUnread = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: false, $unset: { readAt: 1 } },
      { new: true }
    )
    if (!notif) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' })
    sendSuccess(res, notif, 'تم تحديث الإشعار')
  } catch (err) {
    next(err)
  }
}

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    )
    sendSuccess(res, null, 'تم تحديد الكل كمقروء')
  } catch (err) {
    next(err)
  }
}

exports.deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!notif) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' })
    sendSuccess(res, null, 'تم حذف الإشعار')
  } catch (err) {
    next(err)
  }
}

exports.deleteAllRead = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ userId: req.user._id, isRead: true })
    sendSuccess(res, { deleted: result.deletedCount }, 'تم حذف الإشعارات المقروءة')
  } catch (err) {
    next(err)
  }
}

exports.archiveOne = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    )
    if (!notif) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' })
    sendSuccess(res, notif, 'تمت أرشفة الإشعار')
  } catch (err) {
    next(err)
  }
}

exports.unarchiveOne = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isArchived: false, $unset: { archivedAt: 1 } },
      { new: true }
    )
    if (!notif) return res.status(404).json({ success: false, message: 'الإشعار غير موجود' })
    sendSuccess(res, notif, 'تمت إعادة الإشعار من الأرشيف')
  } catch (err) {
    next(err)
  }
}

// Bulk actions operate only on the requesting user's own notifications — the
// id list is client-supplied, so every write is still scoped by `userId` to
// prevent one user from touching another's notifications by guessing ids.
const BULK_ACTIONS = {
  read:      { isRead: true, readAt: new Date() },
  unread:    { isRead: false, $unset: { readAt: 1 } },
  archive:   { isArchived: true, archivedAt: new Date() },
  unarchive: { isArchived: false, $unset: { archivedAt: 1 } },
}

exports.bulkUpdate = async (req, res, next) => {
  try {
    const { ids, action } = req.body
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, message: 'لم يتم تحديد أي إشعار' })
    const update = BULK_ACTIONS[action]
    if (!update) return res.status(400).json({ success: false, message: 'إجراء غير صالح' })

    const result = await Notification.updateMany(
      { _id: { $in: ids }, userId: req.user._id },
      update
    )
    sendSuccess(res, { matched: result.matchedCount, modified: result.modifiedCount }, 'تم تحديث الإشعارات المحددة')
  } catch (err) {
    next(err)
  }
}

exports.bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, message: 'لم يتم تحديد أي إشعار' })
    const result = await Notification.deleteMany({ _id: { $in: ids }, userId: req.user._id })
    sendSuccess(res, { deleted: result.deletedCount }, 'تم حذف الإشعارات المحددة')
  } catch (err) {
    next(err)
  }
}

exports.broadcastNotification = async (req, res, next) => {
  try {
    const { titleAr, bodyAr, type, target, role, priority } = req.body
    let users
    if (target === 'all') {
      users = await User.find({ isActive: true }).select('_id')
    } else {
      users = await User.find({ role, isActive: true }).select('_id')
    }
    const notifications = users.map(u => ({
      userId: u._id,
      titleAr,
      bodyAr,
      type: type || 'system',
      priority: priority || 'medium',
    }))
    await createNotifications(notifications)
    sendSuccess(res, { sent: notifications.length }, 'تم إرسال الإشعارات')
  } catch (err) {
    next(err)
  }
}

exports.getAdminNotificationLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, role, search } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const filter = {}
    if (type && type !== 'all') filter.type = type

    // Build pipeline to join with user for role filter + search
    const pipeline = [
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmpty: true } },
    ]
    if (role && role !== 'all') pipeline.push({ $match: { 'user.role': role } })
    if (search) pipeline.push({ $match: { $or: [{ 'user.firstNameAr': { $regex: search, $options: 'i' } }, { 'user.email': { $regex: search, $options: 'i' } }, { titleAr: { $regex: search, $options: 'i' } }] } })
    if (filter.type) pipeline.push({ $match: { type: filter.type } })

    const countPipeline = [...pipeline, { $count: 'total' }]
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) })
    pipeline.push({ $project: { 'user.password': 0, 'user.refreshToken': 0 } })

    const [notifications, countResult] = await Promise.all([
      Notification.aggregate(pipeline),
      Notification.aggregate(countPipeline),
    ])

    sendSuccess(res, {
      notifications,
      total: countResult[0]?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    })
  } catch (err) {
    next(err)
  }
}
