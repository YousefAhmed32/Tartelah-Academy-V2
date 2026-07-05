const { classifyCheckIn, getSessionWindow, POLICY } = require('../../config/attendancePolicy')
const { computePayrollStatus, computeConfidence, assessSessionReview } = require('../sessionIntelligence.service')

describe('attendancePolicy.classifyCheckIn', () => {
  test('on-time check-in within tolerance', () => {
    const scheduled = new Date('2026-01-01T17:00:00Z')
    const checkIn = new Date('2026-01-01T17:07:00Z') // 7 min in, tolerance is 15
    const result = classifyCheckIn(scheduled, checkIn)
    expect(result.status).toBe('on_time')
    expect(result.lateMinutes).toBe(7)
  })

  test('late check-in past tolerance', () => {
    const scheduled = new Date('2026-01-01T17:00:00Z')
    const checkIn = new Date('2026-01-01T17:25:00Z')
    const result = classifyCheckIn(scheduled, checkIn)
    expect(result.status).toBe('late')
    expect(result.lateMinutes).toBe(25)
  })

  test('check-in before scheduled time never yields negative lateness', () => {
    const scheduled = new Date('2026-01-01T17:00:00Z')
    const checkIn = new Date('2026-01-01T16:50:00Z')
    const result = classifyCheckIn(scheduled, checkIn)
    expect(result.status).toBe('on_time')
    expect(result.lateMinutes).toBe(0)
  })
})

describe('attendancePolicy.getSessionWindow', () => {
  const scheduledAt = new Date('2026-01-01T17:00:00Z')

  test('upcoming before pre-session window opens', () => {
    const now = new Date('2026-01-01T15:30:00Z') // 90 min before start
    const w = getSessionWindow(scheduledAt, 60, now)
    expect(w.phase).toBe('upcoming')
    expect(w.isActionable).toBe(false)
  })

  test('pre_session once inside the access window', () => {
    const now = new Date('2026-01-01T16:30:00Z') // 30 min before start
    const w = getSessionWindow(scheduledAt, 60, now)
    expect(w.phase).toBe('pre_session')
    expect(w.isActionable).toBe(true)
  })

  test('in_progress during the scheduled slot', () => {
    const now = new Date('2026-01-01T17:30:00Z')
    const w = getSessionWindow(scheduledAt, 60, now)
    expect(w.phase).toBe('in_progress')
  })

  test('grace_period shortly after scheduled end, not flagged late-completion', () => {
    const now = new Date('2026-01-01T18:30:00Z') // 30 min after end (end=18:00)
    const w = getSessionWindow(scheduledAt, 60, now)
    expect(w.phase).toBe('grace_period')
    expect(w.isLateCompletion).toBe(false)
  })

  test('extended_completion is still actionable and marked as late completion', () => {
    const now = new Date('2026-01-01T20:30:00Z') // 2.5h after end
    const w = getSessionWindow(scheduledAt, 60, now)
    expect(w.phase).toBe('extended_completion')
    expect(w.isActionable).toBe(true)
    expect(w.isLateCompletion).toBe(true)
  })

  test('overdue well past every window', () => {
    const now = new Date('2026-01-02T18:00:00Z') // 24h after end
    const w = getSessionWindow(scheduledAt, 60, now)
    expect(w.phase).toBe('overdue')
  })
})

describe('sessionIntelligence.computePayrollStatus', () => {
  test('cancelled sessions are excluded regardless of teacher status', () => {
    const result = computePayrollStatus({ status: 'cancelled', outcome: 'cancelled_by_teacher', teacherAttendanceStatus: 'on_time' })
    expect(result.payrollStatus).toBe('excluded')
  })

  test('unresolved (still scheduled) sessions are pending, not payable', () => {
    const result = computePayrollStatus({ status: 'scheduled', outcome: 'pending_review', teacherAttendanceStatus: 'pending' })
    expect(result.payrollStatus).toBe('pending')
  })

  test('completed + on_time is payable', () => {
    const result = computePayrollStatus({ status: 'completed', outcome: 'delivered', teacherAttendanceStatus: 'on_time' })
    expect(result.payrollStatus).toBe('payable')
  })

  test('completed + late is still payable', () => {
    const result = computePayrollStatus({ status: 'completed', outcome: 'delivered', teacherAttendanceStatus: 'late' })
    expect(result.payrollStatus).toBe('payable')
  })

  test('no_show + absent is non_payable', () => {
    const result = computePayrollStatus({ status: 'no_show', outcome: 'teacher_absent', teacherAttendanceStatus: 'absent' })
    expect(result.payrollStatus).toBe('non_payable')
  })

  test('teacher present but no student attended goes to pending_review, not auto-payable', () => {
    const result = computePayrollStatus({ status: 'completed', outcome: 'no_students_attended', teacherAttendanceStatus: 'on_time' })
    expect(result.payrollStatus).toBe('pending_review')
  })

  test('technical issue always requires admin review', () => {
    const result = computePayrollStatus({ status: 'completed', outcome: 'technical_issue', teacherAttendanceStatus: 'on_time' })
    expect(result.payrollStatus).toBe('pending_review')
  })

  test('excused teacher absence requires admin review, not auto non_payable', () => {
    const result = computePayrollStatus({ status: 'no_show', outcome: 'pending_review', teacherAttendanceStatus: 'excused' })
    expect(result.payrollStatus).toBe('pending_review')
  })
})

