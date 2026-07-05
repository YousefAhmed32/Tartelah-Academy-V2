const { classifyTeacherGender, auditTeacherGender } = require('../migrateTeacherGender')

describe('classifyTeacherGender', () => {
  test('valid male / female pass through unchanged', () => {
    expect(classifyTeacherGender({ gender: 'male' })).toEqual({ bucket: 'male', normalizedTo: undefined })
    expect(classifyTeacherGender({ gender: 'female' })).toEqual({ bucket: 'female', normalizedTo: undefined })
  })

  test('missing/empty gender is unresolved, not defaulted to male', () => {
    expect(classifyTeacherGender({ gender: undefined }).bucket).toBe('unresolved')
    expect(classifyTeacherGender({ gender: null }).bucket).toBe('unresolved')
    expect(classifyTeacherGender({ gender: '' }).bucket).toBe('unresolved')
    expect(classifyTeacherGender({})).toEqual({ bucket: 'unresolved', normalizedTo: undefined })
  })

  test('an invalid stored value is flagged invalid and normalized to null, never coerced to a guessed gender', () => {
    const result = classifyTeacherGender({ gender: 'Male' })
    expect(result.bucket).toBe('invalid')
    expect(result.normalizedTo).toBeNull()
  })
})

describe('auditTeacherGender', () => {
  const sample = [
    { _id: '1', gender: 'male' },
    { _id: '2', gender: 'female' },
    { _id: '3', gender: 'male' },
    { _id: '4' }, // legacy, unresolved
    { _id: '5', gender: 'unknown' }, // corrupt/invalid
  ]

  test('produces an accurate summary count per bucket', async () => {
    const { summary } = await auditTeacherGender(sample)
    expect(summary).toEqual({ total: 5, male: 2, female: 1, unresolved: 1, invalid: 1 })
  })

  test('never writes — it only classifies; running it twice on the same input is a no-op (dry-run safe)', async () => {
    const first = await auditTeacherGender(sample)
    const second = await auditTeacherGender(sample)
    expect(second).toEqual(first)
  })

  test('lists unresolved teacher ids for admin correction, and invalid records with their raw stored value', async () => {
    const { unresolvedIds, invalidRecords } = await auditTeacherGender(sample)
    expect(unresolvedIds).toEqual(['4'])
    expect(invalidRecords).toEqual([{ id: '5', storedValue: 'unknown' }])
  })

  test('idempotent end-to-end: applying the proposed normalization then re-auditing yields zero further invalid records', async () => {
    const { normalizations } = await auditTeacherGender(sample)
    const normalizedIds = new Set(normalizations.map(n => n.id))
    const afterApply = sample.map(t => (normalizedIds.has(t._id) ? { ...t, gender: null } : t))
    const { summary: after } = await auditTeacherGender(afterApply)
    expect(after.invalid).toBe(0)
    // The previously-invalid record now counts as unresolved rather than disappearing.
    expect(after.unresolved).toBe(2)
  })
})
