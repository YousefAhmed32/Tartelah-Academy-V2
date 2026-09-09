jest.mock('../../services/credentialDefaults.service')
const credentialDefaultsService = require('../../services/credentialDefaults.service')
const { resolveCredential, resolveCredentialInput, CredentialError } = require('../credentialMode')

beforeEach(() => jest.clearAllMocks())

describe('credentialMode.resolveCredential', () => {
  test('auto mode always forces a password change and returns a temporary password', async () => {
    const result = await resolveCredential({ mode: 'auto' })
    expect(result.mode).toBe('auto')
    expect(result.mustChangePassword).toBe(true)
    expect(result.temporaryPasswordToReturn).toEqual(expect.any(String))
    expect(result.temporaryPasswordToReturn.length).toBeGreaterThanOrEqual(8)
  })

  // Meeting addendum §1: manual mode's default flipped from true -> false.
  test('manual mode now defaults requirePasswordChange to FALSE when unset', async () => {
    const result = await resolveCredential({ mode: 'manual', password: 'Abcdef12', passwordConfirm: 'Abcdef12' })
    expect(result.mustChangePassword).toBe(false)
    expect(result.temporaryPasswordToReturn).toBeUndefined()
    expect(result.passwordToStore).toBe('Abcdef12')
  })

  test('manual mode respects an explicit requirePasswordChange: true', async () => {
    const result = await resolveCredential({ mode: 'manual', password: 'Abcdef12', passwordConfirm: 'Abcdef12', requirePasswordChange: true })
    expect(result.mustChangePassword).toBe(true)
  })

  test('manual mode rejects a weak password', async () => {
    await expect(resolveCredential({ mode: 'manual', password: '123' })).rejects.toThrow(CredentialError)
  })

  test('manual mode rejects a confirmation mismatch', async () => {
    await expect(resolveCredential({ mode: 'manual', password: 'Abcdef12', passwordConfirm: 'Other123' })).rejects.toThrow(CredentialError)
  })

  test('the thrown error never includes the plaintext password', async () => {
    try {
      await resolveCredential({ mode: 'manual', password: 'weak' })
      throw new Error('should have thrown')
    } catch (err) {
      expect(err.message).not.toMatch(/weak/)
    }
  })

  describe('academy_default mode', () => {
    test('requires a role to be provided', async () => {
      await expect(resolveCredential({ mode: 'academy_default' }, 'credential', {})).rejects.toThrow(CredentialError)
      expect(credentialDefaultsService.resolveDefaultPassword).not.toHaveBeenCalled()
    })

    test('resolves the role-specific default and never returns it as a one-time temp password', async () => {
      credentialDefaultsService.resolveDefaultPassword.mockResolvedValueOnce('AcademyDefaultPw1')
      const result = await resolveCredential({ mode: 'academy_default' }, 'credential', { role: 'student' })
      expect(credentialDefaultsService.resolveDefaultPassword).toHaveBeenCalledWith('student')
      expect(result.passwordToStore).toBe('AcademyDefaultPw1')
      expect(result.mode).toBe('academy_default')
      expect(result.temporaryPasswordToReturn).toBeUndefined()
    })

    test('defaults requirePasswordChange to false unless explicitly true', async () => {
      credentialDefaultsService.resolveDefaultPassword.mockResolvedValueOnce('pw')
      const result = await resolveCredential({ mode: 'academy_default' }, 'credential', { role: 'teacher' })
      expect(result.mustChangePassword).toBe(false)
    })

    test('an explicit requirePasswordChange: true is honored', async () => {
      credentialDefaultsService.resolveDefaultPassword.mockResolvedValueOnce('pw')
      const result = await resolveCredential({ mode: 'academy_default', requirePasswordChange: true }, 'credential', { role: 'teacher' })
      expect(result.mustChangePassword).toBe(true)
    })

    test('propagates a "not configured" failure from the service as a normal thrown error with a status', async () => {
      const err = new Error('لم يتم إعداد كلمة مرور افتراضية')
      err.status = 409
      credentialDefaultsService.resolveDefaultPassword.mockRejectedValueOnce(err)
      await expect(resolveCredential({ mode: 'academy_default' }, 'credential', { role: 'student' })).rejects.toMatchObject({ status: 409 })
    })
  })
})

describe('credentialMode.resolveCredentialInput (backward compatibility)', () => {
  test('a legacy flat password implies manual mode with no forced change (Part 1 behavior preserved)', async () => {
    const result = await resolveCredentialInput({ password: 'LegacyPass123' })
    expect(result.mode).toBe('manual')
    expect(result.mustChangePassword).toBe(false)
    expect(result.passwordToStore).toBe('LegacyPass123')
  })

  test('no password/credential at all falls back to auto mode', async () => {
    const result = await resolveCredentialInput({})
    expect(result.mode).toBe('auto')
    expect(result.mustChangePassword).toBe(true)
  })

  test('an explicit credential object takes precedence over a legacy password field', async () => {
    const result = await resolveCredentialInput({ password: 'ignored', credential: { mode: 'auto' } })
    expect(result.mode).toBe('auto')
  })

  test('threads role through to academy_default resolution', async () => {
    credentialDefaultsService.resolveDefaultPassword.mockResolvedValueOnce('pw')
    await resolveCredentialInput({ credential: { mode: 'academy_default' } }, 'credential', 'teacher')
    expect(credentialDefaultsService.resolveDefaultPassword).toHaveBeenCalledWith('teacher')
  })
})
