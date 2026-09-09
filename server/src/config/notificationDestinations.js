// Centralized notification → destination/action metadata.
//
// This is the single source of truth every notification producer (a
// controller, service, or cron job) should validate its `actionUrl`
// against, and the single place new dynamic-id deep links get built. It
// exists so a renamed/removed frontend route can never silently ship a
// dead notification link again — see the 2026-08-31 dead-link audit
// (SESSION_HANDOFF.md) that found 3 such bugs the hard way, and the
// `/admin/transfers/batches/:id` dead link this file's validator caught.
//
// MUST be kept in sync with `client/src/config/constants.js`'s `ROUTES`
// object — every pattern below corresponds to a real registered route
// there. When you add a route that a notification should ever deep-link
// to, add its shape here too.

// Static (parameter-free) internal destinations, one row per real route.
const STATIC_PATHS = new Set([
  '/student', '/student/schedule', '/student/sessions', '/student/homework',
  '/student/evaluations', '/student/progress', '/student/academic-record',
  '/student/subscription', '/student/enrollment', '/student/notifications',
  '/student/settings', '/student/quran-reports',

  '/teacher', '/teacher/students', '/teacher/sessions', '/teacher/attendance',
  '/teacher/evaluations', '/teacher/homework', '/teacher/progress',
  '/teacher/meeting-links', '/teacher/performance', '/teacher/payroll',
  '/teacher/monthly-reports', '/teacher/notifications', '/teacher/settings',
  '/teacher/assignment-requests',

  '/admin', '/admin/students', '/admin/teachers', '/admin/teachers/onboarding',
  '/admin/admins', '/admin/courses', '/admin/levels', '/admin/sessions',
  '/admin/schedule-rules', '/admin/packages', '/admin/subscriptions',
  '/admin/enrollments', '/admin/website', '/admin/reports', '/admin/notifications',
  '/admin/audit-logs', '/admin/settings', '/admin/articles', '/admin/contact-messages',
  '/admin/success-stories', '/admin/teacher-performance', '/admin/operations',
  '/admin/assignment-requests', '/admin/teachers/replace', '/admin/payroll',
  '/admin/subscriptions/renewals', '/admin/quran-reports', '/admin/monthly-reports',
  '/admin/surveys',
])

// Dynamic (":id"-style) destinations — one regex per real parameterized route.
const DYNAMIC_PATTERNS = [
  /^\/teacher\/students\/[^/]+$/,
  /^\/teacher\/payroll\/[^/]+$/,
  /^\/teacher\/quran-reports\/[^/]+$/,
  /^\/teacher\/assignment-requests\/[^/]+$/,
  /^\/admin\/students\/[^/]+$/,
  /^\/admin\/teachers\/[^/]+$/,
  /^\/admin\/courses\/[^/]+\/edit$/,
  /^\/admin\/articles\/[^/]+\/edit$/,
  /^\/admin\/assignment-requests\/[^/]+$/,
  /^\/admin\/teachers\/replace\/[^/]+$/,
  /^\/admin\/payroll\/[^/]+$/,
]

// Named builders for dynamic destinations — optional convenience for
// producers that need an id-based deep link. Using these instead of hand
// building the string is the best way to avoid a future drift bug like the
// one this file's validator caught (`/admin/transfers/batches/:id`, which
// was never a real route — the real one is `/admin/teachers/replace/:id`).
const buildActionUrl = {
  teacherStudentDetail: (studentId) => `/teacher/students/${studentId}`,
  teacherPayrollPeriod: (periodId) => `/teacher/payroll/${periodId}`,
  teacherQuranReport: (sessionId) => `/teacher/quran-reports/${sessionId}`,
  teacherAssignmentRequest: (id) => `/teacher/assignment-requests/${id}`,
  adminStudentDetail: (studentId) => `/admin/students/${studentId}`,
  adminTeacherProfile: (teacherId) => `/admin/teachers/${teacherId}`,
  adminAssignmentRequest: (id) => `/admin/assignment-requests/${id}`,
  adminTeacherReplacementBatch: (batchId) => `/admin/teachers/replace/${batchId}`,
  adminPayrollPeriod: (periodId) => `/admin/payroll/${periodId}`,
}

// A notification's `type` is a coarse category (shared with the frontend's
// filter tabs); `entityType` is a finer, human-readable label identifying
// *what* the linked record actually is, independent of who receives the
// notification. Used as a safe default when a producer doesn't pass one
// explicitly — kept purely additive so older stored notifications without
// an `entityType` remain valid (the frontend already falls back to `type`).
const DEFAULT_ENTITY_TYPE_BY_NOTIFICATION_TYPE = {
  session: 'Session',
  homework: 'Homework',
  evaluation: 'Evaluation',
  subscription: 'Subscription',
  enrollment: 'EnrollmentRequest',
  payment: 'LessonWallet',
  schedule: 'ScheduleRule',
  attendance: 'Session',
  assignment: 'AssignmentRequest',
  payroll: 'TeacherPayrollPeriod',
  renewal: 'SubscriptionRenewalRequest',
  report: 'Report',
  survey: 'Survey',
  system: 'System',
}

/**
 * Validates that a stored/about-to-be-stored `actionUrl` is a known,
 * same-origin, client-routable internal path — never an arbitrary external
 * URL or a client-controlled redirect. Rejects anything that isn't an exact
 * match (static) or shape match (dynamic) against the registry above, so a
 * typo'd or since-renamed route is caught at write time instead of shipping
 * a dead link, and nothing resembling `http://`, `//evil.com`, `javascript:`
 * etc. can ever be persisted as a notification destination.
 */
function isSafeInternalActionUrl(url) {
  if (typeof url !== 'string' || !url) return false
  // Must be a single-leading-slash relative path — blocks protocol-relative
  // ("//host/..."), absolute ("http://..."), and scheme ("javascript:...") URLs.
  if (!url.startsWith('/') || url.startsWith('//')) return false
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return false
  // Strip a query string (e.g. "?action=add") before matching the route shape.
  const path = url.split('?')[0].split('#')[0]
  if (STATIC_PATHS.has(path)) return true
  return DYNAMIC_PATTERNS.some((re) => re.test(path))
}

module.exports = {
  isSafeInternalActionUrl,
  buildActionUrl,
  DEFAULT_ENTITY_TYPE_BY_NOTIFICATION_TYPE,
}
