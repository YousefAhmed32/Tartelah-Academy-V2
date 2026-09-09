const crypto = require('crypto')

jest.mock('../../models/CredentialDefaults')
const CredentialDefaults = require('../../models/CredentialDefaults')

describe('credentialDefaults.service', () => {
  const ORIGINAL_KEY = process.env.CREDENTIAL_DEFAULTS_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CREDENTIAL_DEFAULTS_KEY = crypto.randomBytes(32).toString('base64')
  })

  afterAll(() => { process.env.CREDENTIAL_DEFAULTS_KEY = ORIGINAL_KEY })

  test('setDefault rejects an invalid role', async () => {
    const service = require('../credentialDefaults.service')
    await expect(service.setDefault('admin', { password: 'Abcdef12' })).rejects.toThrow(service.CredentialDefaultsError)
  })

  test('setDefault rejects a weak/numeric-only password (illustrative "12345678" must fail)', async () => {
    const service = require('../credentialDefaults.service')
    await expect(service.setDefault('student', { password: '12345678' })).rejects.toThrow(service.CredentialDefaultsError)
    expect(CredentialDefaults.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  test('setDefault rejects a confirmation mismatch', async () => {
    const service = require('../credentialDefaults.service')
    await expect(
      service.setDefault('student', { password: 'Abcdef12', passwordConfirm: 'Other123' })
    ).rejects.toThrow(service.CredentialDefaultsError)
  })

  test('setDefault never writes the plaintext password anywhere in the update payload', async () => {
    const service = require('../credentialDefaults.service')
    CredentialDefaults.findByIdAndUpdate.mockResolvedValueOnce({
      teacher: { updatedAt: new Date(), updatedBy: 'admin1' },
    })
    await service.setDefault('teacher', { password: 'StrongPass1', passwordConfirm: 'StrongPass1' }, { actorId: 'admin1' })

    const [, updatePayload] = CredentialDefaults.findByIdAndUpdate.mock.calls[0]
    const serialized = JSON.stringify(updatePayload)
    expect(serialized).not.toMatch(/StrongPass1/)
    expect(updatePayload.$set['teacher.configured']).toBe(true)
    expect(typeof updatePayload.$set['teacher.secretBlob']).toBe('string')
  })

  test('getStatus never includes a secretBlob field', async () => {
    const service = require('../credentialDefaults.service')
    CredentialDefaults.findById.mockResolvedValueOnce({
      student: { configured: true, updatedAt: new Date(), updatedBy: 'a1' },
      teacher: { configured: false },
    })
    const status = await service.getStatus()
    expect(JSON.stringify(status)).not.toMatch(/secretBlob/)
    expect(status.student.configured).toBe(true)
    expect(status.teacher.configured).toBe(false)
  })

  test('resolveDefaultPassword throws a 409 when no default is configured for the role', async () => {
    const service = require('../credentialDefaults.service')
    CredentialDefaults.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ student: { configured: false } }) })
    await expect(service.resolveDefaultPassword('student')).rejects.toMatchObject({ status: 409 })
  })

  test('resolveDefaultPassword decrypts back to the exact plaintext that was set', async () => {
    const { encryptSecret } = require('../../utils/credentialDefaultsCipher')
    const service = require('../credentialDefaults.service')
    const blob = encryptSecret('AcademyStudentDefault#1')
    CredentialDefaults.findById.mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce({ student: { configured: true, secretBlob: blob } }),
    })
    const plaintext = await service.resolveDefaultPassword('student')
    expect(plaintext).toBe('AcademyStudentDefault#1')
  })

  test('clearDefault unsets the secret and configured flag without ever reading the old value', async () => {
    const service = require('../credentialDefaults.service')
    CredentialDefaults.findByIdAndUpdate.mockResolvedValueOnce({ student: { updatedAt: new Date(), updatedBy: 'a1' } })
    const result = await service.clearDefault('student', { actorId: 'a1' })
    expect(result.configured).toBe(false)
    const [, updatePayload] = CredentialDefaults.findByIdAndUpdate.mock.calls[0]
    expect(updatePayload.$unset['student.secretBlob']).toBe('')
    expect(updatePayload.$set['student.configured']).toBe(false)
  })
})
