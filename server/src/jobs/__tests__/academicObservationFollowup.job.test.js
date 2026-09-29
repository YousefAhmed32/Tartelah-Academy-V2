jest.mock('../../models/Session')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/SupervisionShift')
jest.mock('../../models/AcademicObservationReport')
jest.mock('../../models/SupervisionSettings')
jest.mock('../../models/User')
jest.mock('../../services/notification.service')

const Session = require('../../models/Session')
const Assignment = require('../../models/SupervisionAssignment')
const Shift = require('../../models/SupervisionShift')
const Report = require('../../models/AcademicObservationReport')
const Settings = require('../../models/SupervisionSettings')
const User = require('../../models/User')
const { createNotification } = require('../../services/notification.service')
const { runMissingAcademicReports } = require('../academicObservationFollowup.job')

test('alerts assigned supervisor and academic manager only after shift grace', async () => {
  jest.clearAllMocks()
  const now = new Date('2026-10-01T18:00:00Z')
  const teacherId = '507f1f77bcf86cd799439011'
  const supervisorId = '507f1f77bcf86cd799439012'
  const managerId = '507f1f77bcf86cd799439013'
  const sessionId = '507f1f77bcf86cd799439014'
  Session.find.mockReturnValue({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [{ _id: sessionId, teacherId, scheduledAt: new Date('2026-10-01T12:00:00Z'), titleAr: 'الحلقة' }] }) }) }) })
  Settings.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ reportGraceMinutes: 120 }) }) })
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [{ teacherId, supervisorId, startsAt: new Date('2026-10-01T08:00:00Z'), endsAt: null }] }) })
  Shift.find.mockReturnValue({ select: () => ({ lean: async () => [{ members: [supervisorId], startsAt: new Date('2026-10-01T10:00:00Z'), endsAt: new Date('2026-10-01T14:00:00Z') }] }) })
  Report.find.mockReturnValue({ select: () => ({ lean: async () => [] }), sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) }) })
  User.find.mockImplementation((filter) => ({ select: () => ({ lean: async () => filter.supervisionPosition === 'manager' ? [{ _id: managerId }] : filter.supervisionPosition === 'supervisor' ? [{ _id: supervisorId }] : [] }) }))
  createNotification.mockResolvedValue({ _id: 'notification' })
  await runMissingAcademicReports(now)
  expect(createNotification).toHaveBeenCalledTimes(2)
  expect(createNotification.mock.calls.map(([arg]) => String(arg.userId)).sort()).toEqual([managerId, supervisorId].sort())
  expect(createNotification.mock.calls[0][0].metadata.reminderKey).toContain(`academic-report-missing:${sessionId}:${supervisorId}`)
})
