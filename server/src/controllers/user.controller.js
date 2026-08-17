const crypto = require('crypto')
const User = require('../models/User')
const { sendSuccess, sendError, sendPaginated } = require('../utils/response')
const { getPagination, buildSearchFilter } = require('../utils/pagination')
const { isValidGender } = require('../config/teacherIdentity')
const { uploadBuffer, deleteFile } = require('../services/media.service')
const { createNotification } = require('../services/notification.service')
const { logAction } = require('../services/audit.service')
const {
  ALL_PERMISSIONS, ALL_ROLES, ADMIN_FAMILY_ROLES, DEFAULT_PERMISSIONS_BY_ROLE,
  isValidPermission, isValidRole,
} = require('../config/permissions')

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

// ══════════════════════════════════════════════════════════════════════════
// Admin / Team Management — RBAC + PBAC user & permission administration.
// Every route here is additionally gated by requirePermission(...) in
// user.routes.js; the checks below cover the cross-cutting rules that a
// single permission flag can't express (self-escalation, Primary Admin
// protection, "last administrator" protection, privilege-ceiling checks).
// ══════════════════════════════════════════════════════════════════════════

const POPULATE_ACTOR = 'firstNameAr lastNameAr email role'

function generateTempPassword() {
  // 12 chars, guaranteed at least one upper/lower/digit/symbol so it always
  // clears typical password-strength validation on first login.
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%*?'
  const all = upper + lower + digits + symbols
  const pick = (set) => set[crypto.randomInt(set.length)]
  let pw = pick(upper) + pick(lower) + pick(digits) + pick(symbols)
  for (let i = pw.length; i < 12; i++) pw += pick(all)
  // Shuffle so the guaranteed chars aren't always in the same position.
  return pw.split('').sort(() => crypto.randomInt(3) - 1).join('')
}

// Every permission in `requested` must already be held by `actor` — the
// single choke point that prevents any account (other than the Primary
// Admin, who bypasses via hasPermission) from granting a permission it does
// not itself possess, whether at account-creation time or when editing an
// existing account's grants.
function forbiddenEscalation(actor, requested) {
  if (actor.isPrimaryAdmin) return []
  return requested.filter((p) => !actor.hasPermission(p))
}

async function countOtherActiveAdministrators(excludeId) {
  return User.countDocuments({
    _id: { $ne: excludeId },
    isActive: true,
    $or: [{ isPrimaryAdmin: true }, { role: 'admin' }],
  })
}

exports.listUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const searchFilter = buildSearchFilter(req.query.search, ['firstNameAr', 'lastNameAr', 'firstName', 'lastName', 'email'])
    const filter = { ...searchFilter }
    if (req.query.role && isValidRole(req.query.role)) filter.role = req.query.role
    if (req.query.status === 'active') filter.isActive = true
    if (req.query.status === 'inactive') filter.isActive = false

    const [data, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('createdBy', POPULATE_ACTOR)
        .populate('disabledBy', POPULATE_ACTOR)
        .populate('lastPermissionsChangedBy', POPULATE_ACTOR),
      User.countDocuments(filter),
    ])
    sendPaginated(res, data.map((u) => u.toPublic()), total, page, limit)
  } catch (err) { next(err) }
}

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('createdBy', POPULATE_ACTOR)
      .populate('disabledBy', POPULATE_ACTOR)
      .populate('lastPermissionsChangedBy', POPULATE_ACTOR)
    if (!user) return sendError(res, 'المستخدم غير موجود', 404)
    sendSuccess(res, user.toPublic())
  } catch (err) { next(err) }
}

