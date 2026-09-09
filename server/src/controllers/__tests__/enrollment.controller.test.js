jest.mock('../../models/EnrollmentRequest')
jest.mock('../../models/Subscription')
jest.mock('../../models/Package')
jest.mock('../../models/User')
jest.mock('../../models/LessonWallet')
jest.mock('../../models/LessonTransaction')
jest.mock('../../services/wallet.service')
jest.mock('../../services/notification.service')
jest.mock('../../services/audit.service')
jest.mock('../../services/assignment.service')

const EnrollmentRequest = require('../../models/EnrollmentRequest')
const Subscription = require('../../models/Subscription')
const User = require('../../models/User')
const walletService = require('../../services/wallet.service')
const assignmentService = require('../../services/assignment.service')
const ctrl = require('../enrollment.controller')

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}
function jsonOf(res) { return res.json.mock.calls[0][0] }

describe('enrollment.controller.reviewRequest with Scheduling', () => {
  const adminActor = { _id: 'admin1', role: 'admin' }
  const student = { _id: 'student1', firstNameAr: 'محمد', lastNameAr: 'علي', studentType: 'new' }
  const pkg = { _id: 'pkg1', nameAr: 'باقة التميز', durationDays: 30, sessionsPerMonth: 8 }

  let baseRequestDoc

  beforeEach(() => {
    jest.resetAllMocks()

    baseRequestDoc = {
      _id: 'enr1',
      studentId: student,
      packageId: pkg,
      status: 'pending',
      amount: 400,
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue(true),
    }

    EnrollmentRequest.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(baseRequestDoc),
      }),
    })

    Subscription.create.mockResolvedValue({
      _id: 'sub1',
      studentId: 'student1',
      save: jest.fn().mockResolvedValue(true),
    })

    walletService.applyTransaction.mockResolvedValue({
      transaction: { _id: 'tx1' },
    })
  })

  test('rejects an invalid review action', async () => {
    const req = { params: { id: 'enr1' }, body: { action: 'maybe' }, user: adminActor }
    const res = mockRes()
    await ctrl.reviewRequest(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(jsonOf(res).message).toContain('غير صالح')
  })

  test('rejects approval without a teacherId', async () => {
    const req = { params: { id: 'enr1' }, body: { action: 'approved' }, user: adminActor }
    const res = mockRes()
    await ctrl.reviewRequest(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(jsonOf(res).message).toContain('يجب تحديد المعلم')
  })

  test('standard approval without scheduling creates subscription and credits wallet', async () => {
    const req = {
      params: { id: 'enr1' },
      user: adminActor,
      body: { action: 'approved', teacherId: 'teacher1', adminNotes: 'تم الاعتماد' },
    }
    const res = mockRes()
    await ctrl.reviewRequest(req, res, jest.fn())

    expect(baseRequestDoc.status).toBe('approved')
    expect(baseRequestDoc.teacherId).toBe('teacher1')
    expect(Subscription.create).toHaveBeenCalled()
    expect(walletService.applyTransaction).toHaveBeenCalledWith(expect.objectContaining({
      studentId: 'student1',
      amount: 8,
      type: 'purchase',
    }))
    expect(assignmentService.createAssignmentRequest).not.toHaveBeenCalled()
    expect(jsonOf(res).message).toBe('تمت الموافقة وتفعيل الاشتراك')
  })

  test('approval with direct scheduling immediately activates schedule for teacher', async () => {
    assignmentService.createAssignmentRequest.mockResolvedValue({
      assignmentRequest: { _id: 'assign1', status: 'completed' },
    })

    const req = {
      params: { id: 'enr1' },
      user: adminActor,
      body: {
        action: 'approved',
        teacherId: 'teacher1',
        studentType: 'new',
        scheduleConfig: {
          enabled: true,
          mode: 'direct',
          specialization: 'quran',
          lessonDurationMinutes: 45,
          days: [{ dayOfWeek: 0, time: '16:00' }, { dayOfWeek: 2, time: '16:00' }],
          frequency: 'weekly',
          startDate: '2026-09-01',
          immediateOverride: true,
          overrideReason: 'معلم كبير في السن والاتفاق مسبق',
        },
      },
    }
    const res = mockRes()
    await ctrl.reviewRequest(req, res, jest.fn())

    expect(assignmentService.createAssignmentRequest).toHaveBeenCalledWith(expect.objectContaining({
      studentId: 'student1',
      teacherId: 'teacher1',
      studentType: 'new',
      specialization: 'quran',
      lessonDurationMinutes: 45,
      immediateOverride: true,
      overrideReason: 'معلم كبير في السن والاتفاق مسبق',
    }))
    expect(baseRequestDoc.assignmentRequestId).toBe('assign1')
    expect(jsonOf(res).message).toBe('تمت الموافقة وتفعيل الاشتراك وجدولة الحصص مباشرة')
  })

  test('approval with assignment request sends notification to teacher', async () => {
    assignmentService.createAssignmentRequest.mockResolvedValue({
      assignmentRequest: { _id: 'assign2', status: 'pending_teacher_approval' },
    })

    const req = {
      params: { id: 'enr1' },
      user: adminActor,
      body: {
        action: 'approved',
        teacherId: 'teacher1',
        studentType: 'new',
        scheduleConfig: {
          enabled: true,
          mode: 'request',
          specialization: 'tajweed',
          lessonDurationMinutes: 30,
          days: [{ dayOfWeek: 1, time: '17:00' }],
          frequency: 'weekly',
          startDate: '2026-09-01',
        },
      },
    }
    const res = mockRes()
    await ctrl.reviewRequest(req, res, jest.fn())

    expect(assignmentService.createAssignmentRequest).toHaveBeenCalledWith(expect.objectContaining({
      studentId: 'student1',
      teacherId: 'teacher1',
      studentType: 'new',
      specialization: 'tajweed',
      immediateOverride: false,
    }))
    expect(baseRequestDoc.assignmentRequestId).toBe('assign2')
    expect(jsonOf(res).message).toBe('تمت الموافقة وتفعيل الاشتراك وإرسال طلب الإسناد للمعلم')
  })

  test('rolls back subscription and wallet if scheduling throws conflict error', async () => {
    const conflictErr = new Error('الموعد المحدد غير متاح')
    conflictErr.status = 409
    conflictErr.conflicts = [{ dayOfWeek: 0, time: '16:00', reason: 'teacher_conflict' }]
    assignmentService.createAssignmentRequest.mockRejectedValue(conflictErr)

    Subscription.deleteOne = jest.fn().mockResolvedValue(true)
    const LessonWallet = require('../../models/LessonWallet')
    LessonWallet.deleteOne = jest.fn().mockResolvedValue(true)
    const LessonTransaction = require('../../models/LessonTransaction')
    LessonTransaction.deleteOne = jest.fn().mockResolvedValue(true)

    const req = {
      params: { id: 'enr1' },
      user: adminActor,
      body: {
        action: 'approved',
        teacherId: 'teacher1',
        scheduleConfig: {
          enabled: true,
          mode: 'direct',
          specialization: 'quran',
          lessonDurationMinutes: 45,
          days: [{ dayOfWeek: 0, time: '16:00' }],
        },
      },
    }
    const res = mockRes()
    await ctrl.reviewRequest(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(jsonOf(res).message).toBe('الموعد المحدد غير متاح')
    expect(jsonOf(res).conflicts).toBeDefined()
    expect(Subscription.deleteOne).toHaveBeenCalled()
    expect(LessonTransaction.deleteOne).toHaveBeenCalled()
  })
})
