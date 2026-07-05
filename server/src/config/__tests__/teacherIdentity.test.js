const { GENDER, GENDER_VALUES, HONORIFIC_AR, ROLE_LABEL_AR, isValidGender } = require('../teacherIdentity')

describe('teacherIdentity config', () => {
  test('canonical values are exactly male and female', () => {
    expect(GENDER_VALUES.sort()).toEqual(['female', 'male'])
    expect(GENDER.MALE).toBe('male')
    expect(GENDER.FEMALE).toBe('female')
  })

  test('isValidGender accepts the canonical male/female filter values', () => {
    expect(isValidGender('male')).toBe(true)
    expect(isValidGender('female')).toBe(true)
  })

  test('isValidGender rejects anything else (invalid filter/value must be rejected, not guessed)', () => {
    expect(isValidGender('Male')).toBe(false)
    expect(isValidGender('other')).toBe(false)
    expect(isValidGender('')).toBe(false)
    expect(isValidGender(null)).toBe(false)
    expect(isValidGender(undefined)).toBe(false)
    expect(isValidGender('admin')).toBe(false)
  })

  test('every canonical gender has an honorific and a role label defined', () => {
    for (const g of GENDER_VALUES) {
      expect(typeof HONORIFIC_AR[g]).toBe('string')
      expect(HONORIFIC_AR[g].length).toBeGreaterThan(0)
      expect(typeof ROLE_LABEL_AR[g]).toBe('string')
    }
  })

  test('male and female honorifics are distinct (no shared/mirrored fallback)', () => {
    expect(HONORIFIC_AR.male).not.toBe(HONORIFIC_AR.female)
  })
})
