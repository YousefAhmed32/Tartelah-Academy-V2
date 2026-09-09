// Academy-wide default password management for new student/teacher accounts
// (Phase 2 meeting addendum §1). Single chokepoint — config/credentialMode.js
// calls resolveDefaultPassword() at account-creation time; the admin settings
// controller calls getStatus()/setDefault() for the management screen.
const CredentialDefaults = require('../models/CredentialDefaults')
const { encryptSecret, decryptSecret, CredentialDefaultsCryptoError } = require('../utils/credentialDefaultsCipher')
const { validatePassword } = require('../config/passwordPolicy')

const ROLES = ['student', 'teacher']

class CredentialDefaultsError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

function assertValidRole(role) {
  if (!ROLES.includes(role)) throw new CredentialDefaultsError('الدور يجب أن يكون طالب أو معلم', 400, 'role')
}

async function getSingleton() {
  let doc = await CredentialDefaults.findById('global')
  if (!doc) doc = await CredentialDefaults.create({ _id: 'global' })
  return doc
}

/**
 * Status only — never the secret. Shown on the admin settings screen.
 * { student: { configured, updatedAt, updatedBy }, teacher: { ... } }
 */
async function getStatus() {
  const doc = await getSingleton()
  return ROLES.reduce((acc, role) => {
    const sub = doc[role] || {}
    acc[role] = {
      configured: !!sub.configured,
      updatedAt: sub.updatedAt || null,
      updatedBy: sub.updatedBy || null,
    }
    return acc
  }, {})
}

/**
 * Replaces the configured default password for one role. Validated with the
 * same (or stronger) policy as any administrator-typed password — a weak or
 * numeric-only example is rejected here exactly like the manual-credential
 * flow. Applies to accounts created AFTER this call only; never touches any
 * already-created user.
 */
async function setDefault(role, { password, passwordConfirm }, { actorId } = {}) {
  assertValidRole(role)
  const policyError = validatePassword(password)
  if (policyError) throw new CredentialDefaultsError(policyError, 400, 'password')
  if (passwordConfirm !== undefined && passwordConfirm !== password) {
    throw new CredentialDefaultsError('كلمتا المرور غير متطابقتين', 400, 'passwordConfirm')
  }

  let secretBlob
  try {
    secretBlob = encryptSecret(password)
  } catch (err) {
    if (err instanceof CredentialDefaultsCryptoError) throw new CredentialDefaultsError(err.message, err.status)
    throw err
  }

  const updated = await CredentialDefaults.findByIdAndUpdate(
    'global',
    {
      $set: {
        [`${role}.configured`]: true,
        [`${role}.secretBlob`]: secretBlob,
        [`${role}.updatedBy`]: actorId,
        [`${role}.updatedAt`]: new Date(),
      },
    },
    { new: true, upsert: true }
  )
  const sub = updated[role]
  return { role, configured: true, updatedAt: sub.updatedAt, updatedBy: sub.updatedBy }
}

/**
 * Clears a configured default (mode becomes unavailable for new accounts of
 * that role again) without exposing what it was.
 */
async function clearDefault(role, { actorId } = {}) {
  assertValidRole(role)
  const updated = await CredentialDefaults.findByIdAndUpdate(
    'global',
    {
      $set: { [`${role}.configured`]: false, [`${role}.updatedBy`]: actorId, [`${role}.updatedAt`]: new Date() },
      $unset: { [`${role}.secretBlob`]: '' },
    },
    { new: true, upsert: true }
  )
  const sub = updated[role]
  return { role, configured: false, updatedAt: sub.updatedAt, updatedBy: sub.updatedBy }
}

/**
 * INTERNAL ONLY — decrypts and returns the plaintext default password for a
 * role. Called exclusively by config/credentialMode.js at the moment a new
 * user's password needs to be resolved and handed to User.create() (which
 * bcrypt-hashes it like every other password). Never cache, log, or return
 * this value to any HTTP response.
 */
async function resolveDefaultPassword(role) {
  assertValidRole(role)
  const doc = await CredentialDefaults.findById('global').select(`+${role}.secretBlob`)
  const sub = doc?.[role]
  if (!sub?.configured || !sub?.secretBlob) {
    throw new CredentialDefaultsError(
      role === 'student'
        ? 'لم يتم إعداد كلمة مرور افتراضية للطلاب بعد — يرجى استخدام وضع آخر أو إعدادها من إعدادات الأكاديمية'
        : 'لم يتم إعداد كلمة مرور افتراضية للمعلمين بعد — يرجى استخدام وضع آخر أو إعدادها من إعدادات الأكاديمية',
      409,
      'credential.mode'
    )
  }
  try {
    return decryptSecret(sub.secretBlob)
  } catch (err) {
    if (err instanceof CredentialDefaultsCryptoError) throw new CredentialDefaultsError(err.message, err.status)
    throw err
  }
}

module.exports = { getStatus, setDefault, clearDefault, resolveDefaultPassword, CredentialDefaultsError, ROLES }
