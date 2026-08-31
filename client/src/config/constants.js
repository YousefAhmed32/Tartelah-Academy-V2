export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
export const BACKEND_URL = API_URL.replace('/api/v1', '')
export const APP_NAME = 'ترتيلة أونلاين'
export const APP_NAME_EN = 'Tartelah Online'

// Image/file fields across the API now hold a bare MongoDB GridFS ObjectId
// (24 hex chars) rather than a disk path — every upload is stored in
// GridFS, never on local disk (see server/src/config/gridfs.js). This is the
// single place that turns either shape into a full URL, so every existing
// getFileUrl(course.thumbnailImage) call site across the app keeps working
// unchanged. A bare id always resolves through the unified media endpoint;
// changing BACKEND_URL (i.e. VITE_API_URL) is the only thing ever needed to
// point every already-stored id at a new domain — nothing in the database
// ever needs to change.
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

export function getFileUrl(value) {
  if (!value) return null
  const str = typeof value === 'string' ? value : String(value)
  if (str.startsWith('http')) return str
  if (OBJECT_ID_RE.test(str)) return `${BACKEND_URL}/api/v1/media/${str}`
  return `${BACKEND_URL}${str}` // legacy "/uploads/..." path, if any pre-migration value slips through
}

// Internal role identifiers — mirrors server/src/config/permissions.js ROLES.
// `role` on the user object IS the stable "systemRole"; never rename these
// values. No visible SUPER_ADMIN role — the original administrator instead
// carries `isPrimaryAdmin: true` while keeping role: 'admin'.
export const ROLES = {
  ADMIN: 'admin',
  ASSISTANT_ADMIN: 'assistant_admin',
  OPERATOR: 'operator',
  MANAGER: 'manager',
  STAFF: 'staff',
  TEACHER: 'teacher',
  STUDENT: 'student',
}

// Roles that live in the admin dashboard/staff hierarchy — distinct from
// TEACHER/STUDENT, which keep their own dedicated dashboards.
export const ADMIN_FAMILY_ROLES = [ROLES.ADMIN, ROLES.ASSISTANT_ADMIN, ROLES.OPERATOR, ROLES.MANAGER, ROLES.STAFF]

export const ROLE_DISPLAY_NAMES = {
  [ROLES.ADMIN]: 'مدير',
  [ROLES.ASSISTANT_ADMIN]: 'مساعد مدير',
  [ROLES.OPERATOR]: 'موظف عمليات',
  [ROLES.MANAGER]: 'مدير قسم',
  [ROLES.STAFF]: 'موظف',
  [ROLES.TEACHER]: 'معلم',
  [ROLES.STUDENT]: 'طالب',
}

// Mirrors server/src/config/permissions.js ALL_PERMISSIONS — kept in sync
// manually (small, stable list); the backend remains the source of truth
// and is re-fetched live via GET /permissions for the assignment UI.
export const PERMISSIONS = {
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DISABLE: 'users.disable',
  USERS_DELETE: 'users.delete',
  USERS_RESET_PASSWORD: 'users.reset_password',
  ADMINS_CREATE: 'admins.create',
  ADMINS_UPDATE: 'admins.update',
  ADMINS_DISABLE: 'admins.disable',
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_ASSIGN: 'permissions.assign',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  DASHBOARD_VIEW: 'dashboard.view',
  CONTENT_VIEW: 'content.view',
  CONTENT_CREATE: 'content.create',
  CONTENT_UPDATE: 'content.update',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',
  CONTENT_SCHEDULE: 'content.schedule',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',
  STUDENTS_VIEW: 'students.view',
  STUDENTS_MANAGE: 'students.manage',
  TEACHERS_VIEW: 'teachers.view',
  TEACHERS_MANAGE: 'teachers.manage',
  COURSES_VIEW: 'courses.view',
  COURSES_MANAGE: 'courses.manage',
  PACKAGES_VIEW: 'packages.view',
  PACKAGES_MANAGE: 'packages.manage',
  SESSIONS_VIEW: 'sessions.view',
  SESSIONS_MANAGE: 'sessions.manage',
  SCHEDULE_RULES_VIEW: 'scheduleRules.view',
  SCHEDULE_RULES_MANAGE: 'scheduleRules.manage',
  SUBSCRIPTIONS_VIEW: 'subscriptions.view',
  SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  AUDIT_VIEW: 'audit.view',
  REPORTS_VIEW: 'reports.view',
  OPERATIONS_VIEW: 'operations.view',
  ENROLLMENTS_VIEW: 'enrollments.view',
  ENROLLMENTS_MANAGE: 'enrollments.manage',
}

