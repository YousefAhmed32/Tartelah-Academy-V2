// Student/teacher initial-credential resolution (Phase 2 Part 2 §1–§2).
//
// Exactly two supported modes — there is NO academy-wide/shared default
// password, per explicit scope decision:
//   - 'auto'   — the existing secure random-generation system
//                (utils/tempPassword.js), unchanged.
//   - 'manual' — an administrator-typed initial password, validated by
//                config/passwordPolicy.js, hashed through the existing
//                User model pre-save hook exactly like every other password
//                (bcrypt, cost 12) — never stored or logged in plaintext.
//
// `requirePasswordChange` controls User.mustChangePassword independently of
// which mode produced the credential: an admin can require a change even for
// a password they typed themselves, or (deliberately, when they are certain)
// waive it. The auto mode's temporary password ALWAYS forces a change,
// preserving today's existing behavior unconditionally — this is not
// configurable, matching the brief's "preserve the current temporary-password
// behavior" requirement.
const { generateTempPassword } = require('../utils/tempPassword')
const { validateManualCredential } = require('./passwordPolicy')

class CredentialError extends Error {
  constructor(message, field) {
    super(message)
    this.status = 400
    this.field = field
  }
}

/**
 * Resolves a raw wizard/API `credential` input into what the caller needs to
 * write to the database. Never returns the plaintext password unless the
 * mode is 'auto' (needed once, to show the admin a one-time credential) —
 * a 'manual' password is validated and handed back only long enough for the
 * caller to pass it into `User.create()`; it must never be echoed back in
 * any API response, log line, or audit entry.
 *
 * @param {object} credential { mode: 'auto'|'manual', password, passwordConfirm, requirePasswordChange }
 * @param {string} fieldPrefix used to scope validation error `.field` (e.g. `students.0.credential`)
 * @returns {{ passwordToStore: string, mustChangePassword: boolean, mode: 'auto'|'manual', temporaryPasswordToReturn: string|undefined }}
 */
function resolveCredential(credential, fieldPrefix = 'credential') {
  const mode = credential?.mode === 'manual' ? 'manual' : 'auto'

  if (mode === 'manual') {
    const error = validateManualCredential({
      password: credential.password,
      passwordConfirm: credential.passwordConfirm,
    })
    if (error) throw new CredentialError(error, fieldPrefix)
    const requireChange = credential.requirePasswordChange !== false // default true, per the brief's recommended default
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
 */
function resolveCredentialInput(input, fieldPrefix = 'credential') {
  if (input?.credential && typeof input.credential === 'object') {
    return resolveCredential(input.credential, fieldPrefix)
  }
  if (input?.password) {
    return resolveCredential(
      { mode: 'manual', password: input.password, passwordConfirm: input.password, requirePasswordChange: false },
      fieldPrefix
    )
  }
  return resolveCredential({ mode: 'auto' }, fieldPrefix)
}

module.exports = { resolveCredential, resolveCredentialInput, CredentialError }
