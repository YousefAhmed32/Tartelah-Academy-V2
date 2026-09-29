jest.mock('node-cron', () => ({ schedule: jest.fn() }))
jest.mock('../../models/Session')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/QuranSessionReport')
jest.mock('../../models/User')
jest.mock('../../services/notification.service')

const Session = require('../../models/Session')
const Assignment = require('../../models/SupervisionAssignment')
const Report = require('../../models/QuranSessionReport')
const User = require('../../models/User')
const { createNotification } = require('../../services/notification.service')
const { runMissingTeacherReportAlerts } = require('../teacherReportFollowup.job')

beforeEach(() => jest.clearAllMocks())

test('alerts the teacher and academic manager only for an actually missing report', async () => {
  const session = { _id: 's1', teacherId: 'teacher', titleAr: 'حلقة', scheduledAt: new Date('2026-10-01T09:00:00Z'), completedAt: new Date('2026-10-01T09:48:00Z') }
  Session.find.mockImplementation((filter) => ({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => session.completedAt >= filter.completedAt.$gte && session.completedAt <= filter.completedAt.$lte ? [session] : [] }) }) }) }))
  Session.exists.mockResolvedValue(true)
  Report.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  Report.exists.mockResolvedValue(false)
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  User.find.mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'manager', supervisionPosition: 'manager' }] }) })
  createNotification.mockResolvedValue({ _id: 'n1' })
  await runMissingTeacherReportAlerts(new Date('2026-10-01T10:00:00Z'))
  expect(createNotification.mock.calls.map(([row]) => row.userId)).toEqual(['teacher', 'manager'])
  expect(createNotification.mock.calls[0][0].metadata.reminderKey).toContain('missing-teacher-report:s1:teacher')
})

test('does not alert when the report has already been submitted', async () => {
  Session.find.mockImplementation((filter) => ({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => filter.completedAt.$gte >= new Date('2026-10-01T09:30:00Z') ? [{ _id: 's2', teacherId: 'teacher' }] : [] }) }) }) }))
  Report.find.mockReturnValue({ select: () => ({ lean: async () => [{ sessionId: 's2' }] }) })
  await runMissingTeacherReportAlerts(new Date('2026-10-01T10:00:00Z'))
  expect(createNotification).not.toHaveBeenCalled()
})
