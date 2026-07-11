const AuditLog = require('../models/AuditLog')
const { sendSuccess, sendPaginated, sendError } = require('../utils/response')
const { getPagination } = require('../utils/pagination')

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const filter = {}
    if (req.query.actorId) filter.actorId = req.query.actorId
    if (req.query.entity) filter.entity = req.query.entity
    if (req.query.action) filter.action = req.query.action
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {}
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom)
      if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo)
    }
    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('actorId', 'firstNameAr lastNameAr email role'),
      AuditLog.countDocuments(filter),
    ])
    sendPaginated(res, data, total, page, limit)
  } catch (err) { next(err) }
}

exports.getAuditLogStats = async (req, res, next) => {
  try {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const last7Days = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000)

    const [total, todayCount, week, actorAgg, topActionAgg] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      AuditLog.countDocuments({ createdAt: { $gte: last7Days } }),
      AuditLog.aggregate([{ $group: { _id: '$actorId' } }, { $count: 'count' }]),
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
    ])

    sendSuccess(res, {
      total,
      today: todayCount,
      last7Days: week,
      uniqueActors: actorAgg[0]?.count || 0,
      topAction: topActionAgg[0] ? { action: topActionAgg[0]._id, count: topActionAgg[0].count } : null,
    })
  } catch (err) { next(err) }
}
