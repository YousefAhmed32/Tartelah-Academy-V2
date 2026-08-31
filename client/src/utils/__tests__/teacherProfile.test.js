// Dynamic teaching-subject catalog — subjectLabel() resolves a key's label
// from the live catalog list (as fetched by useTeachingSubjects()), falling
// back to the static legacy map only when the catalog doesn't have it yet
// (e.g. still loading). See client/src/hooks/useTeachingSubjects.js and
// server/src/services/teachingSubject.service.js for the backend twin.
import { describe, test, expect } from 'vitest'
import { subjectLabel, teacherCategoryLabel } from '../teacherProfile.js'

describe('subjectLabel', () => {
  const subjects = [
    { key: 'tajweed', nameAr: 'التجويد' },
    { key: 'sub_abc123', nameAr: 'الرياضيات', nameEn: 'Mathematics' },
  ]

  test('resolves a dynamic (non-legacy) subject from the live catalog list', () => {
    expect(subjectLabel(subjects, 'sub_abc123')).toBe('الرياضيات')
  })

  test('resolves a legacy key from the live catalog list too (not the static fallback)', () => {
    expect(subjectLabel(subjects, 'tajweed')).toBe('التجويد')
  })

  test('falls back to the static legacy map when the catalog list is empty (still loading)', () => {
    expect(subjectLabel([], 'hifz')).toBe('الحفظ')
  })

  test('falls back to the static legacy map when the catalog list does not (yet) contain the key', () => {
    expect(subjectLabel([{ key: 'tajweed', nameAr: 'التجويد' }], 'quran')).toBe('القرآن')
  })

  test('returns null for an empty/missing value, never a placeholder string', () => {
    expect(subjectLabel(subjects, '')).toBe(null)
    expect(subjectLabel(subjects, undefined)).toBe(null)
  })

  test('returns null for a genuinely unknown key with no catalog or legacy match', () => {
    expect(subjectLabel(subjects, 'not_a_real_key')).toBe(null)
  })
})

describe('teacherCategoryLabel (legacy-only fallback)', () => {
  test('still resolves the six canonical keys for call sites with no live catalog access', () => {
    expect(teacherCategoryLabel('tajweed')).toBe('التجويد')
    expect(teacherCategoryLabel('other')).toBe('أخرى')
  })
})
