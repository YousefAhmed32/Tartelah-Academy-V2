jest.mock('../../models/Session')
jest.mock('../../models/Attendance')
jest.mock('../../services/notification.service')
jest.mock('../../services/audit.service')
jest.mock('../../services/booking.service')
jest.mock('../../services/academySettings.service', () => ({
  getAcademyTimezone: jest.fn().mockResolvedValue('Africa/Cairo'),
}))

const Session = require('../../models/Session')
const Attendance = require('../../models/Attendance')
const bookingService = require('../../services/booking.service')
const { createNotification } = require('../../services/notification.service')
const ctrl = require('../session.controller')

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() }
}
function jsonOf(res) { return res.json.mock.calls[0][0] }

// Real (unmocked) attendancePolicy.js is exactly what's under test here —
// startSession must reject a check-in more than PRE_SESSION_ACCESS_MINUTES
// (60) before the scheduled start, on the BACKEND, not just hide the
// button on the frontend. See docs/SESSION_LIFECYCLE_GUIDE_AR.md §3.
describe('session.controller.startSession — check-in window enforcement', () => {
  const teacherId = 'teacher1'
  const teacher = { _id: teacherId, role: 'teacher' }
  const admin = { _id: 'admin1', role: 'admin' }

  function buildSession({ scheduledAt, durationMinutes = 60, status = 'scheduled' }) {
    return {
      _id: 'session1',
      teacherId,
      status,
      scheduledAt,
      durationMinutes,
      save: jest.fn().mockResolvedValue(true),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('rejects a teacher check-in far in the future with a 400 and no state change', async () => {
    const farFuture = new Date(Date.now() + 5 * 60 * 60 * 1000) // 5 hours from now
    const session = buildSession({ scheduledAt: farFuture })
    Session.findById.mockResolvedValue(session)

    const req = { params: { id: 'session1' }, user: teacher }
    const res = mockRes()
    await ctrl.startSession(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(jsonOf(res).success).toBe(false)
    expect(jsonOf(res).earliestCheckInAt).toBeInstanceOf(Date)
    expect(session.status).toBe('scheduled') // never flipped to 'ongoing'
    expect(session.save).not.toHaveBeenCalled()
  })

  test('allows check-in once inside the 60-minute pre-session window', async () => {
    const soon = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
    const session = buildSession({ scheduledAt: soon })
    Session.findById.mockResolvedValue(session)

    const req = { params: { id: 'session1' }, user: teacher }
    const res = mockRes()
    await ctrl.startSession(req, res, jest.fn())

    expect(session.status).toBe('ongoing')
    expect(session.save).toHaveBeenCalled()
    expect(jsonOf(res).success).toBe(true)
  })

  test('allows a scheduled-time-passed (already actionable) check-in', async () => {
    const past = new Date(Date.now() - 10 * 60 * 1000)
    const session = buildSession({ scheduledAt: past })
    Session.findById.mockResolvedValue(session)

    const req = { params: { id: 'session1' }, user: teacher }
    const res = mockRes()
    await ctrl.startSession(req, res, jest.fn())

    expect(session.status).toBe('ongoing')
    expect(jsonOf(res).success).toBe(true)
  })

  test('an admin is exempt from the pre-session window (legitimate correction path)', async () => {
    const farFuture = new Date(Date.now() + 5 * 60 * 60 * 1000)
    const session = buildSession({ scheduledAt: farFuture })
    Session.findById.mockResolvedValue(session)

    const req = { params: { id: 'session1' }, user: admin }
    const res = mockRes()
    await ctrl.startSession(req, res, jest.fn())

    expect(session.status).toBe('ongoing')
    expect(jsonOf(res).success).toBe(true)
  })
})

describe('session.controller.finishSession — postponement and rescheduling workflow', () => {
  const teacherId = 'teacher1'
  const studentId = 'student1'
  const teacher = { _id: teacherId, role: 'teacher' }

  function buildSessionForFinish(status = 'ongoing') {
    return {
      _id: 'session1',
      teacherId,
      studentId,
      courseId: 'course1',
      seriesId: 'series1',
      subscriptionId: 'sub1',
      durationMinutes: 60,
      titleAr: 'حفظ ومراجعة',
      title: 'Hifz Session',
      meetingLink: 'https://zoom.us/j/123456',
      meetingProvider: 'zoom',
      scheduledAt: new Date(Date.now() - 45 * 60 * 1000),
      status,
      subscriptionConsumed: false,
      save: jest.fn().mockResolvedValue(true),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    bookingService.assertNoConflict.mockResolvedValue(true)
    Attendance.findOneAndUpdate.mockResolvedValue({ _id: 'att1' })
    Session.create.mockImplementation((data) => Promise.resolve({ _id: 'new_rescheduled_id', ...data }))
    createNotification.mockResolvedValue(true)
  })

  test('rejects postponement if next scheduled date is missing', async () => {
    const session = buildSessionForFinish()
    Session.findById.mockResolvedValue(session)

    const req = {
      params: { id: 'session1' },
      user: teacher,
      body: { attendanceStatus: 'postponed' },
    }
    const res = mockRes()
    await ctrl.finishSession(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(jsonOf(res).message).toContain('يجب تحديد الموعد القادم')
  })

  test('rejects postponement with 409 when slot conflict occurs', async () => {
    const session = buildSessionForFinish()
    Session.findById.mockResolvedValue(session)
    bookingService.assertNoConflict.mockRejectedValue(new Error('المعلم لديه حصة أخرى في هذا التوقيت'))

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const req = {
      params: { id: 'session1' },
      user: teacher,
      body: {
        attendanceStatus: 'postponed',
        newScheduledAt: futureDate,
        postponeReason: 'ظرف طارئ للطالب',
      },
    }
    const res = mockRes()
    await ctrl.finishSession(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(jsonOf(res).message).toContain('المعلم لديه حصة أخرى في هذا التوقيت')
    expect(session.save).not.toHaveBeenCalled()
  })

  test('successfully reschedules with zero wallet deduction and not_payable payroll until completed', async () => {
    const session = buildSessionForFinish()
    Session.findById.mockResolvedValue(session)

    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const req = {
      params: { id: 'session1' },
      user: teacher,
      body: {
        attendanceStatus: 'postponed',
        newScheduledAt: futureDate,
        postponeReason: 'اعتذار مسبق وتأجيل',
        teacherNotes: 'ملاحظة المعلم',
      },
    }
    const res = mockRes()
    await ctrl.finishSession(req, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(200)
    const json = jsonOf(res)
    expect(json.success).toBe(true)

    // Original session assertions
    expect(session.status).toBe('rescheduled')
    expect(session.payrollStatus).toBe('not_payable')
    expect(session.subscriptionConsumed).toBe(false)
    expect(session.postponedTo).toBe('new_rescheduled_id')
    expect(session.save).toHaveBeenCalled()

    // New session creation assertions
    expect(Session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId,
        teacherId,
        isPostponed: true,
        status: 'scheduled',
        subscriptionConsumed: false,
        payrollStatus: 'pending',
      })
    )
  })
})

describe('session.controller — admin schedule changes notify both parties', () => {
  const admin = { _id: 'admin1', role: 'admin' }

  function buildScheduledSession() {
    return {
      _id: 'session1',
      teacherId: 'teacher1',
      studentId: 'student1',
      titleAr: 'حصة محمد',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      durationMinutes: 60,
      status: 'scheduled',
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockImplementation(async function populate() { return this }),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    bookingService.assertNoConflict.mockResolvedValue(true)
    createNotification.mockResolvedValue(true)
  })

  test('admin postponement marks the session and notifies student and teacher', async () => {
    const session = buildScheduledSession()
    Session.findById.mockResolvedValue(session)
    const newDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const req = {
      params: { id: 'session1' }, user: admin, ip: '127.0.0.1',
      body: { newDate, changeType: 'postpone', reason: 'طلب ولي الأمر' },
    }
    const res = mockRes()

    await ctrl.rescheduleSession(req, res, jest.fn())

    expect(jsonOf(res).success).toBe(true)
    expect(session.isPostponed).toBe(true)
    expect(session.postponedReason).toBe('طلب ولي الأمر')
    expect(createNotification).toHaveBeenCalledTimes(2)
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'student1', actionUrl: '/student/sessions' }))
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'teacher1', actionUrl: '/teacher/sessions' }))
  })

  test('editing the appointment from admin notifies student and teacher', async () => {
    const session = buildScheduledSession()
    Session.findById.mockResolvedValue(session)
    const newDate = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    const req = {
      params: { id: 'session1' }, user: admin, ip: '127.0.0.1',
      body: { scheduledAt: newDate, durationMinutes: 45 },
    }
    const res = mockRes()

    await ctrl.adminUpdateSession(req, res, jest.fn())

    expect(jsonOf(res).success).toBe(true)
    expect(session.isException).toBe(true)
    expect(session.rescheduledFrom).toBeInstanceOf(Date)
    expect(createNotification).toHaveBeenCalledTimes(2)
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'student1' }))
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'teacher1' }))
  })
})
