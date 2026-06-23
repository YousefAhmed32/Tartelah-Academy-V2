function sendSuccess(res, data = null, message = 'تمت العملية بنجاح', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data })
}

function sendError(res, message = 'حدث خطأ', statusCode = 500) {
  return res.status(statusCode).json({ success: false, message })
}

function sendPaginated(res, data, total, page, limit, message = 'تمت العملية بنجاح') {
  const totalPages = Math.ceil(total / limit)
  return res.status(200).json({
    success: true,
    message,
    data,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasMore: Number(page) < totalPages,
  })
}

module.exports = { sendSuccess, sendError, sendPaginated }
