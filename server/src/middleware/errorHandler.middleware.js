function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500
  let message = err.message || 'حدث خطأ في الخادم'

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400
    const messages = Object.values(err.errors).map(e => e.message)
    message = messages.join('. ')
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409
    const field = Object.keys(err.keyValue)[0]
    message = field === 'email' ? 'البريد الإلكتروني مسجل مسبقاً' : `${field} موجود مسبقاً`
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400
    message = 'معرف غير صالح'
  }

  // JWT errors handled in auth middleware

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err)
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: `المسار غير موجود: ${req.method} ${req.path}` })
}

module.exports = { errorHandler, notFound }