// Permission catalog grouped to mirror the actual admin Sidebar's IA (see
// AdminLayout.jsx's NAV_GROUPS) — single source of truth reused by both the
// nav's per-item `permission` tags and AdminAdminsPage.jsx's grouped
// permission selector, so the two can never drift into different taxonomies.
export const PERMISSION_GROUPS = [
  {
    key: 'platform', label: 'المنصة',
    permissions: ['dashboard.view', 'operations.view', 'enrollments.view', 'enrollments.manage'],
  },
  {
    key: 'accounts', label: 'إدارة المستخدمين',
    permissions: [
      'students.view', 'students.manage', 'teachers.view', 'teachers.manage',
      'users.view', 'users.create', 'users.update', 'users.disable', 'users.delete', 'users.reset_password',
      'admins.create', 'admins.update', 'admins.disable',
    ],
  },
  {
    key: 'academy', label: 'الأكاديمية',
    permissions: [
      'packages.view', 'packages.manage', 'courses.view', 'courses.manage',
      'sessions.view', 'sessions.manage', 'scheduleRules.view', 'scheduleRules.manage',
      'subscriptions.view', 'subscriptions.manage',
    ],
  },
  {
    key: 'content', label: 'المحتوى',
    permissions: ['content.view', 'content.create', 'content.update', 'content.delete', 'content.publish', 'content.schedule'],
  },
  {
    key: 'reports_system', label: 'التقارير والنظام',
    permissions: [
      'reports.view', 'notifications.view', 'notifications.manage', 'audit.view',
      'settings.view', 'settings.update',
    ],
  },
  {
    key: 'roles_permissions', label: 'الأدوار والصلاحيات',
    permissions: ['roles.view', 'roles.create', 'roles.update', 'roles.delete', 'permissions.view', 'permissions.assign'],
  },
]

export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  PROGRAMS: '/programs',
  TEACHERS: '/teachers',
  TEACHER_PROFILE: '/teachers/:id',
  PRICING: '/pricing',
  FAQ: '/faq',
  CONTACT: '/contact',

  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  STUDENT_DASHBOARD: '/student',
  STUDENT_SCHEDULE: '/student/schedule',
  STUDENT_SESSIONS: '/student/sessions',
  STUDENT_HOMEWORK: '/student/homework',
  STUDENT_EVALUATIONS: '/student/evaluations',
  STUDENT_PROGRESS: '/student/progress',
  STUDENT_ACADEMIC: '/student/academic-record',
  STUDENT_SUBSCRIPTION: '/student/subscription',
  STUDENT_ENROLLMENT: '/student/enrollment',
  STUDENT_NOTIFICATIONS: '/student/notifications',
  STUDENT_SETTINGS: '/student/settings',

  TEACHER_DASHBOARD: '/teacher',
  TEACHER_STUDENTS: '/teacher/students',
  TEACHER_SESSIONS: '/teacher/sessions',
  TEACHER_ATTENDANCE: '/teacher/attendance',
  TEACHER_EVALUATIONS: '/teacher/evaluations',
  TEACHER_HOMEWORK: '/teacher/homework',
  TEACHER_PROGRESS: '/teacher/progress',
  TEACHER_LINKS: '/teacher/meeting-links',
  TEACHER_PERFORMANCE: '/teacher/performance',
  TEACHER_NOTIFICATIONS: '/teacher/notifications',
  TEACHER_SETTINGS: '/teacher/settings',
  TEACHER_ASSIGNMENT_REQUESTS: '/teacher/assignment-requests',
  TEACHER_ASSIGNMENT_REQUEST_DETAIL: '/teacher/assignment-requests/:id',

  ADMIN_DASHBOARD: '/admin',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_STUDENT_DETAIL: '/admin/students/:id',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_TEACHER_ONBOARDING: '/admin/teachers/onboarding',
  ADMIN_TEACHER_PROFILE: '/admin/teachers/:id',
  ADMIN_ADMINS: '/admin/admins',
  ADMIN_COURSES: '/admin/courses',
  ADMIN_LEVELS: '/admin/levels',
  ADMIN_SESSIONS: '/admin/sessions',
  ADMIN_SCHEDULE_RULES: '/admin/schedule-rules',
  ADMIN_PACKAGES: '/admin/packages',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_ENROLLMENTS: '/admin/enrollments',
  ADMIN_WEBSITE: '/admin/website',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  ADMIN_SETTINGS: '/admin/settings',

  AI_ASSISTANT: '/ai',

  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:slug',

  ARTICLES: '/articles',
  ARTICLE_DETAIL: '/articles/:slug',
  ADMIN_ARTICLES: '/admin/articles',
  ADMIN_ARTICLE_NEW: '/admin/articles/new',
  ADMIN_ARTICLE_EDIT: '/admin/articles/:id/edit',

  ADMIN_COURSE_NEW: '/admin/courses/new',
  ADMIN_COURSE_EDIT: '/admin/courses/:id/edit',

  ADMIN_CONTACT_MESSAGES: '/admin/contact-messages',

  ADMIN_SUCCESS_STORIES: '/admin/success-stories',

  ADMIN_TEACHER_PERFORMANCE: '/admin/teacher-performance',

  ADMIN_OPERATIONS: '/admin/operations',

  ADMIN_ASSIGNMENT_REQUESTS: '/admin/assignment-requests',
  ADMIN_ASSIGNMENT_REQUEST_DETAIL: '/admin/assignment-requests/:id',
}

