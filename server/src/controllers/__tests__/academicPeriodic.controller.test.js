jest.mock('../../models/AcademicPeriodicReport')
jest.mock('../../models/AcademicRecognition')
jest.mock('../../models/User')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/Session')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/AcademicObservationReport')
jest.mock('../../models/SupervisionShift')
jest.mock('../../services/academicPeriodic.service')
jest.mock('../../services/audit.service')
const Report = require('../../models/AcademicPeriodicReport')
const Recognition = require('../../models/AcademicRecognition')
const Shift = require('../../models/SupervisionShift')
const User = require('../../models/User')
const Assignment = require('../../models/SupervisionAssignment')
const Session = require('../../models/Session')
const { metrics, periodBounds } = require('../../services/academicPeriodic.service')
const ctrl = require('../academicPeriodic.controller')
const id = '507f1f77bcf86cd799439011'
const other = '507f1f77bcf86cd799439012'
const supervisor = { _id: id, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'supervisor', hasPermission: () => true }
const manager = { _id: other, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'manager', hasPermission: () => true }
const adminManager = { ...manager, supervisionTeam: 'administrative' }
const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })
beforeEach(() => { jest.clearAllMocks(); periodBounds.mockReturnValue({ from: new Date('2026-03-31T21:00:00Z'), to: new Date('2026-04-30T21:00:00Z'), timezone: 'Africa/Cairo' }) })

test('administrative manager may read only administrative metrics', async () => {
  metrics.mockResolvedValue({ counts: { total: 0 } })
  const response = res()
  await ctrl.metrics({ user: adminManager, query: { team: 'administrative', start: '2026-04-01' } }, response, jest.fn())
  expect(response.json.mock.calls[0][0].success).toBe(true)
  expect(metrics).toHaveBeenCalledWith(expect.objectContaining({ team: 'administrative' }))
  const forbidden = res()
  await ctrl.metrics({ user: adminManager, query: { team: 'academic', start: '2026-04-01' } }, forbidden, jest.fn())
  expect(forbidden.status).toHaveBeenCalledWith(403)
})

test('supervisor cannot request another supervisor metrics', async () => {
  const response = res()
  await ctrl.metrics({ user: supervisor, query: { team: 'academic', supervisorId: other, start: '2026-04-01' } }, response, jest.fn())
  expect(response.status).toHaveBeenCalledWith(403)
  expect(metrics).not.toHaveBeenCalled()
})

test('supervisor cannot review a submitted report', async () => {
  const response = res()
  await ctrl.review({ user: supervisor, params: { id }, body: { decision: 'approved' } }, response, jest.fn())
  expect(response.status).toHaveBeenCalledWith(403)
  expect(Report.findById).not.toHaveBeenCalled()
})

test('manager correction preserves previous approved version', async () => {
  const row = { _id: id, status: 'approved', version: 2, periodStart: new Date(), periodEnd: new Date(), supervisorId: id,
    analysis: { rating: 'good' }, metricsSnapshot: { counts: { total: 3 } }, sourceFingerprint: 'old', revisions: [], save: jest.fn() }
  Report.findById.mockResolvedValue(row)
  metrics.mockResolvedValue({ counts: { total: 4 }, sourceFingerprint: 'new' })
  const response = res()
  await ctrl.correct({ user: manager, params: { id }, body: { reason: 'تصحيح مصدر الحضور', analysis: { rating: 'excellent' } } }, response, jest.fn())
  expect(row.revisions[0].previous.metricsSnapshot.counts.total).toBe(3)
  expect(row.metricsSnapshot.counts.total).toBe(4)
  expect(row.version).toBe(3)
  expect(row.save).toHaveBeenCalled()
})

test('submission freezes calculated metrics and actual shift intervals', async () => {
  const row = { _id: id, type: 'R3', status: 'draft', supervisorId: id,
    periodStart: new Date('2026-03-31T21:00:00Z'), periodEnd: new Date('2026-04-07T21:00:00Z'),
    analysis: { rating: 'good' }, revisions: [], version: 0, save: jest.fn() }
  Report.findOne.mockResolvedValue(row)
  metrics.mockResolvedValue({ counts: { total: 4 }, sourceFingerprint: 'fingerprint' })
  Shift.find.mockReturnValue({ select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ name: 'شيفت 1' }] }) }) }) })
  const response = res()
  await ctrl.submit({ user: supervisor, params: { id } }, response, jest.fn())
  expect(row.metricsSnapshot.counts.total).toBe(4)
  expect(row.shiftSnapshot).toEqual([{ name: 'شيفت 1' }])
  expect(row.status).toBe('submitted')
  expect(row.sourceFingerprint).toBe('fingerprint')
  expect(row.save).toHaveBeenCalled()
})

test('recognition remains private to academic manager and admin', async () => {
  const response = res()
  await ctrl.recognition({ user: supervisor, query: { start: '2026-04-01' } }, response, jest.fn())
  expect(response.status).toHaveBeenCalledWith(403)
  expect(Recognition.findOne).not.toHaveBeenCalled()
})

test('monthly recognition warns when an approved R4 source has a newer version', async () => {
  Recognition.findOne.mockReturnValue({ lean: async () => ({ students: [{ personId: other, sourceReportId: id, sourceVersion: 1 }] }) })
  Report.find.mockReturnValue({ select: () => ({ limit: () => ({ lean: async () => [{ _id: id, version: 2,
    analysis: { distinguishedStudents: [{ personId: other, reason: 'تقدم ملحوظ' }] } }] }) }) })
  User.find.mockReturnValue({ select: () => ({ lean: async () => [{ _id: other, role: 'student', firstNameAr: 'طالب' }] }) })
  const response = res()
  await ctrl.recognition({ user: manager, query: { start: '2026-04-01' } }, response, jest.fn())
  expect(response.json.mock.calls[0][0].data.sourcesChanged).toBe(true)
})

test('teacher nomination checks that teacher sessions are in the academic scope', async () => {
  User.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ _id: other }) }) })
  Session.aggregate.mockResolvedValue([])
  const response = res()
  await ctrl.save({ user: supervisor, body: { type: 'R4', start: '2026-04-01', analysis: {
    distinguishedTeachers: [{ personId: other, reason: 'متابعة ممتازة' }],
  } } }, response, jest.fn())
  expect(String(Session.aggregate.mock.calls[0][0][0].$match.teacherId)).toBe(other)
  expect(Session.aggregate.mock.calls[0][0]).toEqual(expect.arrayContaining([
    expect.objectContaining({ $match: { 'effectiveOwner.0.supervisorId': expect.anything() } }),
  ]))
  expect(response.status).toHaveBeenCalledWith(400)
  expect(Report.findOne).not.toHaveBeenCalled()
})
