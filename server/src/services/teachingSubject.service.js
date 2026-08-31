// Dynamic teaching-subject/curriculum catalog (replaces the hardcoded
// TEACHING_CATEGORIES allow-list as the authoritative validation source —
// see config/categories.js and models/TeachingSubject.js for the full
// rationale and the deliberate key-scheme decision).
//
// This is the ONLY module that reads/writes the TeachingSubject collection —
// every other consumer (assignment.service.js, onboarding.service.js,
// teacherProfile.js, course.controller.js, admin/teacher public filters, the
// Arabic assignment-message builder) goes through the functions exported
// here, so "unknown/inactive entries cannot be assigned" is enforced in
// exactly one place.
//
// Bounded, small-collection cache: the catalog is expected to hold at most a
// few dozen rows, so the whole collection is cached in-process with a short
// TTL (cheap to hold, avoids a DB round-trip on every single validation
// call) and explicitly invalidated after any write.
const TeachingSubject = require('../models/TeachingSubject')
const { normalizeArabic } = require('../utils/arabicNormalize')
const { TEACHING_CATEGORIES, CURRICULUM_LABELS_AR_FALLBACK } = require('../config/categories')

const CACHE_TTL_MS = 30 * 1000
let cache = { all: [], loadedAt: 0, seeded: false }

function normalizeEnglish(value) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim().toLowerCase()
  return trimmed || null
}

function normalizeArabicName(value) {
  if (!value || typeof value !== 'string') return null
  const normalized = normalizeArabic(value)
  return normalized || null
}

// Idempotent, additive-only — safe to call from every cache reload. Also
// invoked explicitly once at server boot (see migrations/seedTeachingSubjects.js)
// so a fresh deployment never depends on this lazy path alone.
async function ensureSeeded() {
  if (cache.seeded) return
  const labels = {
    tajweed: 'التجويد', hifz: 'الحفظ', nazra: 'النظر',
    arabic: 'اللغة العربية', quran: 'القرآن الكريم', other: 'أخرى',
  }
  for (let i = 0; i < TEACHING_CATEGORIES.length; i++) {
    const key = TEACHING_CATEGORIES[i]
    const nameAr = labels[key] || key
    await TeachingSubject.findOneAndUpdate(
      { key },
      {
        $setOnInsert: {
          key, nameAr, isSystem: true, isActive: true, order: i,
          normalizedNameAr: normalizeArabicName(nameAr),
        },
      },
      { upsert: true, new: true }
    )
  }
  cache.seeded = true
}

async function loadAll({ force = false } = {}) {
  const stale = force || !cache.loadedAt || (Date.now() - cache.loadedAt) > CACHE_TTL_MS
  if (!stale) return cache.all
  await ensureSeeded()
  const docs = await TeachingSubject.find().sort({ order: 1, nameAr: 1 }).lean()
  cache = { all: docs, loadedAt: Date.now(), seeded: true }
  return docs
}

function invalidateCache() {
  cache.loadedAt = 0
}

async function listAll() {
  return loadAll()
}

async function listActive() {
  const all = await loadAll()
  return all.filter((s) => s.isActive)
}

async function getByKey(key) {
  if (!key) return null
  const all = await loadAll()
  return all.find((s) => s.key === key) || null
}

async function isValidActiveKey(key) {
  const subject = await getByKey(key)
  return !!subject && subject.isActive
}

// Used for filters/history — an archived subject must still be a recognized,
// renderable key (existing teachers/assignments/courses that reference it
// must keep working), just not assignable to NEW records.
async function isKnownKey(key) {
  return !!(await getByKey(key))
}

async function resolveLabel(key) {
  const subject = await getByKey(key)
  if (subject) return subject.nameAr
  // Legacy safety net only — every real key should resolve via the catalog
  // once ensureSeeded() has run; this only guards a race on a brand-new,
  // still-uninitialized database.
  return CURRICULUM_LABELS_AR_FALLBACK[key] || key || 'غير محدد'
}

