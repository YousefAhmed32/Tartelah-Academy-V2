// Admin management screen for the academy-wide default student/teacher
// passwords (Phase 2 meeting addendum §1). Every mutating action is audited
// WITHOUT the secret itself — see logAction calls below, none of which
// include `password`. Gated by the dedicated 'credentials.manage_defaults'
// permission (config/permissions.js) rather than the general settings.update
// grant.
const { sendSuccess, sendError } = require('../utils/response')
const { logAction } = require('../services/audit.service')
const credentialDefaultsService = require('../services/credentialDefaults.service')
const { isCryptoConfigured } = require('../utils/credentialDefaultsCipher')

exports.getStatus = async (req, res, next) => {
  try {
    const status = await credentialDefaultsService.getStatus()
    sendSuccess(res, { ...status, cryptoConfigured: isCryptoConfigured() })
  } catch (err) { next(err) }
}

// Lightweight, low-sensitivity variant for the account-creation credential
// picker (PasswordCredentialSection) — any admin who can create a teacher/
// student needs to know WHETHER a default is configured (to offer/disable
// the option), without needing the higher 'credentials.manage_defaults'
// authority to see WHEN it was last changed or by whom.
exports.getAvailability = async (req, res, next) => {
  try {
    const status = await credentialDefaultsService.getStatus()
    sendSuccess(res, { student: status.student.configured, teacher: status.teacher.configured })
  } catch (err) { next(err) }
}

exports.setDefault = async (req, res, next) => {
  try {
    const { role } = req.params
    const { password, passwordConfirm } = req.body
    let result
    try {
      result = await credentialDefaultsService.setDefault(role, { password, passwordConfirm }, { actorId: req.user._id })
    } catch (err) {
      if (err.status) return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
      throw err
    }

    // Deliberately never includes `password`/`passwordConfirm` — only the
    // fact that a change happened, by whom, and for which role.
    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'credentials.set_default_password',
      entity: 'CredentialDefaults', entityId: 'global', changes: { role }, ip: req.ip,
    })

    sendSuccess(res, result, role === 'student' ? 'تم حفظ كلمة المرور الافتراضية للطلاب' : 'تم حفظ كلمة المرور الافتراضية للمعلمين')
  } catch (err) { next(err) }
}

exports.clearDefault = async (req, res, next) => {
  try {
    const { role } = req.params
    let result
    try {
      result = await credentialDefaultsService.clearDefault(role, { actorId: req.user._id })
    } catch (err) {
      if (err.status) return sendError(res, err.message, err.status, err.field ? { field: err.field } : undefined)
      throw err
    }

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'credentials.clear_default_password',
      entity: 'CredentialDefaults', entityId: 'global', changes: { role }, ip: req.ip,
    })

    sendSuccess(res, result, 'تم إلغاء تفعيل كلمة المرور الافتراضية')
  } catch (err) { next(err) }
}
