jest.mock('../../models/Session')
jest.mock('../../models/User')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/SupervisionException')
jest.mock('../../services/notification.service')
jest.mock('../../services/lessonDeduction.service')
jest.mock('../../services/payrollLedger.service')

const Session = require('../../models/Session')
const User = require('../../models/User')
const Assignment = require('../../models/SupervisionAssignment')
const Exception = require('../../models/SupervisionException')
const { createNotification, createNotifications } = require('../../services/notification.service')
const { handleTeacherNoShow } = require('../../services/lessonDeduction.service')
const { sweepStale } = require('../teacherAttendanceSweep.job')

beforeEach(() => jest.clearAllMocks())

test('a previously missed lesson progresses to no-show and receives one owned compensation follow-up', async () => {
  const teacherId = '507f1f77bcf86cd799439012'
  const ownerId = '507f1f77bcf86cd799439014'
  const session = {
    _id: '507f1f77bcf86cd799439011', teacherId: { _id: teacherId, firstNameAr: 'أحمد', lastNameAr: 'محمد' },
    studentId: '507f1f77bcf86cd799439013', titleAr: 'حصة تجريبية', status: 'missed',
    scheduledAt: new Date(Date.now() - 3 * 86400000), durationMinutes: 60, payrollStatusSetBy: 'system',
    save: jest.fn().mockResolvedValue(undefined),
  }
  Session.find.mockReturnValue({ sort: () => ({ limit: () => ({ select: () => ({ populate: async () => [session] }) }) }) })
  Assignment.findOne.mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => ({ supervisorId: ownerId }) }) }) })
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  Exception.findOneAndUpdate.mockResolvedValue({ _id: '507f1f77bcf86cd799439015' })
  User.find.mockReturnValue({ select: async () => [] })
  createNotification.mockResolvedValue(null)
  createNotifications.mockResolvedValue([])
  handleTeacherNoShow.mockImplementation(async (row) => { row.compensationRequired = true })

  const result = await sweepStale()
  expect(Session.find.mock.calls[0][0].status).toEqual({ $in: ['scheduled', 'missed'] })
  expect(result.flaggedAbsent).toBe(1)
  expect(session.status).toBe('no_show')
  expect(Exception.findOneAndUpdate).toHaveBeenCalledWith(
    { autoKey: `teacher-no-show:${session._id}` },
    expect.objectContaining({ $setOnInsert: expect.objectContaining({ ownerId, type: 'compensation', studentId: session.studentId }) }),
    expect.objectContaining({ upsert: true })
  )
})