function findDuplicate(all, { normalizedAr, normalizedEn }) {
  return all.find((s) => (
    (normalizedAr && s.normalizedNameAr === normalizedAr) ||
    (normalizedEn && s.normalizedNameEn === normalizedEn)
  ))
}

class TeachingSubjectError extends Error {
  constructor(message, status = 400, extra) {
    super(message)
    this.status = status
    if (extra) Object.assign(this, extra)
  }
}

/**
 * Creates a subject, or — if a normalized-equivalent already exists —
 * returns that existing one instead of creating a duplicate (the "repeated
 * creation attempts should return/select the existing entry" requirement).
 */
async function createSubject({ nameAr, nameEn, actorId }) {
  const trimmedAr = typeof nameAr === 'string' ? nameAr.replace(/\s+/g, ' ').trim() : ''
  if (!trimmedAr) throw new TeachingSubjectError('اسم المنهج بالعربية مطلوب', 400, { field: 'nameAr' })
  const trimmedEn = typeof nameEn === 'string' ? nameEn.replace(/\s+/g, ' ').trim() : ''

  const normalizedAr = normalizeArabicName(trimmedAr)
  const normalizedEn = normalizeEnglish(trimmedEn)

  const all = await loadAll({ force: true })
  const existing = findDuplicate(all, { normalizedAr, normalizedEn })
  if (existing) return { subject: existing, created: false }

  const maxOrder = all.reduce((max, s) => Math.max(max, s.order || 0), 0)
  const doc = await TeachingSubject.create({
    nameAr: trimmedAr, nameEn: trimmedEn || null,
    normalizedNameAr: normalizedAr, normalizedNameEn: normalizedEn,
    isActive: true, isSystem: false, order: maxOrder + 1,
    createdBy: actorId, updatedBy: actorId,
  })
  invalidateCache()
  return { subject: doc.toObject(), created: true }
}

async function updateSubject({ id, nameAr, nameEn, actorId }) {
  const doc = await TeachingSubject.findById(id)
  if (!doc) throw new TeachingSubjectError('المنهج غير موجود', 404)

  if (nameAr !== undefined) {
    const trimmedAr = String(nameAr).replace(/\s+/g, ' ').trim()
    if (!trimmedAr) throw new TeachingSubjectError('اسم المنهج بالعربية مطلوب', 400, { field: 'nameAr' })
    const normalizedAr = normalizeArabicName(trimmedAr)
    const all = await loadAll({ force: true })
    const conflict = all.find((s) => String(s._id) !== String(id) && s.normalizedNameAr === normalizedAr)
    if (conflict) throw new TeachingSubjectError('يوجد منهج آخر بنفس الاسم بالفعل', 409, { field: 'nameAr', existingId: conflict._id })
    doc.nameAr = trimmedAr
    doc.normalizedNameAr = normalizedAr
  }
  if (nameEn !== undefined) {
    const trimmedEn = nameEn ? String(nameEn).replace(/\s+/g, ' ').trim() : ''
    doc.nameEn = trimmedEn || null
    doc.normalizedNameEn = normalizeEnglish(trimmedEn)
  }
  doc.updatedBy = actorId
  await doc.save()
  invalidateCache()
  return doc.toObject()
}

async function setActive({ id, isActive, actorId }) {
  const doc = await TeachingSubject.findById(id)
  if (!doc) throw new TeachingSubjectError('المنهج غير موجود', 404)
  doc.isActive = isActive
  doc.updatedBy = actorId
  await doc.save()
  invalidateCache()
  return doc.toObject()
}

async function reorderSubjects({ orderedIds, actorId }) {
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    throw new TeachingSubjectError('قائمة الترتيب مطلوبة', 400)
  }
  await Promise.all(orderedIds.map((id, index) => (
    TeachingSubject.updateOne({ _id: id }, { order: index, updatedBy: actorId })
  )))
  invalidateCache()
  return listAll()
}

module.exports = {
  TeachingSubjectError,
  ensureSeeded, invalidateCache,
  listAll, listActive, getByKey,
  isValidActiveKey, isKnownKey, resolveLabel,
  createSubject, updateSubject, setActive, reorderSubjects,
}
