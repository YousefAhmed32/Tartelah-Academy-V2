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
  avatar: { type: String },
  bioAr: { type: String },
  specialization: { type: String },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  meetingLinks: [{
    provider: { type: String, enum: ['zoom', 'meet', 'teams', 'other', 'custom'] },
    label: { type: String },
    link: { type: String },
  }],
  refreshToken: { type: String, select: false },
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
