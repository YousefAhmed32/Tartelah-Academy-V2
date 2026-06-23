const path = require('path')
const fs = require('fs')
const User = require('../models/User')
const { sendSuccess, sendError } = require('../utils/response')

exports.updateMe = async (req, res, next) => {
  try {
    const allowed = ['firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'phone', 'bioAr', 'specialization']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
    sendSuccess(res, user.toPublic(), 'تم تحديث الملف الشخصي')
  } catch (err) {
    next(err)
  }
}

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'لم يتم اختيار صورة', 400)
    const avatarUrl = `/uploads/avatars/${req.file.filename}`

    // Delete old avatar file if it was locally stored
    const existing = await User.findById(req.user._id)
    if (existing.avatar && existing.avatar.startsWith('/uploads/')) {
      const oldPath = path.join(process.cwd(), existing.avatar)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true })
    sendSuccess(res, { avatar: avatarUrl, user: user.toPublic() }, 'تم تحديث الصورة الشخصية')
  } catch (err) {
    next(err)
  }
}
