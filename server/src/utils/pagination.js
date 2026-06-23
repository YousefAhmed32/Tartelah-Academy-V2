function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

function buildSearchFilter(search, fields) {
  if (!search || !fields?.length) return {}
  const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return { $or: fields.map(f => ({ [f]: regex })) }
}

module.exports = { getPagination, buildSearchFilter }
