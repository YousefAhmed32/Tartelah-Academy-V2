// Curated, project-owner-managed AI knowledge source — for operational facts
// (e.g. private-lesson pricing) that aren't represented in any MongoDB schema
// yet. The file ships empty; the owner adds entries later and they become
// active automatically (mtime-based cache, no restart required). This is a
// grounding SOURCE, not authority: live MongoDB data (courses/teachers/
// packages) always wins for anything it actually models — this file only
// fills gaps MongoDB doesn't cover.
const fs = require('fs')
const path = require('path')
const Joi = require('joi')
const { normalizeArabic } = require('../utils/arabicNormalize')

const FILE_PATH = path.join(__dirname, '../../data/ai-knowledge.json')

const entrySchema = Joi.object({
  id: Joi.string().trim().min(1).max(100).required(),
  category: Joi.string().trim().max(50).default('general'),
  questionPatterns: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  titleAr: Joi.string().trim().max(200).allow(''),
  answerAr: Joi.string().trim().min(1).required(),
  facts: Joi.object().unknown(true).default({}),
  active: Joi.boolean().default(true),
  priority: Joi.number().default(0),
  updatedAt: Joi.alternatives().try(Joi.date(), Joi.valid(null)).default(null),
}).unknown(false)

const fileSchema = Joi.object({
  version: Joi.number().default(1),
  updatedAt: Joi.alternatives().try(Joi.date(), Joi.valid(null)).default(null),
  entries: Joi.array().items(Joi.object().unknown(true)).default([]),
})

let cache = { mtimeMs: 0, entries: [], loadedAt: null, fileUpdatedAt: null, invalidCount: 0 }

function load() {
  let stat
  try {
    stat = fs.statSync(FILE_PATH)
  } catch (_) {
    return { entries: [], fileUpdatedAt: null, invalidCount: 0 }
  }

  if (stat.mtimeMs === cache.mtimeMs) return cache

  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    const { value: fileValue, error: fileError } = fileSchema.validate(parsed)
    if (fileError) {
      console.warn('[AI Knowledge] Invalid file structure, ignoring file:', fileError.message)
      cache = { mtimeMs: stat.mtimeMs, entries: [], loadedAt: new Date(), fileUpdatedAt: null, invalidCount: 0 }
      return cache
    }

    const seenIds = new Set()
    let invalidCount = 0
    const entries = []
    for (const rawEntry of fileValue.entries) {
      const { value, error } = entrySchema.validate(rawEntry)
      if (error) { invalidCount++; continue }
      if (seenIds.has(value.id)) { invalidCount++; continue }
      if (!value.active) continue
      seenIds.add(value.id)
      entries.push({
        ...value,
        _normalizedPatterns: value.questionPatterns.map(normalizeArabic),
      })
    }
    entries.sort((a, b) => b.priority - a.priority)

    if (invalidCount > 0) {
      console.warn(`[AI Knowledge] Skipped ${invalidCount} invalid/duplicate entr${invalidCount === 1 ? 'y' : 'ies'} in ai-knowledge.json`)
    }

    cache = { mtimeMs: stat.mtimeMs, entries, loadedAt: new Date(), fileUpdatedAt: fileValue.updatedAt, invalidCount }
    return cache
  } catch (err) {
    console.warn('[AI Knowledge] Failed to load/parse ai-knowledge.json, keeping previous cache:', err.message)
    return cache
  }
}

// Simple keyword-overlap match — the file is small and curated, so this
// stays deliberately simple rather than pulling in a scoring/vector library.
function searchKnowledge(query, limit = 3) {
  const { entries } = load()
  if (!entries.length) return []
  const nq = normalizeArabic(query)
  if (!nq) return []

  const scored = entries
    .map(entry => {
      const hit = entry._normalizedPatterns.some(p => nq.includes(p) || p.includes(nq))
      return hit ? entry : null
    })
    .filter(Boolean)

  return scored.slice(0, limit).map(({ _normalizedPatterns, ...safe }) => safe)
}

function getKnowledgeStatus() {
  const { entries, loadedAt, fileUpdatedAt, invalidCount } = load()
  return {
    activeEntries: entries.length,
    loadedAt,
    fileUpdatedAt,
    invalidCount,
  }
}

module.exports = { searchKnowledge, getKnowledgeStatus }
