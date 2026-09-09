const crypto = require('crypto')

// Authenticated encryption (AES-256-GCM) for the academy default passwords
// (Phase 2 meeting addendum §1). A dedicated deployment secret —
// CREDENTIAL_DEFAULTS_KEY — is required, deliberately separate from
// JWT_ACCESS_SECRET/JWT_REFRESH_SECRET: rotating/leaking a JWT secret must
// never also expose (or invalidate) the stored default passwords, and vice
// versa. Must decode to exactly 32 bytes (base64 or hex accepted).
//
// This is NOT how per-user passwords are protected — those are always
// bcrypt-hashed one-way through User's pre-save hook and never touch this
// module. This module exists only because a shared default password must be
// *recoverable* (to be handed to bcrypt at the moment a new account is
// created), which a one-way hash cannot support.

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

class CredentialDefaultsCryptoError extends Error {
  constructor(message) {
    super(message)
    this.status = 503
  }
}

function loadKey() {
  const raw = process.env.CREDENTIAL_DEFAULTS_KEY
  if (!raw) {
    throw new CredentialDefaultsCryptoError(
      'لم يتم إعداد مفتاح تشفير كلمات المرور الافتراضية للأكاديمية على الخادم (CREDENTIAL_DEFAULTS_KEY)'
    )
  }
  let key
  // Accept base64 (preferred) or hex — whichever decodes to exactly 32 bytes.
  const b64 = Buffer.from(raw, 'base64')
  const hex = /^[0-9a-fA-F]+$/.test(raw) ? Buffer.from(raw, 'hex') : null
  if (b64.length === KEY_LENGTH) key = b64
  else if (hex && hex.length === KEY_LENGTH) key = hex
  else {
    throw new CredentialDefaultsCryptoError(
      'مفتاح تشفير كلمات المرور الافتراضية (CREDENTIAL_DEFAULTS_KEY) غير صالح — يجب أن يكون 32 بايت (base64 أو hex)'
    )
  }
  return key
}

/** Encrypts plaintext -> base64("<iv><authTag><ciphertext>"). */
function encryptSecret(plaintext) {
  if (typeof plaintext !== 'string' || !plaintext) {
    throw new CredentialDefaultsCryptoError('لا يوجد نص لتشفيره')
  }
  const key = loadKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64')
}

/** Decrypts a blob produced by encryptSecret(). Throws on tamper/wrong key. */
function decryptSecret(blob) {
  if (typeof blob !== 'string' || !blob) {
    throw new CredentialDefaultsCryptoError('لا توجد بيانات مشفّرة لفك تشفيرها')
  }
  const key = loadKey()
  const buf = Buffer.from(blob, 'base64')
  if (buf.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new CredentialDefaultsCryptoError('البيانات المشفّرة تالفة')
  }
  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)
  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plaintext.toString('utf8')
  } catch {
    // Never leak crypto internals — this is either a tampered blob or the
    // deployment secret was rotated without re-encrypting stored values.
    throw new CredentialDefaultsCryptoError('تعذّر فك تشفير كلمة المرور الافتراضية — قد يكون مفتاح التشفير تغيّر')
  }
}

/** Whether the deployment secret is configured at all, without throwing. */
function isCryptoConfigured() {
  try {
    loadKey()
    return true
  } catch {
    return false
  }
}

module.exports = { encryptSecret, decryptSecret, isCryptoConfigured, CredentialDefaultsCryptoError }
