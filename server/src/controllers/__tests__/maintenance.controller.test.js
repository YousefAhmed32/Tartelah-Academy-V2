jest.mock('../../models/User')
jest.mock('../../models/Session')
jest.mock('../../models/ScheduleRule')
jest.mock('../../models/ScheduleReservationLock')
jest.mock('../../models/TeacherWorkingHours')
jest.mock('../../models/AssignmentRequest')
jest.mock('../../models/StudentTransfer')
jest.mock('../../models/TeacherReplacementBatch')
jest.mock('../../models/OnboardingSession')
jest.mock('../../models/OnboardingRequest')
jest.mock('../../models/Subscription')
jest.mock('../../models/SubscriptionPause')
jest.mock('../../models/SubscriptionRenewalRequest')
jest.mock('../../models/EnrollmentRequest')
jest.mock('../../models/LessonWallet')
jest.mock('../../models/LessonTransaction')
jest.mock('../../models/TeacherPayrollPeriod')
jest.mock('../../models/TeacherPayrollEntry')
jest.mock('../../models/Attendance')
jest.mock('../../models/Evaluation')
jest.mock('../../models/Homework')
jest.mock('../../models/Memorization')
jest.mock('../../models/Revision')
jest.mock('../../models/QuranSessionReport')
jest.mock('../../models/MonthlyTeacherReport')
jest.mock('../../models/Survey')
jest.mock('../../models/Notification')
jest.mock('../../models/Package')
jest.mock('../../models/Course')
jest.mock('../../models/TeachingSubject')
jest.mock('../../models/Article')
jest.mock('../../services/audit.service')

const User = require('../../models/User')
const Session = require('../../models/Session')
const Subscription = require('../../models/Subscription')
const TeacherWorkingHours = require('../../models/TeacherWorkingHours')
const ScheduleRule = require('../../models/ScheduleRule')
const LessonWallet = require('../../models/LessonWallet')
const ctrl = require('../maintenance.controller')

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}
function jsonOf(res) { return res.json.mock.calls[0][0] }

