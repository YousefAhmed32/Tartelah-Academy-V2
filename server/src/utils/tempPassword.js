const crypto = require('crypto')

/**
 * Generates a random temporary password, 12 chars, guaranteed at least one
 * upper/lower/digit/symbol so it always clears typical password-strength
 * validation on first login. Extracted from user.controller.js so every
 * account-creation path (Team Management, admin-created teacher/student
 * accounts) shares the exact same generation logic instead of a
 * re-implemented, easy-to-drift copy.
 */
function generateTempPassword() {
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

module.exports = { generateTempPassword }
