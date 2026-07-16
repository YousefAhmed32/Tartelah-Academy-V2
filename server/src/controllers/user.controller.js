const User = require('../models/User')
const { sendSuccess, sendError } = require('../utils/response')
const { isValidGender } = require('../config/teacherIdentity')
const { uploadBuffer, deleteFile } = require('../services/media.service')

exports.updateMe = async (req, res, next) => {
  try {
    const allowed = ['firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'phone', 'bioAr', 'specialization']
    // A teacher is the most authoritative source for their own identity, so
    // self-edit is allowed here — but only ever to a valid enum value, and
    // never silently cleared by an unrelated profile save (see the
    // `!== undefined` guard shared with every other field below).
    if (req.user.role === 'teacher') allowed.push('gender')
    if (req.body.gender !== undefined && !isValidGender(req.body.gender)) {
      return sendError(res, 'يجب تحديد تصنيف المعلم: معلم أو معلمة', 400)
    }
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

    const existing = await User.findById(req.user._id)
    const oldAvatarId = existing.avatar

    const newId = await uploadBuffer({
      buffer: req.file.buffer,
      filename: `avatar_${req.user._id}_${Date.now()}`,
      mimetype: req.file.mimetype,
      metadata: { category: 'avatar', uploadedBy: req.user._id, private: false },
    })

    const user = await User.findByIdAndUpdate(req.user._id, { avatar: newId }, { new: true })
    if (oldAvatarId) await deleteFile(oldAvatarId)

    sendSuccess(res, { avatar: user.avatar, user: user.toPublic() }, 'تم تحديث الصورة الشخصية')
  } catch (err) {
    next(err)
  }
}