// Continuation link from the onboarding wizard's success page (and its
// refresh-fallback banner) straight into the existing "add student" flow on
// that teacher's own admin profile — reuses ADMIN_TEACHER_PROFILE's route
// shape via a query flag rather than inventing a duplicate page. Requires a
// real database teacherId; falls back to the teacher list if none is given
// (never a blank/invalid teacher route).
export function buildTeacherAddStudentUrl(teacherId) {
  if (!teacherId) return ROUTES.ADMIN_TEACHERS
  return `/admin/teachers/${teacherId}?action=add`
}

export const MEETING_PROVIDERS = {
  zoom: { label: 'Zoom', color: '#2D8CFF' },
  meet: { label: 'Google Meet', color: '#00897B' },
  teams: { label: 'Microsoft Teams', color: '#6264A7' },
  other: { label: 'رابط مخصص', color: '#7c3aed' },
  custom: { label: 'رابط مخصص', color: '#7c3aed' },
}

export const SESSION_STATUS_NO_SHOW = 'no_show'

export const SESSION_STATUS = {
  scheduled:   { label: 'مجدولة',    labelEn: 'Scheduled',   color: '#7c3aed', bg: 'rgba(124,58,237,0.15)' },
  ongoing:     { label: 'جارية',     labelEn: 'Ongoing',     color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  completed:   { label: 'مكتملة',   labelEn: 'Completed',   color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  cancelled:   { label: 'ملغاة',    labelEn: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  rescheduled: { label: 'معاد جدولتها', labelEn: 'Rescheduled', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  missed:      { label: 'فائتة',    labelEn: 'Missed',      color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
  no_show:     { label: 'لم يحضر',  labelEn: 'No Show',     color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
}

export const SCHEDULE_FREQUENCY = {
  weekly:   { label: 'أسبوعياً',       labelEn: 'Weekly' },
  biweekly: { label: 'كل أسبوعين',     labelEn: 'Biweekly' },
  daily:    { label: 'يومياً',          labelEn: 'Daily' },
  monthly:  { label: 'شهرياً',          labelEn: 'Monthly' },
  custom:   { label: 'مخصص',            labelEn: 'Custom' },
}

export const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد',   short: 'أح' },
  { value: 1, label: 'الاثنين', short: 'ثن' },
  { value: 2, label: 'الثلاثاء',short: 'ثل' },
  { value: 3, label: 'الأربعاء',short: 'أر' },
  { value: 4, label: 'الخميس', short: 'خم' },
  { value: 5, label: 'الجمعة', short: 'جم' },
  { value: 6, label: 'السبت',  short: 'سب' },
]

export const ATTENDANCE_STATUS = {
  present: { label: 'حاضر', color: '#22c55e' },
  absent: { label: 'غائب', color: '#ef4444' },
  late: { label: 'متأخر', color: '#f59e0b' },
  excused: { label: 'معذور', color: '#7c3aed' },
  left_early: { label: 'غادر مبكراً', color: '#0ea5e9' },
  technical_issue: { label: 'مشكلة تقنية', color: '#64748b' },
}

// Shared UI-ready derivation of ATTENDANCE_STATUS — used by both the Sessions
// page and the Finish Session modal (dashboard + sessions page) so the two
// never drift into slightly different option lists/colors.
export const ATT_OPTIONS = Object.entries(ATTENDANCE_STATUS).map(([value, { label, color }]) => ({
  value, label, color, bg: `${color}2e`,
}))

// Explicit session-outcome confirmation — distinct from the coarse
// scheduled/ongoing/completed/... status lifecycle in SESSION_STATUS.
export const SESSION_OUTCOME = {
  pending_review: { label: 'بانتظار التأكيد', color: '#9ca3af' },
  delivered: { label: 'تمت الحصة بنجاح', color: '#22c55e' },
  partially_delivered: { label: 'تمت جزئياً', color: '#f59e0b' },
  teacher_absent: { label: 'غياب المعلم', color: '#ef4444' },
  cancelled_by_teacher: { label: 'ألغاها المعلم', color: '#ef4444' },
  cancelled_by_admin: { label: 'ألغتها الإدارة', color: '#ef4444' },
  cancelled_by_student: { label: 'ألغاها الطالب', color: '#ef4444' },
  technical_issue: { label: 'مشكلة تقنية', color: '#64748b' },
  rescheduled: { label: 'أُعيدت جدولتها', color: '#f59e0b' },
  no_students_attended: { label: 'لم يحضر الطالب', color: '#f59e0b' },
}

// Payroll-readiness state for a session — system-computed by default,
// durable once an admin corrects it (see docs/INTELLIGENT_ATTENDANCE_SYSTEM.md).
export const PAYROLL_STATUS = {
  pending: { label: 'بانتظار الحسم', color: '#9ca3af' },
  payable: { label: 'مستحقة الدفع', color: '#22c55e' },
  non_payable: { label: 'غير مستحقة', color: '#ef4444' },
  pending_review: { label: 'تحتاج مراجعة الإدارة', color: '#f59e0b' },
  excluded: { label: 'مستبعدة', color: '#6b7280' },
}

export const DELAY_REASON = {
  teacher_delay: 'تأخر المعلم',
  student_delay: 'تأخر الطالب',
  technical_issue: 'مشكلة تقنية',
  previous_session_overrun: 'امتداد الحصة السابقة',
  mutual_agreement: 'اتفاق بين الطرفين',
  emergency: 'ظرف طارئ',
  other: 'سبب آخر',
}

// Mirrors server/src/config/attendancePolicy.js — display-only; the backend
// remains authoritative for every actual decision.
export const ATTENDANCE_POLICY = {
  PRE_SESSION_ACCESS_MINUTES: 60,
  POST_SESSION_GRACE_MINUTES: 60,
  EXTENDED_COMPLETION_MINUTES: 180,
  LATE_TOLERANCE_MINUTES: 5,
}

// Needs-Review queue severity — computed deterministically by
// server/src/services/sessionIntelligence.service.js (assessSessionReview).
export const REVIEW_SEVERITY = {
  critical: { label: 'حرجة', color: '#dc2626' },
  high: { label: 'عالية', color: '#ea580c' },
  medium: { label: 'متوسطة', color: '#f59e0b' },
  low: { label: 'منخفضة', color: '#6b7280' },
}

// Review lifecycle — persisted per-session so a dismissed/resolved flag
// never silently reappears just because the underlying evidence is unchanged.
export const REVIEW_STATE = {
  open: { label: 'مفتوحة', color: '#ea580c' },
  in_review: { label: 'قيد المراجعة', color: '#7c3aed' },
  resolved: { label: 'مُعتمدة', color: '#22c55e' },
  dismissed: { label: 'مُتجاهلة', color: '#6b7280' },
}

// Confidence is about how much OPERATIONAL EVIDENCE backs a session's
// record — never a claim of verified external-meeting attendance. See
// server/src/services/sessionIntelligence.service.js computeConfidence().
export const CONFIDENCE_LEVEL = {
  high: { label: 'أدلة تشغيلية قوية', color: '#22c55e' },
  medium: { label: 'طبيعي', color: '#7c3aed' },
  needs_review: { label: 'يحتاج مراجعة', color: '#ea580c' },
}

export const EVALUATION_QUALITY = {
  excellent: { label: 'ممتاز', color: '#22c55e' },
  good: { label: 'جيد', color: '#7c3aed' },
  fair: { label: 'مقبول', color: '#f59e0b' },
  weak: { label: 'ضعيف', color: '#ef4444' },
}
