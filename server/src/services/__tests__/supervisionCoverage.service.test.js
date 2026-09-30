jest.mock('../../models/Session')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/SupervisionCohortMember')

const Session = require('../../models/Session')
const { resolveOwner, listOwnedSessions } = require('../supervisionCoverage.service')

const at = new Date('2026-10-01T10:00:00Z')
const session = { _id: 'session-1', teacherId: 'teacher-1', studentId: 'student-1', scheduledAt: at }
const teacher = { _id: 'teacher-assignment', scopeType: 'teacher', teacherId: 'teacher-1', supervisorId: 'supervisor-default', startsAt: new Date('2026-09-01T00:00:00Z'), endsAt: null }
const cohort = { _id: 'cohort-assignment', scopeType: 'cohort', cohortId: 'cohort-1', supervisorId: 'supervisor-group', startsAt: new Date('2026-09-01T00:00:00Z'), endsAt: null }
const student = { _id: 'student-assignment', scopeType: 'student', teacherId: 'teacher-1', studentId: 'student-1', supervisorId: 'supervisor-special', startsAt: new Date('2026-09-01T00:00:00Z'), endsAt: null }
const member = { cohortId: 'cohort-1', studentId: 'student-1', startsAt: new Date('2026-09-01T00:00:00Z'), endsAt: null }

test('student override wins over cohort and teacher while another teacher keeps its own owner', () => {
  expect(resolveOwner(session, [teacher, cohort, student], [member]).supervisorId).toBe('supervisor-special')
  expect(resolveOwner({ ...session, teacherId: 'teacher-2' }, [teacher, cohort, student], [member]).supervisorId).toBe('supervisor-group')
})

test('cohort membership expiry and assignment replacement preserve dated ownership', () => {
  expect(resolveOwner(session, [teacher, cohort], [member]).supervisorId).toBe('supervisor-group')
  expect(resolveOwner(session, [teacher, cohort], [{ ...member, endsAt: at }]).supervisorId).toBe('supervisor-default')
  expect(resolveOwner(session, [{ ...teacher, endsAt: at }, { ...teacher, _id: 'new', supervisorId: 'new-owner', startsAt: at }], []).supervisorId).toBe('new-owner')
})

test('session ownership is filtered before skip and limit', async () => {
  Session.aggregate.mockResolvedValue([{ rows: [{ _id: 'owned' }], count: [{ total: 1 }] }])
  const userId = '507f1f77bcf86cd799439011'
  const result = await listOwnedSessions({ team: 'academic', from: at, to: new Date(at.getTime() + 3600000), userId, manager: false, admin: false, page: 2, limit: 10 })
  const pipeline = Session.aggregate.mock.calls[0][0]
  expect(pipeline.findIndex((step) => step.$match?.['effectiveOwner.0.supervisorId'])).toBeLessThan(pipeline.findIndex((step) => step.$facet))
  expect(pipeline.at(-1).$facet.rows[1].$skip).toBe(10)
  expect(result.total).toBe(1)
})

test('late-start radar filters before pagination and keeps ownership scope', async () => {
  Session.aggregate.mockResolvedValue([{ rows: [], count: [] }])
  await listOwnedSessions({ team: 'administrative', from: at, to: new Date(at.getTime() + 3600000),
    userId: '507f1f77bcf86cd799439011', manager: false, admin: false, page: 1, limit: 1, lateStart: true })
  const pipeline = Session.aggregate.mock.calls.at(-1)[0]
  expect(pipeline[0].$match).toEqual(expect.objectContaining({ status: { $in: ['scheduled', 'missed'] }, teacherStartedAt: null }))
  expect(pipeline.findIndex((step) => step.$match?.['effectiveOwner.0.supervisorId'])).toBeLessThan(pipeline.findIndex((step) => step.$facet))
})
