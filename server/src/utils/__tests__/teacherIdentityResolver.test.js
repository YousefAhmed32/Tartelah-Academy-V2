const { resolveTeacherIdentity } = require('../teacherIdentityResolver')

describe('resolveTeacherIdentity — male', () => {
  test('male teacher with a valid custom avatar wins over the default', () => {
    const result = resolveTeacherIdentity({ gender: 'male', avatar: '/uploads/avatars/x.jpg' })
    expect(result.avatarKind).toBe('custom')
    expect(result.gender).toBe('male')
  })

  test('male teacher with no avatar resolves to the male default', () => {
    const result = resolveTeacherIdentity({ gender: 'male', avatar: null })
    expect(result.avatarKind).toBe('male-default')
  })

  test('removing a previously-set avatar restores the male default (never the female one)', () => {
    const withPhoto = resolveTeacherIdentity({ gender: 'male', avatar: '/uploads/avatars/x.jpg' })
    expect(withPhoto.avatarKind).toBe('custom')
    const afterRemoval = resolveTeacherIdentity({ gender: 'male', avatar: '' })
    expect(afterRemoval.avatarKind).toBe('male-default')
  })

  test('male honorific is الأستاذ, never الأستاذة', () => {
    const result = resolveTeacherIdentity({ gender: 'male' })
    expect(result.honorificAr).toBe('الأستاذ')
    expect(result.honorificAr).not.toBe('الأستاذة')
  })
})

describe('resolveTeacherIdentity — female', () => {
  test('female teacher with a valid custom avatar wins over the default', () => {
    const result = resolveTeacherIdentity({ gender: 'female', avatar: '/uploads/avatars/y.jpg' })
    expect(result.avatarKind).toBe('custom')
    expect(result.gender).toBe('female')
  })

  test('female teacher with no avatar resolves to the female default', () => {
    const result = resolveTeacherIdentity({ gender: 'female', avatar: null })
    expect(result.avatarKind).toBe('female-default')
  })

  test('removing a previously-set avatar restores the female default (never the male one)', () => {
    const withPhoto = resolveTeacherIdentity({ gender: 'female', avatar: '/uploads/avatars/y.jpg' })
    expect(withPhoto.avatarKind).toBe('custom')
    const afterRemoval = resolveTeacherIdentity({ gender: 'female', avatar: '' })
    expect(afterRemoval.avatarKind).toBe('female-default')
  })

  test('female honorific is الأستاذة — a female teacher must never receive the bare male honorific or "فضيلة الشيخ"', () => {
    const result = resolveTeacherIdentity({ gender: 'female' })
    expect(result.honorificAr).toBe('الأستاذة')
    expect(result.honorificAr).not.toBe('الأستاذ')
    expect(result.honorificAr).not.toContain('فضيلة الشيخ')
  })
})

describe('resolveTeacherIdentity — unresolved legacy data', () => {
  test('no gender + no avatar resolves to the neutral fallback, not a guess', () => {
    const result = resolveTeacherIdentity({ gender: undefined, avatar: null })
    expect(result.isResolved).toBe(false)
    expect(result.avatarKind).toBe('neutral-default')
    expect(result.honorificAr).toBeNull()
  })

  test('no gender but a real uploaded avatar still shows the real photo', () => {
    const result = resolveTeacherIdentity({ gender: null, avatar: '/uploads/avatars/z.jpg' })
    expect(result.avatarKind).toBe('custom')
    expect(result.isResolved).toBe(false)
  })

  test('an invalid/corrupt stored value (e.g. legacy casing) is treated as unresolved, never coerced to male', () => {
    const result = resolveTeacherIdentity({ gender: 'Male' })
    expect(result.isResolved).toBe(false)
    expect(result.gender).toBeNull()
    expect(result.avatarKind).toBe('neutral-default')
  })

  test('missing teacher object does not throw', () => {
    expect(() => resolveTeacherIdentity(undefined)).not.toThrow()
    expect(resolveTeacherIdentity(undefined).isResolved).toBe(false)
  })
})
