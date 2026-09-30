jest.mock('../../models/SupervisionShift')
jest.mock('../../models/SupervisionShiftRecord')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/Session')
jest.mock('../../models/SupervisionException')
jest.mock('../../models/SupervisionDailyAction')
jest.mock('../../models/SupervisionAdjustmentRequest')
jest.mock('../../models/TeacherPayrollEntry')
jest.mock('../../models/LessonTransaction')
jest.mock('../../models/SupervisionSettings')
jest.mock('../../models/User')
jest.mock('../../services/audit.service')
jest.mock('../../services/notification.service')

const Shift = require('../../models/SupervisionShift')
const Record = require('../../models/SupervisionShiftRecord')
const Assignment = require('../../models/SupervisionAssignment')
const Session = require('../../models/Session')
const Exception = require('../../models/SupervisionException')
const Action = require('../../models/SupervisionDailyAction')
const Settings = require('../../models/SupervisionSettings')
const User = require('../../models/User')
const controller = require('../supervisionShiftRecord.controller')

const shiftId = '507f1f77bcf86cd799439011'
const staffId = '507f1f77bcf86cd799439012'
const otherId = '507f1f77bcf86cd799439013'
const teacherId = '507f1f77bcf86cd799439014'
const shift = () => ({ _id: shiftId, team: 'administrative', name: 'المساء',
  startsAt: new Date(Date.now() - 4 * 3600000), endsAt: new Date(Date.now() - 3600000), members: [staffId, otherId] })
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })
const staff = () => ({ _id: staffId, role: 'staff', supervisionTeam: 'administrative', supervisionPosition: 'supervisor' })
const req = (user = staff()) => ({ user, params: { shiftId }, query: {}, body: {}, ip: '127.0.0.1' })

beforeEach(() => { jest.clearAllMocks(); Assignment.exists.mockResolvedValue(false); Settings.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ reportGraceMinutes: 120 }) }) }) })

test('supervisor cannot read another member report even in the same shift', async () => {
  Shift.findById.mockReturnValue({ lean: async () => shift() })
  const request = req(); request.query.memberId = otherId
  const res = response()
  await controller.detail(request, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Record.findOne).not.toHaveBeenCalled()
})

test('report can be submitted without attendance and freezes an assignment scoped snapshot once', async () => {
  Shift.findById.mockReturnValue({ lean: async () => shift() })
  User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ supervisionPosition: 'supervisor' }) }) })
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [{ teacherId, startsAt: new Date(Date.now() - 3 * 3600000), endsAt: null }] }) })
  Session.aggregate.mockResolvedValue([{ _id: 'completed', count: 2 }])
  Session.find.mockReturnValue({ sort: () => ({ limit: () => ({ select: () => ({ populate: () => ({ populate: () => ({ lean: async () => [] }) }) }) }) }) })
  Exception.countDocuments.mockResolvedValue(0)
  Exception.find.mockReturnValue({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) }) })
  Action.countDocuments.mockResolvedValue(0)
  Action.find.mockReturnValue({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) }) })
  Record.findOneAndUpdate.mockResolvedValue({ _id: 'record', reportSubmittedAt: new Date() })
  const request = req(); request.body.analysis = 'الحصص تمت والمتابعة مستمرة'
  const res = response(), next = jest.fn()
  await controller.submitReport(request, res, next)
  expect(next).not.toHaveBeenCalled()
  expect(Record.findOneAndUpdate.mock.calls[0][0]).toEqual(expect.objectContaining({ memberId: staffId, reportSubmittedAt: { $exists: false } }))
  expect(Record.findOneAndUpdate.mock.calls[0][1].$set.reportSnapshot).toEqual(expect.objectContaining({ total: 2, completed: 2, observedLessons: null }))
  expect(Session.aggregate.mock.calls[0][0][0].$match.$or[0].teacherId).toBe(teacherId)
})

test('report draft remains private to the shift member and does not submit the report', async () => {
  Shift.findById.mockReturnValue({ lean: async () => shift() })
  Record.findOneAndUpdate.mockResolvedValue({ analysis: 'متابعة حالة الطالب', updatedAt: new Date() })
  const request = req(); request.body.analysis = 'متابعة حالة الطالب'
  const res = response()
  await controller.saveReportDraft(request, res, jest.fn())
  expect(Record.findOneAndUpdate.mock.calls[0][0].reportSubmittedAt).toEqual({ $exists: false })
  expect(Record.findOneAndUpdate.mock.calls[0][1].$set).toEqual({ analysis: 'متابعة حالة الطالب' })
  expect(res.json.mock.calls[0][0].success).toBe(true)
})

test('academic R2 distinguishes observed sessions from submitted and rated reports', async () => {
  const academic = { ...shift(), team: 'academic' }
  Shift.findById.mockReturnValue({ lean: async () => academic })
  User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ supervisionPosition: 'supervisor' }) }) })
  User.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [{ teacherId, startsAt: academic.startsAt, endsAt: null }] }) })
  Session.aggregate.mockResolvedValueOnce([{ _id: 'completed', count: 1 }]).mockResolvedValueOnce([{ counts: [{ observed: 1, submitted: 0, rated: 0 }], rows: [{ _id: 'lesson1', scheduledAt: academic.startsAt, teacherId, studentId: otherId, submitted: false, rated: false }] }])
  Session.find.mockReturnValue({ sort: () => ({ limit: () => ({ select: () => ({ populate: () => ({ populate: () => ({ lean: async () => [] }) }) }) }) }) })
  Exception.countDocuments.mockResolvedValue(0)
  Exception.find.mockReturnValue({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) }) })
  Action.countDocuments.mockResolvedValue(0)
  Action.find.mockReturnValue({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) }) })
  Record.findOneAndUpdate.mockResolvedValue({ _id: 'record', reportSubmittedAt: new Date() })
  const request = req({ _id: staffId, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'supervisor' })
  request.body.analysis = 'متابعة الحلقة'
  const res = response(), next = jest.fn()
  await controller.submitReport(request, res, next)
  expect(next).not.toHaveBeenCalled()
  expect(Record.findOneAndUpdate.mock.calls[0][1].$set.reportSnapshot).toEqual(expect.objectContaining({ observedLessons: 1, observedReportsSubmitted: 0, observedEvaluations: 0 }))
})

test('manager sees missing report after the two hour grace in shift list', async () => {
  const past = shift(); past.endsAt = new Date(Date.now() - 3 * 3600000)
  Shift.find.mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ populate: () => ({ lean: async () => [{ ...past, members: [{ _id: staffId, firstNameAr: 'أحمد' }] }] }) }) }) }) })
  Shift.countDocuments.mockResolvedValue(1)
  Settings.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ reportGraceMinutes: 120 }) }) })
  Record.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  const request = req({ _id: otherId, role: 'manager', supervisionTeam: 'administrative', supervisionPosition: 'manager' })
  request.query.team = 'administrative'
  const res = response()
  await controller.list(request, res, jest.fn())
  expect(res.json.mock.calls[0][0].data[0].records[0].report).toBe('late_missing')
})

test('handoff is independent of attendance and duplicate submission is rejected', async () => {
  Shift.findById.mockReturnValue({ lean: async () => shift() })
  Record.findOneAndUpdate.mockResolvedValue(null)
  const request = req(); request.body.note = 'حالة تحتاج المتابعة'
  const res = response()
  await controller.handoff(request, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(409)
  expect(Record.findOneAndUpdate.mock.calls[0][0].checkedInAt).toBeUndefined()
  expect(Action.find).not.toHaveBeenCalled()
})
