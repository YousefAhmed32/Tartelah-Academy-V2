const { logAction } = require('../services/audit.service')

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول إلى هذا المورد' })
    }
    next()
  }
}

const isAdmin = authorize('admin')
const isTeacher = authorize('admin', 'teacher')
const isStudent = authorize('student')
const isAdminOrTeacher = authorize('admin', 'teacher')

// Admin-family roles (see config/permissions.js ADMIN_FAMILY_ROLES) — used to
// gate entry into the admin dashboard shell/team-management surface. Unlike
// isAdmin, this does not by itself grant access to any specific admin
// resource; individual routes still require the matching permission.
const ADMIN_FAMILY_ROLES = ['admin', 'assistant_admin', 'operator', 'manager', 'staff']
const hasAdminAccess = authorize(...ADMIN_FAMILY_ROLES)

function userHasPermission(user, permission) {
  if (!user) return false
  if (user.isPrimaryAdmin) return true
  return Array.isArray(user.permissions) && user.permissions.includes(permission)
}

function logDenied(req, required) {
  if (!req.user) return
  logAction({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: 'unauthorized_access_attempt',
    entity: 'Permission',
    meta: { required, path: req.originalUrl, method: req.method },
    ip: req.ip,
  })
}

// Requires the caller to hold every listed permission (Primary Admin always
// passes). Enforced strictly on the backend — this is the actual security
// boundary; frontend Can guards only hide UI, they never gate access alone.
function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'غير مصرح' })
    const ok = permissions.every((p) => userHasPermission(req.user, p))
    if (!ok) {
      logDenied(req, permissions)
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية كافية لتنفيذ هذا الإجراء' })
    }
    next()
  }
}

// Requires at least one of the listed permissions.
function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'غير مصرح' })
    const ok = permissions.some((p) => userHasPermission(req.user, p))
    if (!ok) {
      logDenied(req, permissions)
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية كافية لتنفيذ هذا الإجراء' })
    }
    next()
  }
}

function requirePrimaryAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: 'غير مصرح' })
  if (!req.user.isPrimaryAdmin) {
    logDenied(req, ['isPrimaryAdmin'])
    return res.status(403).json({ success: false, message: 'هذا الإجراء متاح فقط للمسؤول الرئيسي' })
  }
  next()
}

module.exports = {
  authorize, isAdmin, isTeacher, isStudent, isAdminOrTeacher,
  hasAdminAccess, ADMIN_FAMILY_ROLES,
  userHasPermission, requirePermission, requireAnyPermission, requirePrimaryAdmin,
}
