const { isOnboardingSaveKeyIndex } = require('../migrateOnboardingSaveKeyIndex')

describe('migrateOnboardingSaveKeyIndex', () => {
  test('recognizes the canonical single-field index regardless of its name', () => {
    expect(isOnboardingSaveKeyIndex({ name: 'legacy', key: { onboardingSaveKey: 1 } })).toBe(true)
  })

  test('does not match unrelated or compound indexes', () => {
    expect(isOnboardingSaveKeyIndex({ key: { email: 1 } })).toBe(false)
    expect(isOnboardingSaveKeyIndex({ key: { onboardingSaveKey: 1, role: 1 } })).toBe(false)
  })
})
