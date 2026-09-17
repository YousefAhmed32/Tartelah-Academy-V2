function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(query.limit) || 20))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

function buildArabicRegexPattern(str) {
  return str
    .trim()
    .replace(/[ً-ٰٟۖ-ۭ]/g, '') // strip tashkeel
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[أإآا]/g, '[أإآا]')
    .replace(/[ةه]/g, '[ةه]')
    .replace(/[يى]/g, '[يى]')
    .replace(/\s+/g, '\\s*')
}

function buildSearchFilter(search, fields) {
  if (!search || !fields?.length) return {}
  const rawSearch = search.trim()
  if (!rawSearch) return {}

  const pattern = buildArabicRegexPattern(rawSearch)
  const regex = new RegExp(pattern, 'i')

  const conditions = fields.map(f => ({ [f]: regex }))

  // If both firstNameAr and lastNameAr are included, allow matching full Arabic name
  if (fields.includes('firstNameAr') && fields.includes('lastNameAr')) {
    conditions.push({
      $expr: {
        $regexMatch: {
          input: { $concat: [{ $ifNull: ['$firstNameAr', ''] }, ' ', { $ifNull: ['$lastNameAr', ''] }] },
          regex: pattern,
          options: 'i',
        },
      },
    })
  }

  // If both firstName and lastName are included, allow matching full English name
  if (fields.includes('firstName') && fields.includes('lastName')) {
    conditions.push({
      $expr: {
        $regexMatch: {
          input: { $concat: [{ $ifNull: ['$firstName', ''] }, ' ', { $ifNull: ['$lastName', ''] }] },
          regex: pattern,
          options: 'i',
        },
      },
    })
  }

  return { $or: conditions }
}

module.exports = { getPagination, buildSearchFilter, buildArabicRegexPattern }