describe('sessionIntelligence.computeConfidence', () => {
  test('fully resolved, finalized, on-time session scores high confidence', () => {
    const session = {
      teacherAttendanceStatus: 'on_time',
      meetingLink: 'https://zoom.us/j/123',
      teacherLinkOpenedAt: new Date(),
      outcome: 'delivered',
    }
    const attendance = { isFinalized: true }
    const result = computeConfidence(session, attendance)
    expect(result.level).toBe('high')
  })

  test('session with no check-in, no link, no attendance needs review', () => {
    const session = { teacherAttendanceStatus: 'pending', meetingLink: '', outcome: 'pending_review' }
    const result = computeConfidence(session, null)
    expect(result.level).toBe('needs_review')
    expect(result.reasons.length).toBeGreaterThan(0)
  })
})

describe('sessionIntelligence.assessSessionReview — Needs Review queue engine', () => {
  const NOW = new Date('2026-01-01T20:00:00Z') // fixed "now" for every window-phase-dependent case below

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  test('a fully clean, finalized, on-time completed session has no review flags', () => {
    const session = {
      status: 'completed', outcome: 'delivered', teacherAttendanceStatus: 'on_time', teacherLateMinutes: 0,
      scheduledAt: new Date('2026-01-01T10:00:00Z'), durationMinutes: 60,
      meetingLink: 'https://zoom.us/j/1', payrollStatus: 'payable',
      attendanceFinalizedAt: new Date('2026-01-01T11:05:00Z'),
    }
    expect(assessSessionReview(session)).toBeNull()
  })

  test('missing check-in long after scheduled time is flagged high', () => {
    const session = {
      status: 'scheduled', outcome: 'pending_review', teacherAttendanceStatus: 'pending',
      scheduledAt: new Date('2026-01-01T10:00:00Z'), durationMinutes: 60, // ended hours ago, still "scheduled"
      meetingLink: 'https://zoom.us/j/1', payrollStatus: 'pending',
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('high')
    expect(result.reasons.some(r => r.code === 'missing_checkin')).toBe(true)
  })

  test('status missed is flagged high as unresolved', () => {
    const session = {
      status: 'missed', outcome: 'pending_review', teacherAttendanceStatus: 'pending',
      scheduledAt: new Date('2026-01-01T10:00:00Z'), durationMinutes: 60, payrollStatus: 'pending',
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('high')
    expect(result.reasons.some(r => r.code === 'missed_unresolved')).toBe(true)
  })

  test('significant lateness (>30min) is flagged medium', () => {
    const session = {
      status: 'completed', outcome: 'delivered', teacherAttendanceStatus: 'late', teacherLateMinutes: 45,
      scheduledAt: new Date('2026-01-01T18:00:00Z'), durationMinutes: 60,
      attendanceFinalizedAt: new Date('2026-01-01T19:10:00Z'), payrollStatus: 'payable',
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('medium')
    expect(result.reasons.some(r => r.code === 'significant_lateness')).toBe(true)
  })

  test('ordinary lateness under the threshold is not flagged', () => {
    const session = {
      status: 'completed', outcome: 'delivered', teacherAttendanceStatus: 'late', teacherLateMinutes: 20,
      scheduledAt: new Date('2026-01-01T18:00:00Z'), durationMinutes: 60,
      attendanceFinalizedAt: new Date('2026-01-01T19:05:00Z'), payrollStatus: 'payable',
      meetingLink: 'https://zoom.us/j/1',
    }
    expect(assessSessionReview(session)).toBeNull()
  })

  test('completed session with no finalized attendance is flagged high', () => {
    const session = {
      status: 'completed', outcome: 'delivered', teacherAttendanceStatus: 'on_time',
      scheduledAt: new Date('2026-01-01T18:00:00Z'), durationMinutes: 60, payrollStatus: 'payable',
      attendanceFinalizedAt: null,
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('high')
    expect(result.reasons.some(r => r.code === 'delivered_no_attendance')).toBe(true)
  })

  test('using the explicit attendance param (not just the Session-level mirror field)', () => {
    const session = {
      status: 'completed', outcome: 'delivered', teacherAttendanceStatus: 'on_time',
      scheduledAt: new Date('2026-01-01T18:00:00Z'), durationMinutes: 60, payrollStatus: 'payable',
    }
    const flaggedWithoutAttendance = assessSessionReview(session, null)
    expect(flaggedWithoutAttendance.reasons.some(r => r.code === 'delivered_no_attendance')).toBe(true)

    const clearWithFinalizedAttendance = assessSessionReview(session, { isFinalized: true, finalizedAt: new Date('2026-01-01T19:05:00Z') })
    expect(clearWithFinalizedAttendance).toBeNull()
  })

  test('payroll pending_review is always surfaced with its own reason', () => {
    const session = {
      status: 'completed', outcome: 'no_students_attended', teacherAttendanceStatus: 'on_time',
      scheduledAt: new Date('2026-01-01T18:00:00Z'), durationMinutes: 60,
      payrollStatus: 'pending_review', payrollStatusReason: 'حضر المعلم لكن لم يحضر الطالب — يحتاج قرار الإدارة',
      attendanceFinalizedAt: new Date('2026-01-01T19:05:00Z'),
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('high')
    const reason = result.reasons.find(r => r.code === 'payroll_pending_review')
    expect(reason.label).toBe(session.payrollStatusReason)
  })

  test('attendance finalized long after the extended window closed is flagged medium', () => {
    const session = {
      status: 'completed', outcome: 'delivered', teacherAttendanceStatus: 'on_time',
      scheduledAt: new Date('2026-01-01T10:00:00Z'), durationMinutes: 60, payrollStatus: 'payable',
      // scheduled end 11:00 + grace(60) + extended(180) = 15:00 cutoff; finalized at 19:00 is well past it
      attendanceFinalizedAt: new Date('2026-01-01T19:00:00Z'),
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('medium')
    expect(result.reasons.some(r => r.code === 'late_finalization')).toBe(true)
  })

  test('missing meeting link close to session time is flagged medium', () => {
    const session = {
      status: 'scheduled', outcome: 'pending_review', teacherAttendanceStatus: 'pending',
      scheduledAt: new Date('2026-01-01T19:45:00Z'), durationMinutes: 60, // in_progress at NOW=20:00
      meetingLink: '', payrollStatus: 'pending',
    }
    const result = assessSessionReview(session)
    expect(result.reasons.some(r => r.code === 'missing_meeting_link')).toBe(true)
  })

  test('contradiction: cancelled session still marked payable is flagged critical', () => {
    const session = {
      status: 'cancelled', outcome: 'cancelled_by_teacher', teacherAttendanceStatus: 'pending',
      scheduledAt: new Date('2026-01-01T10:00:00Z'), durationMinutes: 60, payrollStatus: 'payable',
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('critical')
    expect(result.reasons.some(r => r.code === 'cancelled_but_payable')).toBe(true)
  })

  test('contradiction: no_show status without a matching absent attendance status is flagged critical', () => {
    const session = {
      status: 'no_show', outcome: 'teacher_absent', teacherAttendanceStatus: 'on_time',
      scheduledAt: new Date('2026-01-01T10:00:00Z'), durationMinutes: 60, payrollStatus: 'non_payable',
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('critical')
    expect(result.reasons.some(r => r.code === 'no_show_status_mismatch')).toBe(true)
  })

  test('contradiction: outcome delivered while status never reached completed is flagged critical', () => {
    const session = {
      status: 'scheduled', outcome: 'delivered', teacherAttendanceStatus: 'on_time',
      scheduledAt: new Date('2026-01-01T10:00:00Z'), durationMinutes: 60, payrollStatus: 'pending',
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('critical')
    expect(result.reasons.some(r => r.code === 'outcome_status_mismatch')).toBe(true)
  })

  test('multiple simultaneous issues escalate to the single worst severity, listing every reason', () => {
    const session = {
      // critical (outcome/status mismatch) + high (no finalized attendance) + medium (missing link) all at once
      status: 'scheduled', outcome: 'delivered', teacherAttendanceStatus: 'pending',
      scheduledAt: new Date('2026-01-01T10:00:00Z'), durationMinutes: 60,
      meetingLink: '', payrollStatus: 'pending',
    }
    const result = assessSessionReview(session)
    expect(result.severity).toBe('critical')
    expect(result.reasons.length).toBeGreaterThan(1)
  })
})
