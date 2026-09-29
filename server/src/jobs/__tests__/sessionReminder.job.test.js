jest.mock('node-cron', () => ({ schedule: jest.fn() }))
jest.mock('../../models/Session')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/SupervisionShift')
jest.mock('../../models/User')
jest.mock('../../services/notification.service')
jest.mock('../../services/email.service')

const Session = require('../../models/Session')
const Assignment = require('../../models/SupervisionAssignment')
const Shift = require('../../models/SupervisionShift')
const User = require('../../models/User')
const { createNotification } = require('../../services/notification.service')
const { runSessionReminders, reminderWindows } = require('../sessionReminder.job')

const now = new Date('2026-10-01T09:00:00Z')
const student = { _id: 'student', firstNameAr: 'بلال', email: 'student@example.com' }
const teacher = { _id: 'teacher', firstNameAr: 'أحمد' }
const session = (scheduledAt) => ({ _id: 'session', studentId: student, teacherId: teacher, titleAr: 'حلقة القرآن', scheduledAt })

function mockSessions(rows) {
  Session.find.mockImplementation((query) => ({ sort: () => ({ limit: () => ({ populate: () => ({ lean: async () => rows.filter((row) => row.scheduledAt >= query.scheduledAt.$gte && row.scheduledAt <= query.scheduledAt.$lte) }) }) }) }))
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  User.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  Session.exists.mockResolvedValue(true)
  createNotification.mockImplementation(async (input) => ({ userId: input.userId }))
}

beforeEach(() => jest.clearAllMocks())

test('queries 30 and 5 minute windows within the 15 second cadence', async () => {
  mockSessions([])
  await runSessionReminders(now)
  const windows = Session.find.mock.calls.map(([row]) => row.scheduledAt)
  expect(windows).toContainEqual({ $gte: new Date('2026-10-01T09:28:00Z'), $lte: new Date('2026-10-01T09:30:15Z') })
  expect(windows).toContainEqual({ $gte: new Date('2026-10-01T09:03:00Z'), $lte: new Date('2026-10-01T09:05:15Z') })
  expect(reminderWindows(now)).toHaveLength(5)
})

test('only sends a reminder when the exact scheduled occurrence still exists', async () => {
  mockSessions([session(new Date('2026-10-01T09:05:00Z'))])
  Session.exists.mockResolvedValue(false)
  await runSessionReminders(now)
  expect(createNotification).not.toHaveBeenCalled()
})

test('reminder identity includes the schedule time and recipient after a reschedule', async () => {
  mockSessions([session(new Date('2026-10-01T09:05:00Z'))])
  await runSessionReminders(now)
  const first = createNotification.mock.calls.map(([row]) => row.metadata.reminderKey)
  expect(first).toHaveLength(2)
  expect(first[0]).not.toBe(first[1])
  createNotification.mockClear()
  mockSessions([session(new Date('2026-10-01T09:06:00Z'))])
  await runSessionReminders(new Date('2026-10-01T09:01:00Z'))
  expect(createNotification.mock.calls[0][0].metadata.reminderKey).not.toBe(first[0])
})

test('on-shift supervisor receives 5 minute notice without flooding managers with every offset', async () => {
  mockSessions([session(new Date('2026-10-01T09:05:00Z')), { ...session(new Date('2026-10-01T09:15:00Z')), _id: 'session2' }])
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [{ team: 'academic', teacherId: 'teacher', supervisorId: 'supervisor', startsAt: new Date('2026-10-01T08:00:00Z'), endsAt: null }] }) })
  Shift.find.mockReturnValue({ select: () => ({ lean: async () => [{ team: 'academic', members: ['supervisor'], startsAt: new Date('2026-10-01T08:00:00Z'), endsAt: new Date('2026-10-01T12:00:00Z') }] }) })
  User.find.mockReturnValue({ select: () => ({ lean: async () => [{ _id: 'supervisor', supervisionTeam: 'academic', supervisionPosition: 'supervisor' }] }) })
  await runSessionReminders(now)
  const staffNotices = createNotification.mock.calls.map(([row]) => row).filter((row) => row.userId === 'supervisor')
  expect(staffNotices).toHaveLength(1)
  expect(staffNotices[0].metadata.offsetMinutes).toBe(5)
})
