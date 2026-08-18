const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { ALL_ROLES, DEFAULT_DISPLAY_NAMES } = require('../config/permissions')
const { TEACHING_CATEGORIES } = require('../config/categories')
const { SHIFT_VALUES } = require('../config/teacherProfile')

const UserSchema = new mongoose.Schema({
  firstNameAr: { type: String, required: true, trim: true },
  lastNameAr: { type: String, required: true, trim: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false, minlength: 8 },
  // The stable internal "systemRole" from the RBAC spec — this field IS
  // that identifier (see config/permissions.js), never renamed. Extended
  // beyond admin/teacher/student with the admin-family roles
  // (assistant_admin/operator/manager/staff) introduced by the RBAC+PBAC
  // upgrade; existing admin/teacher/student accounts are unaffected.
  role: { type: String, enum: ALL_ROLES, default: 'student' },
  // Per-account customizable label shown in the UI instead of the raw role
  // (e.g. "Operations Supervisor" for an assistant_admin). Falls back to
  // DEFAULT_DISPLAY_NAMES[role] in toPublic() below when unset — role stays
  // the stable identifier, this is presentation only.
  displayRoleName: { type: String, trim: true, default: null },
  jobTitle: { type: String, trim: true, default: null },
  roleDescription: { type: String, trim: true, default: null },
  // Fine-grained permission grants (see config/permissions.js ALL_PERMISSIONS).
  // Ignored for isPrimaryAdmin (who implicitly holds every permission) and
  // unused by teacher/student, which keep the original coarse role checks.
  permissions: { type: [String], default: [] },
  // The one, original administrator — set only by the RBAC migration for the
  // pre-existing admin account, never by any API route. Grants every
  // permission implicitly and is protected from deletion/disable/demotion/
  // permission-removal (see middleware/rbac.middleware.js + user.controller.js).
  isPrimaryAdmin: { type: Boolean, default: false },
  mustChangePassword: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastPermissionsChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastPermissionsChangedAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  disabledAt: { type: Date, default: null },
  disabledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String, trim: true, default: null },
  phone: { type: String, trim: true },
  // GridFS file _id (server/src/config/gridfs.js), NOT a path or URL — kept as
  // `avatar` (not renamed to avatarId) deliberately: dozens of existing
  // .select()/.populate(path, '...avatar...') projections across the
  // codebase already name this exact field, and Mongoose ObjectIds
  // serialize to their plain hex string in JSON, which client getFileUrl()
  // already recognizes and turns into `${BACKEND_URL}/api/v1/media/<id>`.
  avatar: { type: mongoose.Schema.Types.ObjectId, default: null },
  bioAr: { type: String },
  specialization: { type: String },
  // Canonical teacher identity (see server/src/config/teacherIdentity.js). Not
  // required/defaulted — legacy teachers with no value are "unresolved" and
  // must be corrected explicitly by an admin or the teacher, never guessed
  // (e.g. from their Arabic name). Only meaningful for role: 'teacher'.
  gender: { type: String, enum: ['male', 'female'] },
  salaryPerSession: { type: Number, default: 0 },
  // Teacher's subject/category specialization ("الفئة") — reuses the same
  // taxonomy as Course.category (config/categories.js) rather than a
  // separate list. Not required/defaulted, same convention as `gender`:
  // legacy teachers with no value are simply uncategorized, never guessed.
  // Only meaningful for role: 'teacher'.
  category: { type: String, enum: TEACHING_CATEGORIES },
  // Hourly teaching rate ("سعر ساعة التدريس") — distinct from
  // salaryPerSession, which is the per-session payroll amount consumed by
  // teacherPerformance.service.js. Only meaningful for role: 'teacher'.
  hourlyRate: { type: Number, default: 0, min: [0, 'سعر ساعة التدريس يجب أن يكون رقمًا موجبًا'] },
  // Structured shift availability ("أوقات الشيفت المتاحة") — an array of
  // enum values rather than a single string/boolean pair so it can safely
  // support more shifts later without a migration. Only meaningful for
  // role: 'teacher'.
  availableShifts: { type: [String], enum: SHIFT_VALUES, default: [] },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  meetingLinks: [{
    provider: { type: String, enum: ['zoom', 'meet', 'teams', 'other', 'custom'] },
    label: { type: String },
    link: { type: String },
  }],
  refreshToken: { type: String, select: false },
  // Bumped on logout / password change / reset so any refresh token issued
  // before that point (still cryptographically valid for up to
  // JWT_REFRESH_EXPIRES) is rejected by /auth/refresh instead of silently
  // continuing to mint new access tokens.
  tokenVersion: { type: Number, default: 0, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
}, { timestamps: true })

UserSchema.index({ role: 1, isActive: 1 })
UserSchema.index({ createdAt: -1 })

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

// Primary Admin implicitly holds every permission — never persisted as a
// giant array, always computed, so ALL_PERMISSIONS growing over time never
// requires a data migration to keep them "fully" permissioned.
UserSchema.methods.hasPermission = function (permission) {
  if (this.isPrimaryAdmin) return true
  return Array.isArray(this.permissions) && this.permissions.includes(permission)
}

UserSchema.methods.toPublic = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.refreshToken
  delete obj.passwordResetToken
  delete obj.passwordResetExpires
  delete obj.tokenVersion
  obj.displayRoleName = obj.displayRoleName || DEFAULT_DISPLAY_NAMES[obj.role] || obj.role
  return obj
}

module.exports = mongoose.model('User', UserSchema)