exports.createUser = async (req, res, next) => {
  try {
    const {
      firstNameAr, lastNameAr, firstName, lastName, email, phone,
      role, displayRoleName, jobTitle, roleDescription, notes,
      password, isActive, mustChangePassword, permissions,
    } = req.body

    if (!isValidRole(role)) return sendError(res, 'الدور غير صالح', 400)

    // Creating any admin-family account (admin/assistant_admin/operator/
    // manager/staff) requires the explicit admins.create authority — a plain
    // users.create grant is only enough for teacher/student accounts.
    if (ADMIN_FAMILY_ROLES.includes(role) && !req.user.hasPermission('admins.create')) {
      return sendError(res, 'ليس لديك صلاحية لإنشاء حسابات إدارية', 403)
    }

    const existing = await User.findOne({ email })
    if (existing) return sendError(res, 'البريد الإلكتروني مسجل مسبقاً', 409)

    const requestedPermissions = Array.isArray(permissions) ? permissions : (DEFAULT_PERMISSIONS_BY_ROLE[role] || [])
    if (requestedPermissions.some((p) => !isValidPermission(p))) {
      return sendError(res, 'قائمة الصلاحيات تحتوي على صلاحية غير صالحة', 400)
    }
    const escalated = forbiddenEscalation(req.user, requestedPermissions)
    if (escalated.length) {
      return sendError(res, `لا يمكنك منح صلاحيات لا تملكها: ${escalated.join(', ')}`, 403)
    }

    const tempPassword = password || generateTempPassword()

    const user = await User.create({
      firstNameAr, lastNameAr,
      firstName: firstName || firstNameAr,
      lastName: lastName || lastNameAr,
      email, phone,
      role,
      displayRoleName: displayRoleName || null,
      jobTitle: jobTitle || null,
      roleDescription: roleDescription || null,
      notes: notes || null,
      password: tempPassword,
      isActive: isActive !== false,
      mustChangePassword: mustChangePassword !== false, // defaults true — force change unless explicitly disabled
      permissions: requestedPermissions,
      isPrimaryAdmin: false, // never settable via API
      createdBy: req.user._id,
    })

    logAction({
      actorId: req.user._id, actorRole: req.user.role,
      action: ADMIN_FAMILY_ROLES.includes(role) ? 'create_admin' : 'create_user',
      entity: 'User', entityId: user._id,
      changes: { role, permissions: requestedPermissions },
      ip: req.ip,
    })

    const responseData = { user: user.toPublic() }
    // The only moment the temporary password is ever returned — never again
    // after this response, and never stored anywhere in plaintext.
    if (!password) responseData.temporaryPassword = tempPassword

    sendSuccess(res, responseData, 'تم إنشاء الحساب بنجاح', 201)
  } catch (err) { next(err) }
}

exports.updateUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id)
    if (!target) return sendError(res, 'المستخدم غير موجود', 404)

    const {
      firstNameAr, lastNameAr, firstName, lastName, email, phone,
      displayRoleName, jobTitle, roleDescription, notes, role,
    } = req.body

    const updates = {}
    ;[
      ['firstNameAr', firstNameAr], ['lastNameAr', lastNameAr], ['firstName', firstName], ['lastName', lastName],
      ['phone', phone], ['displayRoleName', displayRoleName], ['jobTitle', jobTitle],
      ['roleDescription', roleDescription], ['notes', notes],
    ].forEach(([k, v]) => { if (v !== undefined) updates[k] = v })

    if (email !== undefined && email !== target.email) {
      const existing = await User.findOne({ email, _id: { $ne: target._id } })
      if (existing) return sendError(res, 'البريد الإلكتروني مسجل مسبقاً', 409)
      updates.email = email
    }

    if (role !== undefined && role !== target.role) {
      if (target.isPrimaryAdmin) return sendError(res, 'لا يمكن تغيير دور المسؤول الرئيسي', 403)
      // Role changes are only supported within the admin-family hierarchy —
      // moving a teacher/student into/out of that family (or vice versa)
      // isn't supported here since too much of the platform's data model
      // (sessions, subscriptions, payroll…) keys off those two roles.
      if (!ADMIN_FAMILY_ROLES.includes(role) || !ADMIN_FAMILY_ROLES.includes(target.role)) {
        return sendError(res, 'لا يمكن تغيير هذا الدور من هذه الشاشة', 400)
      }
      if (!req.user.hasPermission('admins.update')) {
        return sendError(res, 'ليس لديك صلاحية لتغيير الأدوار الإدارية', 403)
      }
      updates.role = role
    }

    const before = { role: target.role, displayRoleName: target.displayRoleName, jobTitle: target.jobTitle }
    Object.assign(target, updates)
    await target.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'update_user',
      entity: 'User', entityId: target._id, changes: { before, after: updates }, ip: req.ip,
    })

    sendSuccess(res, target.toPublic(), 'تم تحديث بيانات الحساب')
  } catch (err) { next(err) }
}

