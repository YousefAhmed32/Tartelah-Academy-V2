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
