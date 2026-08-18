jest.mock('../../services/audit.service')

const { requirePermission, requireAnyPermission, userHasPermission } = require('../rbac.middleware')

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}

function user(overrides = {}) {
  return { _id: 'u1', role: 'manager', isPrimaryAdmin: false, permissions: [], ...overrides }
}

describe('userHasPermission', () => {
  test('Primary Admin always passes, regardless of the permissions array', () => {
    expect(userHasPermission(user({ isPrimaryAdmin: true, permissions: [] }), 'anything.at.all')).toBe(true)
  })

  test('non-primary user passes only if the permission is in their array', () => {
    expect(userHasPermission(user({ permissions: ['students.view'] }), 'students.view')).toBe(true)
    expect(userHasPermission(user({ permissions: ['students.view'] }), 'students.manage')).toBe(false)
  })

  test('no user is never authorized', () => {
    expect(userHasPermission(null, 'students.view')).toBe(false)
  })
})

describe('requirePermission — now the gate for the module route surfaces (students/teachers/courses/...)', () => {
  test('401 when unauthenticated', () => {
    const req = { user: null }
    const res = mockRes()
    requirePermission('courses.view')(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('403 when the user lacks the specific module permission', () => {
    const req = { user: user({ permissions: ['students.view'] }), originalUrl: '/api/v1/courses', method: 'GET' }
    const res = mockRes()
    const next = jest.fn()
    requirePermission('courses.view')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  test('passes when the user holds the exact module permission granted via the account UI', () => {
    const req = { user: user({ permissions: ['courses.view'] }) }
    const res = mockRes()
    const next = jest.fn()
    requirePermission('courses.view')(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  test('requires every listed permission when multiple are passed', () => {
    const req = { user: user({ permissions: ['courses.view'] }) }
    const res = mockRes()
    const next = jest.fn()
    requirePermission('courses.view', 'courses.manage')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('requireAnyPermission', () => {
  test('passes if the user holds at least one of the listed permissions', () => {
    const req = { user: user({ permissions: ['enrollments.view'] }) }
    const res = mockRes()
    const next = jest.fn()
    requireAnyPermission('enrollments.view', 'enrollments.manage')(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  test('403 if the user holds none of the listed permissions', () => {
    const req = { user: user({ permissions: [] }), originalUrl: '/x', method: 'GET' }
    const res = mockRes()
    requireAnyPermission('enrollments.view', 'enrollments.manage')(req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
