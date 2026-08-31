const { validatePassword, validateManualCredential, MIN_LENGTH } = require('../passwordPolicy')

describe('passwordPolicy.validatePassword', () => {
  test('rejects empty/missing password', () => {
    expect(validatePassword('')).toBeTruthy()
    expect(validatePassword(undefined)).toBeTruthy()
  })

  test(`rejects a password shorter than ${MIN_LENGTH} characters`, () => {
    expect(validatePassword('Ab1')).toBeTruthy()
  })

  test('rejects a password with no letters', () => {
    expect(validatePassword('12345678')).toBeTruthy()
  })

  test('rejects a password with no digits', () => {
    expect(validatePassword('abcdefgh')).toBeTruthy()
  })

  test('accepts a valid strong-enough password', () => {
    expect(validatePassword('Abcdef12')).toBeNull()
  })
})

describe('passwordPolicy.validateManualCredential', () => {
  test('rejects a weak password even if confirmation matches', () => {
    expect(validateManualCredential({ password: '1234', passwordConfirm: '1234' })).toBeTruthy()
  })

  test('rejects a confirmation mismatch', () => {
    expect(validateManualCredential({ password: 'Abcdef12', passwordConfirm: 'Different99' })).toBeTruthy()
  })

  test('accepts a matching strong password', () => {
    expect(validateManualCredential({ password: 'Abcdef12', passwordConfirm: 'Abcdef12' })).toBeNull()
  })

  test('accepts when confirmation is not supplied at all (frontend-only check)', () => {
    expect(validateManualCredential({ password: 'Abcdef12' })).toBeNull()
  })
})
