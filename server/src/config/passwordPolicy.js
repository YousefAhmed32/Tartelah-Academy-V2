// Centralized password-strength policy for administrator-defined initial
// passwords (Phase 2 Part 2 §1 Mode B). The pre-existing automatic
// credential-generation path (utils/tempPassword.js) already guarantees a
// strong random value and is untouched by this file — this policy exists
// only to validate a password a human administrator types in by hand.
//
// Deliberately conservative (matches the schema's existing `minlength: 8`
// convention rather than inventing a much stricter policy this codebase
// never asked for elsewhere): at least 8 characters, at least one letter and
// one digit. Pure function — no DB access — reusable by controllers/services
// and unit tests alike.

const MIN_LENGTH = 8

function validatePassword(password) {
  if (typeof password !== 'string' || !password) return 'كلمة المرور مطلوبة'
  if (password.length < MIN_LENGTH) return `كلمة المرور يجب أن تكون ${MIN_LENGTH} أحرف على الأقل`
  if (password.length > 128) return 'كلمة المرور طويلة جدًا'
  if (!/[A-Za-z]/.test(password)) return 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل'
  if (!/[0-9]/.test(password)) return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'
  return null
}

/**
 * Validates an administrator-defined credential payload
 * ({ password, passwordConfirm }). Returns the first Arabic error message, or
 * null if valid. Confirmation mismatch and weak passwords are both rejected
 * here so every caller (onboarding wizard, add-student, standalone student
 * creation) enforces the exact same rule instead of a re-implemented copy.
 */
function validateManualCredential({ password, passwordConfirm }) {
  const err = validatePassword(password)
  if (err) return err
  // passwordConfirm is optional at the API boundary (the frontend already
  // enforces the match before submit), but if the caller sends it, the
  // backend re-checks it too — defense in depth, never trust the client.
  if (passwordConfirm !== undefined && passwordConfirm !== password) {
    return 'كلمتا المرور غير متطابقتين'
  }
  return null
}

module.exports = { MIN_LENGTH, validatePassword, validateManualCredential }
