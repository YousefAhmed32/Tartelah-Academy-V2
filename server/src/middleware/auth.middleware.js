const { verifyAccessToken } = require('../config/jwt')
const User = require('../models/User')

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'غير مصرح: يرجى تسجيل الدخول' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyAccessToken(token)
    const user = await User.findById(decoded.id).select('-password -refreshToken')
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'المستخدم غير موجود أو محظور' })
    }
    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'انتهت صلاحية الجلسة', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ success: false, message: 'رمز التحقق غير صالح' })
  }
}

module.exports = { authenticate }