describe('maintenance.controller', () => {
  const adminUser = { _id: 'admin_1', role: 'admin' }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMaintenanceStats', () => {
    test('returns cleanable and protected counts correctly', async () => {
      User.countDocuments.mockImplementation((query) => {
        if (query?.role === 'student') return Promise.resolve(20)
        if (query?.role === 'teacher') return Promise.resolve(5)
        if (query?.role === 'admin') return Promise.resolve(2)
        return Promise.resolve(0)
      })
      Session.countDocuments.mockResolvedValue(100)
      Subscription.countDocuments.mockResolvedValue(18)
      LessonWallet.countDocuments.mockResolvedValue(18)

      const req = { user: adminUser }
      const res = mockRes()

      await ctrl.getMaintenanceStats(req, res, jest.fn())

      const response = jsonOf(res)
      expect(response.success).toBe(true)
      expect(response.data.cleanable.studentsCount).toBe(20)
      expect(response.data.cleanable.teachersCount).toBe(5)
      expect(response.data.cleanable.sessionsCount).toBe(100)
      expect(response.data.protected.adminsCount).toBe(2)
    })
  })

  describe('resetPlatformTestData', () => {
    test('rejects with 400 if confirmation text is incorrect or missing', async () => {
      const req = { user: adminUser, body: { confirmText: 'wrong text' } }
      const res = mockRes()

      await ctrl.resetPlatformTestData(req, res, jest.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(jsonOf(res).success).toBe(false)
      expect(jsonOf(res).message).toContain('تصفير ترتيلة')
      expect(User.deleteMany).not.toHaveBeenCalled()
    })

    test('successfully wipes students, teachers, sessions and leaves admins untouched on correct confirmation', async () => {
      User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: 'student_1', role: 'student' },
            { _id: 'teacher_1', role: 'teacher' },
          ]),
        }),
      })

      User.deleteMany.mockResolvedValue({ deletedCount: 2 })
      Session.deleteMany.mockResolvedValue({ deletedCount: 50 })
      ScheduleRule.deleteMany.mockResolvedValue({ deletedCount: 10 })
      Subscription.deleteMany.mockResolvedValue({ deletedCount: 5 })
      LessonWallet.deleteMany.mockResolvedValue({ deletedCount: 5 })

      const req = { user: adminUser, body: { confirmText: 'تصفير ترتيلة' }, ip: '127.0.0.1' }
      const res = mockRes()

      await ctrl.resetPlatformTestData(req, res, jest.fn())

      const response = jsonOf(res)
      expect(response.success).toBe(true)
      expect(User.deleteMany).toHaveBeenCalledWith({ role: { $in: ['student', 'teacher'] } })
      expect(Session.deleteMany).toHaveBeenCalled()
      expect(response.data.deletedUsersCount).toBe(2)
    })
  })

  describe('deleteTeacherPermanently', () => {
    test('returns 404 if teacher not found', async () => {
      User.findOne.mockResolvedValue(null)

      const req = { params: { id: 'invalid_teacher' }, user: adminUser }
      const res = mockRes()

      await ctrl.deleteTeacherPermanently(req, res, jest.fn())

      expect(res.status).toHaveBeenCalledWith(404)
      expect(jsonOf(res).message).toContain('غير موجود')
    })

    test('rejects if teacher has active students unless force=true', async () => {
      User.findOne.mockResolvedValue({ _id: 'teacher_1', role: 'teacher' })
      Subscription.countDocuments.mockResolvedValue(3) // 3 active students

      const req = { params: { id: 'teacher_1' }, query: {}, user: adminUser }
      const res = mockRes()

      await ctrl.deleteTeacherPermanently(req, res, jest.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(jsonOf(res).message).toContain('لا يمكن حذف المعلم لوجود 3 طالب')
      expect(User.deleteOne).not.toHaveBeenCalled()
    })

    test('deletes teacher and working records if force=true or no active students', async () => {
      User.findOne.mockResolvedValue({ _id: 'teacher_1', role: 'teacher', firstNameAr: 'أحمد', lastNameAr: 'علي' })
      Subscription.countDocuments.mockResolvedValue(0)

      const req = { params: { id: 'teacher_1' }, query: {}, user: adminUser, ip: '127.0.0.1' }
      const res = mockRes()

      await ctrl.deleteTeacherPermanently(req, res, jest.fn())

      expect(TeacherWorkingHours.deleteMany).toHaveBeenCalledWith({ teacherId: 'teacher_1' })
      expect(ScheduleRule.deleteMany).toHaveBeenCalledWith({ teacherId: 'teacher_1' })
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'teacher_1' })
      expect(jsonOf(res).success).toBe(true)
    })
  })

  describe('deleteStudentPermanently', () => {
    test('returns 404 if student not found', async () => {
      User.findOne.mockResolvedValue(null)

      const req = { params: { id: 'invalid_student' }, user: adminUser }
      const res = mockRes()

      await ctrl.deleteStudentPermanently(req, res, jest.fn())

      expect(res.status).toHaveBeenCalledWith(404)
      expect(jsonOf(res).message).toContain('غير موجود')
    })

    test('permanently deletes student, wallet, subscriptions and sessions', async () => {
      User.findOne.mockResolvedValue({ _id: 'student_1', role: 'student', firstNameAr: 'عمر', lastNameAr: 'خالد' })

      const req = { params: { id: 'student_1' }, user: adminUser, ip: '127.0.0.1' }
      const res = mockRes()

      await ctrl.deleteStudentPermanently(req, res, jest.fn())

      expect(Subscription.deleteMany).toHaveBeenCalledWith({ studentId: 'student_1' })
      expect(LessonWallet.deleteMany).toHaveBeenCalledWith({ studentId: 'student_1' })
      expect(ScheduleRule.deleteMany).toHaveBeenCalledWith({ studentId: 'student_1' })
      expect(Session.deleteMany).toHaveBeenCalledWith({ studentId: 'student_1' })
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'student_1' })
      expect(jsonOf(res).success).toBe(true)
    })
  })
})
