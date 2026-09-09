const mongoose = require('mongoose')

// Academy-wide default passwords for NEW student/teacher account creation
// (Phase 2 meeting addendum §1 — "Academy unified password policy").
//
// Deliberately its OWN collection, never a field on AcademySettings: that
// model's GET /website/settings endpoint is PUBLIC and returns the whole
// document (see website.controller.js) — nothing that must never leave the
// server can live there. This collection is only ever read/written through
// services/credentialDefaults.service.js, which is called exclusively from
// authenticated, permission-gated admin routes.
//
// The plaintext password itself is NEVER stored here — only an AES-256-GCM
// ciphertext blob (see utils/credentialDefaultsCipher.js), and every field
// that could leak it defaults to `select: false` so an accidental
// `Model.find()` without an explicit `.select('+secretBlob')` can never
// include it. Nothing here is ever the actual per-user password: at account-
// creation time the plaintext is decrypted in-process, handed to
// `User.create()`, and hashed through the exact same bcrypt pre-save hook
// every other password goes through (see config/credentialMode.js) —
// students/teachers created with the same default password never share one
// identical password *hash*.
const RoleDefaultSchema = new mongoose.Schema({
  configured: { type: Boolean, default: false },
  // AES-256-GCM: base64("<iv(12b)><authTag(16b)><ciphertext>"). Only ever
  // populated when configured=true.
  secretBlob: { type: String, select: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date },
}, { _id: false })

const CredentialDefaultsSchema = new mongoose.Schema({
  // Explicit string _id (unlike AcademySettings, which relies on an
  // empty-filter singleton) — services/credentialDefaults.service.js
  // addresses this document directly via findById('global')/
  // findByIdAndUpdate('global', ...), so the id must be pinned, not an
  // auto-generated ObjectId.
  _id: { type: String, default: 'global' },
  student: { type: RoleDefaultSchema, default: () => ({}) },
  teacher: { type: RoleDefaultSchema, default: () => ({}) },
}, { timestamps: true })

module.exports = mongoose.model('CredentialDefaults', CredentialDefaultsSchema)
