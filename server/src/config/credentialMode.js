// Student/teacher initial-credential resolution (Phase 2 Part 2 §1–§2, and
// the Phase 2 meeting addendum §1 "Academy unified password policy").
//
// Three supported modes:
//   - 'auto'            — the existing secure random-generation system
//                          (utils/tempPassword.js), unchanged. Always forces
//                          a password change on first login — not
//                          configurable, preserving today's behavior.
//   - 'manual'           — an administrator-typed initial password, validated
//                          by config/passwordPolicy.js, hashed through the
//                          existing User model pre-save hook exactly like
//                          every other password (bcrypt, cost 12) — never
//                          stored or logged in plaintext.
//   - 'academy_default'  — the protected, role-specific default password an
//                          authorized administrator configured via
//                          services/credentialDefaults.service.js. The
//                          plaintext is resolved server-side ONLY — the
//                          frontend sends nothing but the mode. Hashed
//                          through the exact same User pre-save hook as every
//                          other password, so accounts sharing this default
//                          never share one identical password *hash*.
//
// `requirePasswordChange` controls User.mustChangePassword independently of
// which mode produced the credential: an admin can require a change even for
// a password they typed (or the shared academy default), or (deliberately)
// waive it. Per the meeting addendum, the recommended default now differs by
// mode:
//   - academy_default / manual → default FALSE (an admin explicitly opts in)
//   - auto                     → default TRUE, always, not configurable —
//                                 preserving the pre-existing behavior exactly.
const { generateTempPassword } = require('../utils/tempPassword')
const { validateManualCredential } = require('./passwordPolicy')
const credentialDefaultsService = require('../services/credentialDefaults.service')

class CredentialError extends Error {
  constructor(message, status = 400, field) {
    super(message)
    this.status = status
    this.field = field
  }
}

/**
 * Resolves a raw wizard/API `credential` input into what the caller needs to
 * write to the database. Never returns the plaintext password unless the
 * mode is 'auto' (needed once, to show the admin a one-time credential) —
 * a 'manual'/'academy_default' password is resolved only long enough for the
 * caller to pass it into `User.create()`; it must never be echoed back in
 * any API response, log line, or audit entry.
 *
 * @param {object} credential { mode: 'auto'|'manual'|'academy_default', password, passwordConfirm, requirePasswordChange }
 * @param {string} fieldPrefix used to scope validation error `.field` (e.g. `students.0.credential`)
 * @param {{ role: 'student'|'teacher' }} opts role is REQUIRED for 'academy_default' (irrelevant otherwise)
 * @returns {Promise<{ passwordToStore: string, mustChangePassword: boolean, mode: string, temporaryPasswordToReturn: string|undefined }>}
 */
async function resolveCredential(credential, fieldPrefix = 'credential', opts = {}) {
  const mode = ['manual', 'academy_default'].includes(credential?.mode) ? credential.mode : 'auto'

  if (mode === 'academy_default') {
    if (!opts.role) throw new CredentialError('لا يمكن استخدام كلمة المرور الافتراضية للأكاديمية بدون تحديد دور الحساب', 500, fieldPrefix)
    // Throws credentialDefaults.service's CredentialDefaultsError (which
    // already carries a user-facing Arabic message + .status) if no default
    // is configured for this role, or if decryption fails — both surface to
    // the caller as a normal 4xx/5xx exactly like a CredentialError would.
    const plaintext = await credentialDefaultsService.resolveDefaultPassword(opts.role)
    const requireChange = credential.requirePasswordChange === true // default false
    return {
      passwordToStore: plaintext,
      mustChangePassword: requireChange,
      mode: 'academy_default',
      temporaryPasswordToReturn: undefined,
    }
  }

  if (mode === 'manual') {
    const error = validateManualCredential({
      password: credential.password,
      passwordConfirm: credential.passwordConfirm,
    })
    if (error) throw new CredentialError(error, 400, fieldPrefix)
    const requireChange = credential.requirePasswordChange === true // default false (changed from true — meeting addendum §1)
    return {
      passwordToStore: credential.password,
      mustChangePassword: requireChange,
      mode: 'manual',
      temporaryPasswordToReturn: undefined,
    }
  }

  // Automatic mode — unchanged existing behavior, always forces a change.
  const generated = generateTempPassword()
  return {
    passwordToStore: generated,
    mustChangePassword: true,
    mode: 'auto',
    temporaryPasswordToReturn: generated,
  }
}

/**
 * Backward-compatible entry point: accepts either the new `credential`
 * object OR the legacy flat `password` string that Part 1's onboarding
 * endpoints already shipped with (which always implied "admin-typed,
 * no forced change" — `mustChangePassword: !password`). Existing callers
 * that only ever sent a flat `password` keep their exact prior behavior;
 * new callers should send `credential` going forward.
 *
 * `role` ('student'|'teacher') is required whenever the caller MIGHT resolve
 * to 'academy_default' — every real call site knows its own role statically.
 */
async function resolveCredentialInput(input, fieldPrefix = 'credential', role) {
  if (input?.credential && typeof input.credential === 'object') {
    return resolveCredential(input.credential, fieldPrefix, { role })
  }
  if (input?.password) {
    return resolveCredential(
      { mode: 'manual', password: input.password, passwordConfirm: input.password, requirePasswordChange: false },
      fieldPrefix,
      { role }
    )
  }
  return resolveCredential({ mode: 'auto' }, fieldPrefix, { role })
}

module.exports = { resolveCredential, resolveCredentialInput, CredentialError }
