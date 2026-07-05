// Deterministic, transparent rules for two things the platform can compute
// but must never fabricate:
//   1. "confidence" — how much operational evidence backs a session's record
//      (NOT proof of external-meeting attendance — see comments below).
//   2. "payroll status" — whether a session's evidence is currently strong
//      enough to treat as payable, pending admin's own judgement call on the
//      one open policy question (does student absence affect teacher pay).
//
// Every signal used here is something the platform actually observed
// (a click, a timestamp, a teacher-entered status) — never an inference
// about what happened inside Zoom/Meet/Teams.

const { POLICY, getSessionWindow } = require('../config/attendancePolicy')

const RESOLVED_SESSION_STATUSES = ['completed', 'no_show', 'missed']
const PAYABLE_CHECKIN_STATUSES = ['on_time', 'late']

/**
 * Deterministic confidence rating for a session's record, for admin
 * prioritization only — never displayed as "verified attendance."
 * Returns { level: 'high'|'medium'|'needs_review', score: number, reasons: string[] }
 */
function computeConfidence(session, attendance) {
  const reasons = []
  let score = 0

  if (session.teacherAttendanceStatus === 'on_time') { score += 2; reasons.push('تسجيل دخول المعلم في الموعد') }
  else if (session.teacherAttendanceStatus === 'late') { score += 1; reasons.push('تسجيل دخول المعلم متأخراً') }
  else if (session.teacherAttendanceStatus === 'absent') { reasons.push('لم يسجّل المعلم حضوره') }

  if (session.meetingLink) { score += 1 } else { reasons.push('لا يوجد رابط اجتماع مسجَّل لهذه الحصة') }

  if (session.teacherLinkOpenedAt) { score += 1; reasons.push('فتح المعلم رابط الاجتماع الخارجي') }

  if (attendance && attendance.isFinalized) { score += 2; reasons.push('تم اعتماد سجل الحضور') }
  else if (attendance) { score += 1 }
  else { reasons.push('لم يُسجَّل حضور الطالب بعد') }

  if (session.outcome && session.outcome !== 'pending_review') { score += 1 }
  else { reasons.push('لم يتم تأكيد نتيجة الحصة') }

  // Editing long after the fact is not inherently wrong (see attendancePolicy's
  // "soft windows" principle) but it is a legitimate reason to lower confidence
  // rather than raise a false alarm.
  if (session.attendanceFinalizedAt && session.completedAt) {
    const gapMinutes = Math.abs(new Date(session.attendanceFinalizedAt) - new Date(session.completedAt)) / 60000
    if (gapMinutes > POLICY.EXTENDED_COMPLETION_MINUTES) reasons.push('تم اعتماد الحضور بعد وقت طويل من الحصة')
  }

  let level = 'needs_review'
  if (score >= 6) level = 'high'
  else if (score >= 3) level = 'medium'

  return { level, score, reasons }
}

/**
 * Computes the DEFAULT automatic payroll status for a session, purely from
 * evidence the system actually has. Admin can always override the stored
 * field afterward — the override is tracked via `payrollStatusSetBy: 'admin'`
 * (not a separate enum value, see models/Session.js), and this function is
 * never re-applied against a session once that flag is set (see
 * session.controller.js's applySystemPayrollStatus).
 *
 * Current default policy (see docs/PLATFORM_FLOW_AND_TEACHER_ATTENDANCE_PLAN.md
 * §37 and docs/INTELLIGENT_ATTENDANCE_SYSTEM.md): teacher payability depends
 * on the TEACHER's own check-in/outcome evidence. Student attendance is
 * surfaced for admin visibility but does not automatically flip payability —
 * that is an open business decision, not something this function should
 * decide silently.
 */
function computePayrollStatus(session) {
  const cancelledOutcomes = ['cancelled_by_teacher', 'cancelled_by_admin', 'cancelled_by_student', 'rescheduled']
  if (['cancelled', 'rescheduled'].includes(session.status) || cancelledOutcomes.includes(session.outcome)) {
    return { payrollStatus: 'excluded', reason: 'الحصة ملغاة أو معاد جدولتها' }
  }

  if (!RESOLVED_SESSION_STATUSES.includes(session.status)) {
    return { payrollStatus: 'pending', reason: 'الحصة لم تُحسم بعد' }
  }

  if (session.outcome === 'technical_issue') {
    return { payrollStatus: 'pending_review', reason: 'تم الإبلاغ عن مشكلة تقنية — يحتاج مراجعة الإدارة' }
  }

  if (PAYABLE_CHECKIN_STATUSES.includes(session.teacherAttendanceStatus)) {
    if (session.outcome === 'no_students_attended') {
      return { payrollStatus: 'pending_review', reason: 'حضر المعلم لكن لم يحضر الطالب — يحتاج قرار الإدارة' }
    }
    return { payrollStatus: 'payable', reason: 'حضر المعلم في الوقت المحدد أو متأخراً وأكمل الحصة' }
  }

  if (session.teacherAttendanceStatus === 'excused') {
    return { payrollStatus: 'pending_review', reason: 'غياب المعلم معذور — يحتاج قرار الإدارة' }
  }

  return { payrollStatus: 'non_payable', reason: 'المعلم لم يحضر الحصة' }
}

