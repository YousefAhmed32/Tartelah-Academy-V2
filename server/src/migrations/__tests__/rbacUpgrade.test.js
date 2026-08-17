// Mocked User model — see backfillLessonWallets.test.js for the established
// rationale (no DB test infrastructure in this repo).

jest.mock('../../models/User')
const User = require('../../models/User')
const { rbacUpgrade } = require('../rbacUpgrade')

beforeEach(() => jest.clearAllMocks())

describe('rbacUpgrade', () => {
  test('does nothing if a Primary Admin already exists (idempotent re-run)', async () => {
    User.findOne.mockResolvedValueOnce({ _id: 'already-primary' })
    const result = await rbacUpgrade()
    expect(result.status).toBe('already_migrated')
    expect(User.findOne).toHaveBeenCalledTimes(1)
  })

  test('promotes the seeded production admin account when present', async () => {
    User.findOne
      .mockResolvedValueOnce(null) // no existing primary admin
      .mockResolvedValueOnce({ email: 'admin@tartelah.com', isPrimaryAdmin: false, save: jest.fn().mockResolvedValue(true) })

    const result = await rbacUpgrade()

    expect(result.status).toBe('promoted')
    expect(result.promoted).toBe('admin@tartelah.com')
  })

  test('falls back to the earliest-created admin when the seeded account is absent', async () => {
    const candidate = { email: 'other-admin@x.com', isPrimaryAdmin: false, save: jest.fn().mockResolvedValue(true) }
    User.findOne
      .mockResolvedValueOnce(null) // no existing primary admin
      .mockResolvedValueOnce(null) // no admin@tartelah.com
    User.findOne.mockReturnValueOnce({ sort: jest.fn().mockResolvedValue(candidate) })

    const result = await rbacUpgrade()

    expect(result.status).toBe('promoted')
    expect(candidate.isPrimaryAdmin).toBe(true)
    expect(candidate.save).toHaveBeenCalledTimes(1)
  })

  test('does nothing when no admin account exists at all', async () => {
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    User.findOne.mockReturnValueOnce({ sort: jest.fn().mockResolvedValue(null) })

    const result = await rbacUpgrade()

    expect(result.status).toBe('no_admin_found')
  })
})
