// Stable color resolution for teaching-subject badges (course cards, filter
// pills) on AdminCoursesPage and the marketing CoursesPage. Closes the
// documented Phase 1 limitation: those two pages used to key their badge
// colors off a frozen 6-entry map (the legacy TEACHING_CATEGORIES), so any
// admin-created subject from the dynamic catalog (see
// server/src/services/teachingSubject.service.js, hooks/useTeachingSubjects.js)
// fell back to the same flat gray "other" style regardless of which subject
// it actually was.
//
// Design:
//  - The six original canonical keys keep their exact existing, hand-picked
//    colors — no visual change for any course/teacher already using them.
//  - Every other key (a dynamically created subject) gets one color
//    deterministically hashed from a small, fixed, contrast-checked
//    palette — the same key always resolves to the same slot, so a given
//    subject's badge never changes color between renders/reloads, and no
//    color is ever randomly generated.
//  - An archived subject's key still hashes to the same slot it always
//    had — archived/historical records keep rendering correctly even once
//    the subject no longer appears in an *active-only* subjects list.

const CANONICAL_COLORS = {
  tajweed: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  hifz: { color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  nazra: { color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  arabic: { color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  quran: { color: '#b45309', bg: 'rgba(180,83,9,0.1)' },
  other: { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
}

// Hues deliberately distinct from every canonical color above (no purple,
// green, blue, amber/brown, or slate) and from each other, each with a solid
// ~4.5:1+ contrast ratio as solid text on white — the same styling pattern
// (full-saturation text over a ~10%-opacity tint) already used for the
// canonical set.
const DYNAMIC_PALETTE = [
  { color: '#0f766e', bg: 'rgba(15,118,110,0.1)' }, // teal
  { color: '#be123c', bg: 'rgba(190,18,60,0.1)' }, // rose
  { color: '#4338ca', bg: 'rgba(67,56,202,0.1)' }, // indigo
  { color: '#c2410c', bg: 'rgba(194,65,12,0.1)' }, // burnt orange
  { color: '#a21caf', bg: 'rgba(162,28,175,0.1)' }, // fuchsia
  { color: '#0369a1', bg: 'rgba(3,105,161,0.1)' }, // sky
]

// Small deterministic string hash (FNV-1a-style) — pure function of the key,
// never Math.random(), so the mapping is stable across renders, reloads,
// and even browser sessions.
function hashKey(key) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Returns { color, bg } for a teaching-subject key. Never returns undefined —
 * an empty/unknown key falls back to the same neutral style as `other`.
 */
export function resolveSubjectColor(key) {
  if (!key) return CANONICAL_COLORS.other
  if (CANONICAL_COLORS[key]) return CANONICAL_COLORS[key]
  return DYNAMIC_PALETTE[hashKey(key) % DYNAMIC_PALETTE.length]
}

export function isCanonicalSubjectKey(key) {
  return !!CANONICAL_COLORS[key]
}
