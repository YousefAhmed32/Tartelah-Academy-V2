// Mocked User model — see backfillLessonWallets.test.js for the established
// rationale (no DB test infrastructure in this repo).

jest.mock('../../models/User')
const User = require('../../models/User')
const { rbacModulePermissionsBackfill } = require('../rbacModulePermissionsBackfill')
const { ROLES, DEFAULT_PERMISSIONS_BY_ROLE } = require('../../config/permissions')

beforeEach(() => jest.clearAllMocks())

describe('rbacModulePermissionsBackfill', () => {
  test('unions module defaults onto an existing plain-admin account missing them', async () => {
    const admin = { role: 'admin', isPrimaryAdmin: false, permissions: ['users.view'], save: jest.fn().mockResolvedValue(true) }
    User.find.mockResolvedValueOnce([admin])

    const result = await rbacModulePermissionsBackfill()

    expect(admin.permissions).toEqual(expect.arrayContaining(['users.view', 'students.view', 'courses.manage']))
    expect(admin.save).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ checked: 1, updated: 1 })
  })

  test('never removes an existing permission not in the default set', async () => {
    const admin = { role: 'admin', isPrimaryAdmin: false, permissions: ['users.view', 'roles.create'], save: jest.fn().mockResolvedValue(true) }
    User.find.mockResolvedValueOnce([admin])

    await rbacModulePermissionsBackfill()

    expect(admin.permissions).toContain('roles.create')
  })

  test('is a no-op (no save) once an admin already has every default module permission', async () => {
    const admin = { role: 'admin', isPrimaryAdmin: false, permissions: [...DEFAULT_PERMISSIONS_BY_ROLE[ROLES.ADMIN]], save: jest.fn() }
    User.find.mockResolvedValueOnce([admin])

    const result = await rbacModulePermissionsBackfill()

    expect(admin.save).not.toHaveBeenCalled()
    expect(result).toEqual({ checked: 1, updated: 0 })
  })

  test('never touches isPrimaryAdmin or non-admin accounts (excluded by the query itself)', async () => {
    User.find.mockResolvedValueOnce([])
    const result = await rbacModulePermissionsBackfill()
    expect(User.find).toHaveBeenCalledWith({ role: 'admin', isPrimaryAdmin: { $ne: true } })
    expect(result).toEqual({ checked: 0, updated: 0 })
  })
})
