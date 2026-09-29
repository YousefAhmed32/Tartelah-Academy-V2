jest.mock('../../models/Session')
jest.mock('../../models/User')
jest.mock('../../models/SupervisionAssignment')
jest.mock('../../models/Attendance')
jest.mock('../../models/SupervisionException')
jest.mock('../../models/SupervisionAdjustmentRequest')
jest.mock('../../models/TeacherPayrollEntry')
jest.mock('../../services/booking.service')
jest.mock('../../services/lessonDeduction.service')
jest.mock('../../services/compensation.service')
jest.mock('../../services/financialAdjustment.service')
jest.mock('../../services/wallet.service')
jest.mock('../../services/notification.service')
jest.mock('../../services/audit.service')
jest.mock('../../services/academySettings.service')

const Session = require('../../models/Session')
const User = require('../../models/User')
const Assignment = require('../../models/SupervisionAssignment')
const Exception = require('../../models/SupervisionException')
const Adjustment = require('../../models/SupervisionAdjustmentRequest')
const lessonDeduction = require('../../services/lessonDeduction.service')
const financial = require('../../services/financialAdjustment.service')
const wallet = require('../../services/wallet.service')
const compensation = require('../../services/compensation.service')
const booking = require('../../services/booking.service')
const { getAcademyTimezone } = require('../../services/academySettings.service')
const notification = require('../../services/notification.service')
const controller = require('../supervisionException.controller')

const ids = {
  session: '507f1f77bcf86cd799439011', teacher: '507f1f77bcf86cd799439012', student: '507f1f77bcf86cd799439013',
  staff: '507f1f77bcf86cd799439014', manager: '507f1f77bcf86cd799439015', case: '507f1f77bcf86cd799439016', request: '507f1f77bcf86cd799439017',
}
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() })
const staff = () => ({ _id: ids.staff, role: 'staff', supervisionTeam: 'administrative', supervisionPosition: 'supervisor', hasPermission: () => true })
const manager = () => ({ _id: ids.manager, role: 'manager', supervisionTeam: 'administrative', supervisionPosition: 'manager', hasPermission: () => true })
const req = (user = staff()) => ({ user, params: {}, body: {}, query: {}, ip: '127.0.0.1' })

beforeEach(() => { jest.clearAllMocks(); notification.createNotification.mockResolvedValue(null); notification.createNotifications.mockResolvedValue([]); getAcademyTimezone.mockResolvedValue('Africa/Cairo') })

test('academic supervisor cannot create administrative exception', async () => {
  const request = req({ _id: ids.staff, role: 'staff', supervisionTeam: 'academic', supervisionPosition: 'supervisor' })
  const res = response()
  await controller.create(request, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Exception.create).not.toHaveBeenCalled()
})

