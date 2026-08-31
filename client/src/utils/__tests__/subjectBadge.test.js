// Stable badge-color resolution for dynamic teaching subjects on
// AdminCoursesPage / the marketing CoursesPage — closes the Phase 1 report's
// "static 3-color subject badge map" limitation. See ../subjectBadge.js.
import { describe, test, expect } from 'vitest'
import { resolveSubjectColor, isCanonicalSubjectKey } from '../subjectBadge.js'

describe('resolveSubjectColor', () => {
  test('the six canonical legacy keys keep their exact original colors', () => {
    expect(resolveSubjectColor('tajweed')).toEqual({ color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' })
    expect(resolveSubjectColor('hifz')).toEqual({ color: '#059669', bg: 'rgba(5,150,105,0.1)' })
    expect(resolveSubjectColor('nazra')).toEqual({ color: '#2563eb', bg: 'rgba(37,99,235,0.1)' })
    expect(resolveSubjectColor('arabic')).toEqual({ color: '#d97706', bg: 'rgba(217,119,6,0.1)' })
    expect(resolveSubjectColor('quran')).toEqual({ color: '#b45309', bg: 'rgba(180,83,9,0.1)' })
    expect(resolveSubjectColor('other')).toEqual({ color: '#64748b', bg: 'rgba(100,116,139,0.1)' })
  })

  test('a dynamic (admin-created) subject key never falls back to the generic "other" gray', () => {
    const result = resolveSubjectColor('sub_abc123')
    expect(result.color).not.toBe('#64748b')
  })

  test('the same dynamic key always resolves to the same color (deterministic, not random)', () => {
    const a = resolveSubjectColor('sub_math_2026')
    const b = resolveSubjectColor('sub_math_2026')
    const c = resolveSubjectColor('sub_math_2026')
    expect(a).toEqual(b)
    expect(b).toEqual(c)
  })

  test('two different dynamic subjects can resolve to different colors', () => {
    const keys = ['sub_math', 'sub_science', 'sub_english', 'sub_art', 'sub_history', 'sub_geography', 'sub_pe']
    const colors = new Set(keys.map((k) => resolveSubjectColor(k).color))
    // A bounded 6-slot palette means some collisions across 7 keys are
    // expected — the point is it isn't a single flat color for all of them.
    expect(colors.size).toBeGreaterThan(1)
  })

  test('every dynamic-palette color is visually distinct from every canonical color', () => {
    const canonicalColors = ['tajweed', 'hifz', 'nazra', 'arabic', 'quran', 'other'].map((k) => resolveSubjectColor(k).color)
    // Sample a spread of dynamic keys and confirm none collide with a canonical color.
    const dynamicKeys = Array.from({ length: 30 }, (_, i) => `sub_${i}`)
    for (const key of dynamicKeys) {
      expect(canonicalColors).not.toContain(resolveSubjectColor(key).color)
    }
  })

  test('an empty/undefined key falls back to the neutral "other" style rather than throwing', () => {
    expect(resolveSubjectColor(undefined)).toEqual({ color: '#64748b', bg: 'rgba(100,116,139,0.1)' })
    expect(resolveSubjectColor('')).toEqual({ color: '#64748b', bg: 'rgba(100,116,139,0.1)' })
  })

  test('an archived subject key resolves the same color it always had (same key, same slot)', () => {
    // Archiving only flips isActive server-side — the key itself is
    // unchanged, so its color must not change either.
    const beforeArchive = resolveSubjectColor('sub_archived_subject')
    const afterArchive = resolveSubjectColor('sub_archived_subject')
    expect(beforeArchive).toEqual(afterArchive)
  })
})

describe('isCanonicalSubjectKey', () => {
  test('true for the six legacy keys, false for anything else', () => {
    expect(isCanonicalSubjectKey('tajweed')).toBe(true)
    expect(isCanonicalSubjectKey('other')).toBe(true)
    expect(isCanonicalSubjectKey('sub_abc123')).toBe(false)
    expect(isCanonicalSubjectKey(undefined)).toBe(false)
  })
})
