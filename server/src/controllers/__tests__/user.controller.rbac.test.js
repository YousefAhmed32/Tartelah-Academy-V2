// RBAC + PBAC unit tests for the admin/team-management endpoints in
// user.controller.js. Mocked User model — this repo has no DB test
// infrastructure (see course.controller.test.js for the same rationale) —
// so these exercise the real controller/escalation logic without a live
// database. `hasPermission` is attached to fake req.user/target objects the
// same way the real UserSchema method behaves (isPrimaryAdmin bypasses,
// otherwise checks the permissions array).

jest.mock('../../models/User')
jest.mock('../../services/audit.service')
jest.mock('../../services/notification.service')

const User = require('../../models/User')
const { logAction } = require('../../services/audit.service')
const ctrl = require('../user.controller')

function withPermission(overrides = {}) {
  const base = {
    _id: 'actor1', role: 'admin', isPrimaryAdmin: false, permissions: [],
    ...overrides,
  }
  base.hasPermission = (p) => base.isPrimaryAdmin || base.permissions.includes(p)
  return base
}

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}

beforeEach(() => jest.clearAllMocks())

describe('createUser — admins.create gate', () => {
  test('a plain admin without admins.create cannot create another admin', async () => {
    const req = { user: withPermission({ role: 'admin', permissions: ['users.create'] }), body: { role: 'admin', email: 'x@x.com', firstNameAr: 'أ', lastNameAr: 'ب' }, ip: '1.1.1.1' }
    const res = mockRes()

    await ctrl.createUser(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('the Primary Admin can create another admin', async () => {
    User.findOne.mockResolvedValue(null)
    User.create.mockResolvedValue({ toPublic: () => ({ _id: 'u2', role: 'admin' }) })
    const req = {
      user: withPermission({ role: 'admin', isPrimaryAdmin: true }),
      body: { role: 'admin', email: 'new-admin@x.com', firstNameAr: 'أ', lastNameAr: 'ب' },
      ip: '1.1.1.1',
    }
    const res = mockRes()

    await ctrl.createUser(req, res, jest.fn())

    expect(User.create).toHaveBeenCalledTimes(1)
    expect(User.create.mock.calls[0][0].isPrimaryAdmin).toBe(false) // never inherited
    expect(res.status).toHaveBeenCalledWith(201)
  })

  test('an assistant_admin without admins.create cannot create administrative accounts by default', async () => {
    const req = {
      user: withPermission({ role: 'assistant_admin', permissions: ['users.view', 'dashboard.view'] }),
      body: { role: 'operator', email: 'op@x.com', firstNameAr: 'أ', lastNameAr: 'ب' },
      ip: '1.1.1.1',
    }
    const res = mockRes()

    await ctrl.createUser(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('an assistant_admin CAN create an admin-family account once granted admins.create', async () => {
    User.findOne.mockResolvedValue(null)
    User.create.mockResolvedValue({ toPublic: () => ({ _id: 'u3', role: 'operator' }) })
    const req = {
      user: withPermission({ role: 'assistant_admin', permissions: ['users.view', 'admins.create', 'dashboard.view', 'content.create', 'content.update'] }),
      body: { role: 'operator', email: 'op2@x.com', firstNameAr: 'أ', lastNameAr: 'ب' },
      ip: '1.1.1.1',
    }
    const res = mockRes()

    await ctrl.createUser(req, res, jest.fn())

    expect(User.create).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(201)
  })
})

describe('createUser — permission escalation prevention', () => {
  test('an actor cannot grant a permission they do not themselves hold', async () => {
    User.findOne.mockResolvedValue(null)
    const req = {
      user: withPermission({ role: 'admin', permissions: ['users.create'] }),
      body: { role: 'staff', email: 's@x.com', firstNameAr: 'أ', lastNameAr: 'ب', permissions: ['settings.update'] },
      ip: '1.1.1.1',
    }
    const res = mockRes()

    await ctrl.createUser(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(User.create).not.toHaveBeenCalled()
  })

  test('duplicate email is rejected with 409 before any create call', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing' })
    const req = {
      user: withPermission({ role: 'admin', isPrimaryAdmin: true }),
      body: { role: 'student', email: 'dup@x.com', firstNameAr: 'أ', lastNameAr: 'ب' },
      ip: '1.1.1.1',
    }
    const res = mockRes()

    await ctrl.createUser(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(User.create).not.toHaveBeenCalled()
  })
})

describe('updateUserPermissions — self-escalation & Primary Admin protection', () => {
  function mockTarget(overrides) {
    const t = { _id: 'target1', permissions: [], save: jest.fn().mockResolvedValue(true), ...overrides }
    t.toPublic = () => t
    return t
  }

  test('a user cannot grant permissions to themselves', async () => {
    const target = mockTarget({ _id: 'actor1' })
    User.findById.mockResolvedValue(target)
    const req = { user: withPermission({ _id: 'actor1', permissions: ['permissions.assign', 'settings.update'] }), params: { id: 'actor1' }, body: { permissions: ['settings.update'] }, ip: '1.1.1.1' }
    const res = mockRes()

    await ctrl.updateUserPermissions(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(target.save).not.toHaveBeenCalled()
  })

  test('the Primary Admin cannot have permissions modified', async () => {
    const target = mockTarget({ _id: 'target1', isPrimaryAdmin: true })
    User.findById.mockResolvedValue(target)
    const req = { user: withPermission({ _id: 'actor1', isPrimaryAdmin: false, permissions: ['permissions.assign'] }), params: { id: 'target1' }, body: { permissions: [] }, ip: '1.1.1.1' }
    const res = mockRes()

    await ctrl.updateUserPermissions(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(target.save).not.toHaveBeenCalled()
  })

  test('cannot grant a permission above the actor\'s own authority', async () => {
    const target = mockTarget({ _id: 'target1', permissions: [] })
    User.findById.mockResolvedValue(target)
    const req = {
      user: withPermission({ _id: 'actor1', permissions: ['permissions.assign', 'users.view'] }),
      params: { id: 'target1' }, body: { permissions: ['admins.create'] }, ip: '1.1.1.1',
    }
    const res = mockRes()

    await ctrl.updateUserPermissions(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(target.save).not.toHaveBeenCalled()
  })

  test('a valid, within-authority permission grant is persisted and audited', async () => {
    const target = mockTarget({ _id: 'target1', permissions: [] })
    User.findById.mockResolvedValue(target)
    const req = {
      user: withPermission({ _id: 'actor1', permissions: ['permissions.assign', 'users.view'] }),
      params: { id: 'target1' }, body: { permissions: ['users.view'] }, ip: '1.1.1.1',
    }
    const res = mockRes()

    await ctrl.updateUserPermissions(req, res, jest.fn())

    expect(target.save).toHaveBeenCalledTimes(1)
    expect(target.permissions).toEqual(['users.view'])
    expect(logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'update_permissions' }))
    expect(res.status).not.toHaveBeenCalledWith(403)
  })
})

describe('updateUserStatus — Primary Admin & last-administrator protection', () => {
  function mockTarget(overrides) {
    const t = { _id: 'target1', isActive: true, save: jest.fn().mockResolvedValue(true), ...overrides }
    t.toPublic = () => t
    return t
  }

  test('the Primary Admin cannot be disabled', async () => {
    const target = mockTarget({ isPrimaryAdmin: true })
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(target) })
    const req = { user: withPermission({ _id: 'actor1', isPrimaryAdmin: true }), params: { id: 'target1' }, body: { isActive: false }, ip: '1.1.1.1' }
    const res = mockRes()

    await ctrl.updateUserStatus(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(403)
    expect(target.save).not.toHaveBeenCalled()
  })

  test('the last active admin cannot be disabled', async () => {
    const target = mockTarget({ role: 'admin', isPrimaryAdmin: false })
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(target) })
    User.countDocuments.mockResolvedValue(0) // no other active admin/primary-admin exists
    const req = { user: withPermission({ _id: 'actor1', isPrimaryAdmin: true }), params: { id: 'target1' }, body: { isActive: false }, ip: '1.1.1.1' }
    const res = mockRes()

    await ctrl.updateUserStatus(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(target.save).not.toHaveBeenCalled()
  })

  test('disabling a non-critical account when another admin remains succeeds and revokes sessions', async () => {
    const target = mockTarget({ role: 'staff', isPrimaryAdmin: false, tokenVersion: 2 })
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(target) })
    User.countDocuments.mockResolvedValue(1)
    const req = { user: withPermission({ _id: 'actor1', isPrimaryAdmin: true }), params: { id: 'target1' }, body: { isActive: false }, ip: '1.1.1.1' }
    const res = mockRes()

    await ctrl.updateUserStatus(req, res, jest.fn())

    expect(target.save).toHaveBeenCalledTimes(1)
    expect(target.isActive).toBe(false)
    expect(target.tokenVersion).toBe(3) // revoked
  })
})