test('new exception requires dated assignment and a responsible owner with follow-up time', async () => {
  const request = req()
  request.body = { sessionId: ids.session, ownerId: ids.staff, type: 'link_issue', reason: 'الرابط لا يعمل', followUpAt: new Date(Date.now() + 3600000).toISOString() }
  Session.findById.mockReturnValue({ select: () => ({ lean: async () => ({ teacherId: ids.teacher, studentId: ids.student, scheduledAt: new Date() }) }) })
  Assignment.exists.mockResolvedValue(false)
  const res = response()
  await controller.create(request, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(403)
  expect(Exception.create).not.toHaveBeenCalled()
})

test('manager rejection never writes to lesson or payroll ledger', async () => {
  const request = req(manager())
  request.params.id = ids.request
  request.body = { decision: 'reject', reason: 'لا يوجد سند للخصم' }
  const row = { _id: ids.request, status: 'pending', requestedAmount: 2, unit: 'lesson', teacherId: ids.teacher, sessionScheduledAt: new Date(),
    requestedBy: ids.staff, reason: 'طلب خصم', accountType: 'student_lessons', save: jest.fn().mockResolvedValue(undefined) }
  Adjustment.findById.mockResolvedValue(row)
  Assignment.exists.mockResolvedValue(true)
  Adjustment.findOneAndUpdate.mockResolvedValue({ ...row, status: 'processing', decision: 'reject', decidedAmount: 0, decisionReason: request.body.reason })
  const res = response()
  const next = jest.fn()
  await controller.decideAdjustment(request, res, next)
  expect(next).not.toHaveBeenCalled()
  expect(res.json.mock.calls[0][0].data.status).toBe('rejected')
  expect(wallet.applyTransaction).not.toHaveBeenCalled()
  expect(financial.createTeacherAdjustment).not.toHaveBeenCalled()
})

test('manager can convert a requested teacher deduction to a bonus in the payroll ledger', async () => {
  const request = req(manager())
  request.params.id = ids.request
  request.body = { decision: 'bonus', amount: 70, reason: 'مكافأة بدل الجزاء' }
  const row = { _id: ids.request, status: 'pending', requestedAmount: 100, unit: 'EGP', teacherId: ids.teacher, sessionScheduledAt: new Date(),
    accountOwnerId: ids.teacher, requestedBy: ids.staff, reason: 'طلب خصم', accountType: 'teacher_payroll', save: jest.fn().mockResolvedValue(undefined) }
  Adjustment.findById.mockResolvedValue(row)
  Assignment.exists.mockResolvedValue(true)
  Adjustment.findOneAndUpdate.mockResolvedValue({ ...row, status: 'processing', decision: 'bonus', decidedAmount: 70, decisionReason: request.body.reason, decidedBy: ids.manager })
  financial.createTeacherAdjustment.mockResolvedValue({ entry: { _id: '507f1f77bcf86cd799439018' } })
  const res = response()
  await controller.decideAdjustment(request, res, jest.fn())
  expect(financial.createTeacherAdjustment).toHaveBeenCalledWith(expect.objectContaining({ type: 'bonus', amount: 70, idempotencyKey: `supervision-adjustment:${ids.request}` }))
  expect(res.json.mock.calls[0][0].data.status).toBe('bonus')
  expect(wallet.applyTransaction).not.toHaveBeenCalled()
})

test('approved student deduction reaches the lesson wallet once under a stable request key', async () => {
  const request = req(manager())
  request.params.id = ids.request
  request.body = { decision: 'approve', amount: 2, reason: 'غياب غير مبرر' }
  const row = { _id: ids.request, status: 'pending', requestedAmount: 3, unit: 'lesson', teacherId: ids.teacher, sessionScheduledAt: new Date(),
    accountOwnerId: ids.student, sessionId: ids.session, requestedBy: ids.staff, reason: 'خصم حصص', accountType: 'student_lessons', save: jest.fn().mockResolvedValue(undefined) }
  Adjustment.findById.mockResolvedValue(row)
  Assignment.exists.mockResolvedValue(true)
  Adjustment.findOneAndUpdate.mockResolvedValue({ ...row, status: 'processing', decision: 'approve', decidedAmount: 2, decisionReason: request.body.reason, decidedBy: ids.manager })
  wallet.applyTransaction.mockResolvedValue({ transaction: { _id: '507f1f77bcf86cd799439019' } })
  const res = response()
  await controller.decideAdjustment(request, res, jest.fn())
  expect(wallet.applyTransaction).toHaveBeenCalledWith(expect.objectContaining({ studentId: ids.student, amount: -2, idempotencyKey: `supervision-adjustment:${ids.request}` }))
  expect(res.json.mock.calls[0][0].data.status).toBe('approved')
})

test('the same adjustment cannot be approved twice', async () => {
  const request = req(manager())
  request.params.id = ids.request
  request.body = { decision: 'approve', reason: 'موافق' }
  Adjustment.findById.mockResolvedValue({ _id: ids.request, status: 'approved', teacherId: ids.teacher, sessionScheduledAt: new Date() })
  Assignment.exists.mockResolvedValue(true)
  const res = response()
  await controller.decideAdjustment(request, res, jest.fn())
  expect(res.status).toHaveBeenCalledWith(409)
  expect(financial.createTeacherAdjustment).not.toHaveBeenCalled()
})

test('cancelling an academy-side session uses the existing wallet policy and records the outcome', async () => {
  const request = req()
  request.params.id = ids.case
  request.body = { action: 'cancel', payload: { cancelledByRole: 'teacher' } }
  const row = { _id: ids.case, status: 'open', ownerId: ids.staff, sessionId: ids.session, reason: 'المعلم اعتذر', actionState: 'none' }
  const locked = { ...row, action: 'cancel', actionPayload: request.body.payload, actionState: 'processing', save: jest.fn().mockResolvedValue(undefined) }
  Exception.findById.mockResolvedValue(row)
  Exception.findOneAndUpdate.mockResolvedValue(locked)
  const session = { _id: ids.session, status: 'scheduled', teacherId: ids.teacher, studentId: ids.student, titleAr: 'حصة', scheduledAt: new Date(Date.now() + 3600000), save: jest.fn().mockResolvedValue(undefined) }
  Session.findById.mockResolvedValueOnce(session).mockReturnValueOnce({ select: () => ({ lean: async () => ({ scheduledAt: session.scheduledAt }) }) })
  lessonDeduction.handleCancellation.mockResolvedValue({ deducted: false, compensationGranted: true })
  User.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  const res = response()
  const next = jest.fn()
  await controller.apply(request, res, next)
  expect(next).not.toHaveBeenCalled()
  expect(lessonDeduction.handleCancellation).toHaveBeenCalledWith(session, expect.objectContaining({ cancelledByRole: 'teacher' }))
  expect(session.status).toBe('cancelled')
  expect(locked.actionState).toBe('applied')
})

test('scheduling a makeup grants one source-linked credit and creates one source-linked lesson', async () => {
  const request = req()
  request.params.id = ids.case
  request.body = { action: 'schedule_makeup', payload: { scheduledAt: new Date(Date.now() + 86400000).toISOString(), teacherId: ids.teacher } }
  const row = { _id: ids.case, status: 'open', ownerId: ids.staff, sessionId: ids.session, reason: 'تعويض غياب المعلم', actionState: 'none' }
  const locked = { ...row, action: request.body.action, actionPayload: request.body.payload, actionState: 'processing', save: jest.fn().mockResolvedValue(undefined) }
  Exception.findById.mockResolvedValue(row)
  Exception.findOneAndUpdate.mockResolvedValue(locked)
  const session = { _id: ids.session, status: 'no_show', teacherId: ids.teacher, studentId: ids.student, titleAr: 'حصة', durationMinutes: 60,
    scheduledAt: new Date(Date.now() - 86400000), save: jest.fn().mockResolvedValue(undefined) }
  Session.findById.mockResolvedValueOnce(session).mockReturnValueOnce({ select: () => ({ lean: async () => ({ scheduledAt: session.scheduledAt, teacherId: ids.teacher }) }) })
  Session.findOne.mockResolvedValue(null)
  Session.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439020', status: 'scheduled' })
  User.findOne.mockReturnValue({ select: () => ({ lean: async () => ({ _id: ids.teacher, meetingLinks: [{ link: 'https://meet.example.com/room', provider: 'meet' }] }) }) })
  User.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  Assignment.find.mockReturnValue({ select: () => ({ lean: async () => [] }) })
  compensation.grantCompensation.mockImplementation(async (source) => { source.compensationRequired = true; source.compensationGrantedTransactionId = ids.request })
  booking.assertNoConflict.mockResolvedValue(undefined)
  const res = response()
  const next = jest.fn()
  await controller.apply(request, res, next)
  expect(next).not.toHaveBeenCalled()
  expect(compensation.grantCompensation).toHaveBeenCalledTimes(1)
  expect(Session.create).toHaveBeenCalledWith(expect.objectContaining({ makeupForSessionId: ids.session, isMakeup: true, studentId: ids.student }))
  expect(locked.actionState).toBe('applied')
})
