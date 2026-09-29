jest.mock('../../models/Session')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/SupervisionShift')
jest.mock('../../models/User')
jest.mock('../../models/QuranSessionReport')
jest.mock('../../models/SupervisionDailyAction')
jest.mock('../../models/SupervisionDayDispatch')
jest.mock('../../models/AcademicObservationReport')
jest.mock('../../models/SupervisionSettings')
jest.mock('../../services/notification.service')
jest.mock('../../services/audit.service')

const Session = require('../../models/Session')
const Assignment = require('../../models/SupervisionAssignment')
const User = require('../../models/User')
const Report = require('../../models/QuranSessionReport')
const Action = require('../../models/SupervisionDailyAction')
const Shift = require('../../models/SupervisionShift')
const Dispatch = require('../../models/SupervisionDayDispatch')
const AcademicReport = require('../../models/AcademicObservationReport')
const Settings = require('../../models/SupervisionSettings')
const { createNotifications } = require('../../services/notification.service')
const ctrl = require('../supervisionDaily.controller')

const teacher = '507f1f77bcf86cd799439011'
const supervisor = '507f1f77bcf86cd799439012'
const sessionId = '507f1f77bcf86cd799439013'
const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })
const manager = () => ({ _id: supervisor, role: 'manager', supervisionTeam: 'academic', supervisionPosition: 'manager', hasPermission: () => true })
const req = () => ({ user: manager(), query: { team: 'academic', from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' }, body: {}, ip: '127.0.0.1' })

beforeEach(() => {
  jest.clearAllMocks()
  AcademicReport.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  Settings.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ reportGraceMinutes: 120 }) }) })
})

test('manager cannot list another team daily schedule', async () => {
  const request = req(); request.query.team = 'administrative'
  const response = res()
  await ctrl.list(request, response, jest.fn())
  expect(response.status).toHaveBeenCalledWith(403)
  expect(Session.find).not.toHaveBeenCalled()
})

test('daily list uses assignment-period filter before pagination and shows a missing report', async () => {
  const at = new Date('2026-10-01T10:00:00Z')
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [{ teacherId: teacher, supervisorId: supervisor, startsAt: new Date('2026-10-01T08:00:00Z'), endsAt: null, primary: true }] }) })
  Session.find.mockReturnValue({ select: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ populate: () => ({ populate: () => ({ lean: async () => [{ _id: sessionId, teacherId: { _id: teacher }, studentId: { _id: 'student' }, status: 'completed', quranReportRequired: true, scheduledAt: at }] }) }) }) }) }) }) })
  Session.countDocuments.mockResolvedValue(1)
  Report.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  Action.find.mockReturnValue({ select: () => ({ populate: () => ({ lean: async () => [] }) }) })
  User.find.mockReturnValue({ select: () => ({ lean: async () => [{ _id: supervisor, isActive: true }] }) })
  Shift.find.mockReturnValue({ select: () => ({ lean: async () => [{ startsAt: new Date('2026-10-01T09:00:00Z'), endsAt: new Date('2026-10-01T11:00:00Z'), members: [supervisor] }] }) })
  Dispatch.findOne.mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => null }) }) })
  const response = res()
  const next = jest.fn()
  await ctrl.list(req(), response, next)
  expect(next).not.toHaveBeenCalled()
  expect(Session.find.mock.calls[0][0].$or[0].scheduledAt).toEqual({ $gte: new Date('2026-10-01T08:00:00Z'), $lt: new Date('2026-10-02T00:00:00Z') })
  expect(response.json.mock.calls[0][0].data[0].missingTeacherReport).toBe(true)
  expect(response.json.mock.calls[0][0].data[0].supervisors[0].onShift).toBe(true)
  const focused = req(); focused.query.sessionId = sessionId
  await ctrl.list(focused, res(), jest.fn())
  expect(Session.find.mock.calls[1][0]._id).toBe(sessionId)
  expect(Session.find.mock.calls[1][0].status).toBeUndefined()
  expect(Session.find.mock.calls[1][0].$or[0].teacherId).toBe(teacher)
})

test('report follow-up refuses a report that was already submitted', async () => {
  Session.findById.mockReturnValue({ select: () => ({ lean: async () => ({ _id: sessionId, teacherId: teacher, scheduledAt: new Date('2026-10-01T10:00:00Z'), status: 'completed', quranReportRequired: true }) }) })
  Assignment.exists.mockResolvedValue(true)
  Report.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ status: 'submitted' }) }) })
  const request = req(); request.params = { sessionId }
  const response = res()
  await ctrl.remindTeacherReport(request, response, jest.fn())
  expect(response.status).toHaveBeenCalledWith(409)
})

test('administrative supervisor can record readiness only for an assigned session', async () => {
  const request = req()
  request.user = { _id: supervisor, role: 'staff', supervisionTeam: 'administrative', supervisionPosition: 'supervisor' }
  request.params = { sessionId }
  request.body = { aspect: 'link', state: 'issue' }
  Session.findById.mockReturnValue({ select: () => ({ lean: async () => ({ _id: sessionId, teacherId: teacher, scheduledAt: new Date('2026-10-01T10:00:00Z'), status: 'scheduled' }) }) })
  Assignment.exists.mockResolvedValue(true)
  Session.findOneAndUpdate.mockReturnValue({ select: async () => ({ administrativeReadiness: { link: 'issue' } }) })
  const response = res()
  await ctrl.updateReadiness(request, response, jest.fn())
  expect(Session.findOneAndUpdate.mock.calls[0][1].$set['administrativeReadiness.link']).toBe('issue')
  expect(response.json.mock.calls[0][0].data.link).toBe('issue')
})

test('administrative handoff notifies assigned academic supervisors and their manager with live schedule links', async () => {
  const request = req()
  request.user = { _id: supervisor, role: 'admin', isPrimaryAdmin: true, hasPermission: () => true }
  request.body = { from: request.query.from, to: request.query.to }
  const at = new Date('2026-10-01T10:00:00Z')
  Assignment.find.mockImplementation((filter) => ({ select: () => ({ lean: async () => filter.team === 'academic' ? [{ teacherId: teacher, supervisorId: supervisor, startsAt: new Date('2026-10-01T08:00:00Z'), endsAt: null }] : [] }) }))
  Session.countDocuments.mockResolvedValue(1)
  Session.distinct.mockResolvedValue([teacher])
  Session.find.mockReturnValue({ select: () => ({ lean: () => ({ cursor: () => (async function* () { yield { teacherId: teacher, scheduledAt: at } })() }) }) })
  User.find.mockImplementation((filter) => ({ select: () => ({ lean: async () => filter.supervisionPosition === 'manager' ? [{ _id: 'manager', supervisionPosition: 'manager' }] : [{ _id: supervisor, supervisionPosition: 'supervisor' }] }) }))
  Dispatch.create.mockResolvedValue({ _id: sessionId })
  createNotifications.mockResolvedValue([])
  const response = res()
  const next = jest.fn()
  await ctrl.dispatch(request, response, next)
  expect(next).not.toHaveBeenCalled()
  expect(createNotifications.mock.calls[0][0]).toEqual(expect.arrayContaining([
    expect.objectContaining({ userId: supervisor, actionUrl: '/admin/supervision/academic' }),
    expect.objectContaining({ userId: 'manager', actionUrl: '/admin/supervision/academic-manager' }),
  ]))
  expect(response.status).toHaveBeenCalledWith(201)
})