exports.updateUserPermissions = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id)
    if (!target) return sendError(res, 'المستخدم غير موجود', 404)
    if (target.isPrimaryAdmin) return sendError(res, 'لا يمكن تعديل صلاحيات المسؤول الرئيسي', 403)
    if (String(target._id) === String(req.user._id)) {
      return sendError(res, 'لا يمكنك تعديل صلاحياتك الخاصة', 403)
    }

    const { permissions } = req.body
    if (!Array.isArray(permissions) || permissions.some((p) => !isValidPermission(p))) {
      return sendError(res, 'قائمة الصلاحيات غير صالحة', 400)
    }

    const before = target.permissions || []
    const added = permissions.filter((p) => !before.includes(p))
    const escalated = forbiddenEscalation(req.user, added)
    if (escalated.length) {
      return sendError(res, `لا يمكنك منح صلاحيات لا تملكها: ${escalated.join(', ')}`, 403)
    }

    target.permissions = permissions
    target.lastPermissionsChangedBy = req.user._id
    target.lastPermissionsChangedAt = new Date()
    await target.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'update_permissions',
      entity: 'User', entityId: target._id, changes: { before, after: permissions }, ip: req.ip,
    })

    sendSuccess(res, target.toPublic(), 'تم تحديث الصلاحيات')
  } catch (err) { next(err) }
}

exports.updateUserStatus = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id).select('+tokenVersion')
    if (!target) return sendError(res, 'المستخدم غير موجود', 404)
    if (target.isPrimaryAdmin) return sendError(res, 'لا يمكن تعديل حالة المسؤول الرئيسي', 403)

    const { isActive } = req.body
    if (typeof isActive !== 'boolean') return sendError(res, 'قيمة الحالة غير صالحة', 400)

    if (!isActive) {
      if (String(target._id) === String(req.user._id)) {
        return sendError(res, 'لا يمكنك إيقاف حسابك الخاص', 403)
      }
      const remaining = await countOtherActiveAdministrators(target._id)
      if (remaining === 0 && (target.isPrimaryAdmin || target.role === 'admin')) {
        return sendError(res, 'لا يمكن إيقاف آخر حساب إداري في النظام', 400)
      }
      target.isActive = false
      target.disabledAt = new Date()
      target.disabledBy = req.user._id
      target.tokenVersion = (target.tokenVersion || 0) + 1 // revoke any live session immediately
    } else {
      target.isActive = true
      target.disabledAt = null
      target.disabledBy = null
    }
    await target.save()

    logAction({
      actorId: req.user._id, actorRole: req.user.role,
      action: isActive ? 'reactivate_user' : 'disable_user',
      entity: 'User', entityId: target._id, ip: req.ip,
    })

    sendSuccess(res, target.toPublic(), isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')
  } catch (err) { next(err) }
}

exports.resetUserPassword = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id).select('+password +tokenVersion')
    if (!target) return sendError(res, 'المستخدم غير موجود', 404)
    if (target.isPrimaryAdmin) return sendError(res, 'لا يمكن إعادة تعيين كلمة مرور المسؤول الرئيسي من هنا', 403)

    const { newPassword } = req.body
    if (newPassword && newPassword.length < 8) return sendError(res, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', 400)

    const tempPassword = newPassword || generateTempPassword()
    target.password = tempPassword
    target.mustChangePassword = true
    target.tokenVersion = (target.tokenVersion || 0) + 1
    target.passwordResetToken = undefined
    target.passwordResetExpires = undefined
    await target.save()

    createNotification({
      userId: target._id,
      titleAr: 'تم إعادة تعيين كلمة المرور',
      bodyAr: 'قام أحد المسؤولين بإعادة تعيين كلمة مرورك. يرجى تسجيل الدخول بالكلمة الجديدة وتغييرها.',
      type: 'system', priority: 'high',
    }).catch(() => {})

    logAction({
      actorId: req.user._id, actorRole: req.user.role, action: 'reset_password',
      entity: 'User', entityId: target._id, ip: req.ip,
    })

    const responseData = { user: target.toPublic() }
    if (!newPassword) responseData.temporaryPassword = tempPassword
    sendSuccess(res, responseData, 'تم إعادة تعيين كلمة المرور')
  } catch (err) { next(err) }
}
