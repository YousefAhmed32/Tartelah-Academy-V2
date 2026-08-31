const { ensureSeeded } = require('../services/teachingSubject.service')

// Upserts the six canonical teaching-subject catalog entries
// (tajweed/hifz/nazra/arabic/quran/other) as `isSystem: true` rows in the
// new TeachingSubject collection — additive only (upsert on `key`, never
// overwrites an already-customized nameAr/order on re-run), idempotent, safe
// to re-run on every boot. Mirrors the existing migration pattern in
// server.js (backfillSubscriptionConsumed, rbacUpgrade, ...).
//
// teachingSubject.service.js also calls ensureSeeded() lazily on its own
// first cache load, so this boot-time call is a belt-and-suspenders step —
// it guarantees the catalog is ready before the very first request rather
// than depending on that lazy path alone.
async function seedTeachingSubjects() {
  await ensureSeeded()
  return { seeded: true }
}

module.exports = { seedTeachingSubjects }