const SIGNIFICANT_LATE_MINUTES = 30 // beyond ordinary lateness — worth a human glance, not just a badge

// Severity ranking used to pick the single worst offender when a session
// trips more than one rule at once.
const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 }

function higherSeverity(a, b) {
  if (!a) return b
  if (!b) return a
  return SEVERITY_RANK[b] > SEVERITY_RANK[a] ? b : a
}

/**
 * Needs-Review assessment — the deterministic engine behind the Admin
 * Operations Center's review queue (Phase 4/5/6 of the continuation brief).
 *
 * Every reason returned is a plain, checkable fact about data the platform
 * actually recorded (a timestamp comparison, a field mismatch) — never a
 * claim about what really happened in the external meeting. This is the
 * single source of truth for "does this session need a human to look at
 * it, how urgently, and why" — used identically by the review queue list
 * and any per-session drill-down.
 *
 * `attendance` is optional: when omitted (the bulk/queue path, to avoid an
 * N+1 join per session), the function falls back to the Session-level
 * `attendanceFinalizedAt`/`attendanceFinalizedBy` mirror fields that
 * `attendance.controller.js` already keeps in sync whenever attendance is
 * finalized — so review quality does not depend on the extra query.
 *
 * Returns null when the session has no actionable issue at all (the common
 * case — most sessions should never appear in the queue).
 * Otherwise returns { severity: 'critical'|'high'|'medium'|'low', reasons: [{code, label}] }.
 */
function assessSessionReview(session, attendance = null) {
  const reasons = []
  let severity = null
  const flag = (code, label, sev) => { reasons.push({ code, label }); severity = higherSeverity(severity, sev) }

  const now = new Date()
  const window = getSessionWindow(session.scheduledAt, session.durationMinutes || 60, now)
  const isFinalized = attendance ? !!attendance.isFinalized : !!session.attendanceFinalizedAt

  // ── Contradictions (critical — the data disagrees with itself) ──────────
  if (['cancelled', 'rescheduled'].includes(session.status) && session.payrollStatus === 'payable') {
    flag('cancelled_but_payable', 'الحصة ملغاة أو معاد جدولتها لكنها مُصنّفة كمستحقة للدفع', 'critical')
  }
  if (session.status === 'no_show' && session.teacherAttendanceStatus !== 'absent') {
    flag('no_show_status_mismatch', 'الحصة مسجّلة كغياب لكن حالة حضور المعلم لا تعكس ذلك', 'critical')
  }
  if (session.outcome === 'delivered' && session.status !== 'completed') {
    flag('outcome_status_mismatch', 'نتيجة الحصة "مكتملة" لكن حالة الحصة لا تعكس ذلك', 'critical')
  }

  // ── Unresolved / missing evidence (high — directly blocks a payroll decision) ──
  if (session.status === 'missed') {
    flag('missed_unresolved', 'الحصة تجاوزت موعدها بوقت طويل بدون أي إجراء من المعلم', 'high')
  }
  if (session.status === 'scheduled' && session.teacherAttendanceStatus === 'pending' &&
      ['grace_period', 'extended_completion', 'overdue'].includes(window.phase)) {
    flag('missing_checkin', 'لم يسجّل المعلم حضوره رغم تجاوز موعد الحصة', 'high')
  }
  if (session.status === 'completed' && !isFinalized) {
    flag('delivered_no_attendance', 'الحصة مكتملة لكن لم يُعتمد حضور الطالب نهائياً بعد', 'high')
  }
  if (session.payrollStatus === 'pending_review') {
    flag('payroll_pending_review', session.payrollStatusReason || 'حالة الاستحقاق المالي بانتظار قرار الإدارة', 'high')
  }

  // ── Notable but not blocking (medium) ────────────────────────────────────
  if (session.teacherAttendanceStatus === 'late' && (session.teacherLateMinutes || 0) > SIGNIFICANT_LATE_MINUTES) {
    flag('significant_lateness', `تأخر المعلم ${session.teacherLateMinutes} دقيقة عن الموعد المحدد`, 'medium')
  }
  if (isFinalized) {
    const finalizedAt = attendance ? attendance.finalizedAt : session.attendanceFinalizedAt
    if (finalizedAt) {
      const gapMinutes = (new Date(finalizedAt).getTime() - window.scheduledEnd.getTime()) / 60000
      if (gapMinutes > POLICY.POST_SESSION_GRACE_MINUTES + POLICY.EXTENDED_COMPLETION_MINUTES) {
        flag('late_finalization', 'تم اعتماد الحضور بعد وقت طويل من انتهاء الحصة', 'medium')
      }
    }
  }
  if (!session.meetingLink && ['pre_session', 'in_progress'].includes(window.phase)) {
    flag('missing_meeting_link', 'لا يوجد رابط اجتماع مسجّل رغم اقتراب أو حلول موعد الحصة', 'medium')
  }

  if (!reasons.length) return null
  return { severity, reasons }
}

module.exports = {
  computeConfidence, computePayrollStatus, assessSessionReview,
  RESOLVED_SESSION_STATUSES, PAYABLE_CHECKIN_STATUSES, SEVERITY_RANK,
}
