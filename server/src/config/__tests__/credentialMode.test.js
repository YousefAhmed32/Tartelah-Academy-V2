const { resolveCredential, resolveCredentialInput, CredentialError } = require('../credentialMode')

describe('credentialMode.resolveCredential', () => {
  test('auto mode always forces a password change and returns a temporary password', () => {
    const result = resolveCredential({ mode: 'auto' })
    expect(result.mode).toBe('auto')
    expect(result.mustChangePassword).toBe(true)
    expect(result.temporaryPasswordToReturn).toEqual(expect.any(String))
    expect(result.temporaryPasswordToReturn.length).toBeGreaterThanOrEqual(8)
  })

  test('manual mode defaults requirePasswordChange to true when unset', () => {
    const result = resolveCredential({ mode: 'manual', password: 'Abcdef12', passwordConfirm: 'Abcdef12' })
    expect(result.mustChangePassword).toBe(true)
    expect(result.temporaryPasswordToReturn).toBeUndefined()
    expect(result.passwordToStore).toBe('Abcdef12')
  })

  test('manual mode respects an explicit requirePasswordChange: false', () => {
    const result = resolveCredential({ mode: 'manual', password: 'Abcdef12', passwordConfirm: 'Abcdef12', requirePasswordChange: false })
    expect(result.mustChangePassword).toBe(false)
  })

  test('manual mode rejects a weak password', () => {
    expect(() => resolveCredential({ mode: 'manual', password: '123' })).toThrow(CredentialError)
  })

  test('manual mode rejects a confirmation mismatch', () => {
    expect(() => resolveCredential({ mode: 'manual', password: 'Abcdef12', passwordConfirm: 'Other123' })).toThrow(CredentialError)
  })

  test('the thrown error never includes the plaintext password', () => {
    try {
      resolveCredential({ mode: 'manual', password: 'weak' })
      throw new Error('should have thrown')
    } catch (err) {
      expect(err.message).not.toMatch(/weak/)
    }
  })
})

describe('credentialMode.resolveCredentialInput (backward compatibility)', () => {
  test('a legacy flat password implies manual mode with no forced change (Part 1 behavior preserved)', () => {
    const result = resolveCredentialInput({ password: 'LegacyPass123' })
    expect(result.mode).toBe('manual')
    expect(result.mustChangePassword).toBe(false)
    expect(result.passwordToStore).toBe('LegacyPass123')
  })

  test('no password/credential at all falls back to auto mode', () => {
    const result = resolveCredentialInput({})
    expect(result.mode).toBe('auto')
    expect(result.mustChangePassword).toBe(true)
  })

  test('an explicit credential object takes precedence over a legacy password field', () => {
    const result = resolveCredentialInput({ password: 'ignored', credential: { mode: 'auto' } })
    expect(result.mode).toBe('auto')
  })
})
