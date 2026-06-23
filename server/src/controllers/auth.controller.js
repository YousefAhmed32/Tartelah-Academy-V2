const User = require('../models/User')
const Notification = require('../models/Notification')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../config/jwt')
const { sendSuccess, sendError } = require('../utils/response')
const { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/email.service')
const crypto = require('crypto')

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

function issueTokens(user, res) {
  const payload = { id: user._id, role: user.role }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS)
  return accessToken
}

exports.register = async (req, res, next) => {
  try {
    const { firstNameAr, lastNameAr, firstName, lastName, email, password, phone } = req.body
    const existing = await User.findOne({ email })
    if (existing) return sendError(res, 'البريد الإلكتروني مسجل مسبقاً', 409)
    const user = await User.create({
      firstNameAr, lastNameAr, firstName: firstName || firstNameAr, lastName: lastName || lastNameAr, email, password, phone,
    })
    await Notification.create({ userId: user._id, titleAr: 'أهلاً بك في ترتيلة!', bodyAr: 'تم إنشاء حسابك بنجاح.', type: 'system' })
    // Send welcome email (non-blocking)
    sendWelcomeEmail({ to: user.email, name: user.firstNameAr }).catch(() => {})
    const accessToken = issueTokens(user, res)
    sendSuccess(res, { user: user.toPublic(), accessToken }, 'تم التسجيل بنجاح', 201)
  } catch (err) {
    next(err)
  }
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 401)
    }
    if (!user.isActive) return sendError(res, 'تم إيقاف حسابك. تواصل مع الإدارة.', 403)
    const accessToken = issueTokens(user, res)
    sendSuccess(res, { user: user.toPublic(), accessToken }, 'تم تسجيل الدخول بنجاح')
  } catch (err) {
    next(err)
  }
}

exports.logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken', { ...COOKIE_OPTS, maxAge: 0 })
    sendSuccess(res, null, 'تم تسجيل الخروج')
  } catch (err) {
    next(err)
  }
}

exports.me = async (req, res, next) => {
  try {
    sendSuccess(res, req.user.toPublic())
  } catch (err) {
    next(err)
  }
}

exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return sendError(res, 'لا يوجد رمز تحديث', 401)
    const decoded = verifyRefreshToken(token)
    const user = await User.findById(decoded.id)
    if (!user || !user.isActive) return sendError(res, 'المستخدم غير موجود', 401)
    const accessToken = signAccessToken({ id: user._id, role: user.role })
    sendSuccess(res, { accessToken })
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      res.clearCookie('refreshToken', { ...COOKIE_OPTS, maxAge: 0 })
      return sendError(res, 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً', 401)
    }
    next(err)
  }
}

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) return sendSuccess(res, null, 'إذا كان البريد مسجلاً، ستصلك رسالة')
    const token = crypto.randomBytes(32).toString('hex')
    user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex')
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000
    await user.save({ validateBeforeSave: false })
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`
    console.log(`[DEV] Reset link: ${resetUrl}`)
    sendPasswordResetEmail({ to: user.email, name: user.firstNameAr, resetUrl }).catch(() => {})
    sendSuccess(res, null, 'إذا كان البريد مسجلاً، ستصلك رسالة')
  } catch (err) {
    next(err)
  }
}

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } }).select('+password')
    if (!user) return sendError(res, 'الرابط غير صالح أو منتهي الصلاحية', 400)
    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()
    sendSuccess(res, null, 'تم إعادة تعيين كلمة المرور بنجاح')
  } catch (err) {
    next(err)
  }
}

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+password')
    if (!(await user.comparePassword(currentPassword))) return sendError(res, 'كلمة المرور الحالية غير صحيحة', 400)
    user.password = newPassword
    await user.save()
    sendPasswordChangedEmail({ to: user.email, name: user.firstNameAr }).catch(() => {})
    sendSuccess(res, null, 'تم تغيير كلمة المرور بنجاح')
  } catch (err) {
    next(err)
  }
}

// Dev-only: instant login by role — never runs in production
exports.devLogin = async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' })
  }
  try {
    const { role } = req.body
    if (!['admin', 'teacher', 'student'].includes(role)) {
      return sendError(res, 'Invalid role. Use: admin | teacher | student', 400)
    }
    // Prefer the specific dev account, fall back to any active user with that role
    const DEV_EMAILS = {
      admin: 'admin@tartelah.com',
      teacher: 'teacher@tartelah.com',
      student: 'student@tartelah.com',
    }
    let user = await User.findOne({ email: DEV_EMAILS[role], isActive: true })
    if (!user) user = await User.findOne({ role, isActive: true })
    if (!user) return sendError(res, `No active ${role} account found. Run npm run seed first.`, 404)
    const accessToken = issueTokens(user, res)
    sendSuccess(res, { user: user.toPublic(), accessToken }, `Dev login successful as ${role}`)
  } catch (err) {
    next(err)
  }
}
