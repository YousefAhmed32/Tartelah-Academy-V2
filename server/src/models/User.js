const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  firstNameAr: { type: String, required: true, trim: true },
  lastNameAr: { type: String, required: true, trim: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false, minlength: 8 },
  role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'student' },
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

UserSchema.methods.toPublic = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.refreshToken
  delete obj.passwordResetToken
  delete obj.passwordResetExpires
  return obj
}

module.exports = mongoose.model('User', UserSchema)
