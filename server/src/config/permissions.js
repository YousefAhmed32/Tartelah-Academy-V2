// Centralized RBAC + PBAC configuration — single source of truth for every
// permission string, role identifier, and role-default permission set used
// across the backend (middleware, controllers) and mirrored by the frontend
// authStore/Can guard. See docs/ or CLAUDE.md's RBAC section for the design.
//
// `User.role` IS the "systemRole" described in the RBAC spec — there is no
// separate systemRole field. It already was the stable internal role
// identifier every route/query relies on, so it is reused rather than
// duplicated (avoids two fields that could drift out of sync).

// Every permission the system understands. Adding a new permission means
// adding it here first — nothing elsewhere should hardcode a raw string.
const ALL_PERMISSIONS = [
  'users.view',
  'users.create',
  'users.update',
  'users.disable',
  'users.delete',
  'users.reset_password',
  'admins.create',
  'admins.update',
  'admins.disable',
  'permissions.view',
  'permissions.assign',
  'roles.view',
  'roles.create',
  'roles.update',
  'roles.delete',
  'dashboard.view',
  'content.view',
  'content.create',
  'content.update',
  'content.delete',
  'content.publish',
  'content.schedule',
  'settings.view',
  'settings.update',
  // Module permissions below extend PBAC coverage beyond Team Management to
  // the rest of the admin product surface (see docs/ RBAC notes). Each
  // module gets a .view/.manage pair — .manage covers create/update/delete/
  // publish-style mutations for that module, matching the .view/.update
  // granularity already established by settings.*.
  'students.view',
  'students.manage',
  'teachers.view',
  'teachers.manage',
  'courses.view',
  'courses.manage',
  'packages.view',
  'packages.manage',
  'sessions.view',
  'sessions.manage',
  'scheduleRules.view',
  'scheduleRules.manage',
  'subscriptions.view',
  'subscriptions.manage',
  'notifications.view',
  'notifications.manage',
  'audit.view',
  'reports.view',
  'operations.view',
  'enrollments.view',
  'enrollments.manage',
  // Assignment-request workflow (Phase 2 Part 2 §7–§11): assigning a new
  // student to a teacher for approval, tracking/reassigning the request
  // queue, and — separately, more sensitively — bypassing teacher approval
  // to activate a new student's schedule immediately.
  'assignments.view',
  'assignments.manage',
  'assignments.override',
  // Dynamic teaching-subject/curriculum catalog (config/categories.js →
  // services/teachingSubject.service.js). `.view` is only needed to see the
  // admin management screen (any authenticated admin/teacher can already
  // read the active list via the public GET /teaching-subjects endpoint for
  // form population); `.manage` covers create/rename/archive/unarchive/
  // reorder.
  'curricula.view',
  'curricula.manage',
  // Academy-wide default student/teacher passwords (Phase 2 meeting
  // addendum §1) — deliberately its own permission, not folded into
  // settings.update: replacing the shared operational password for new
  // accounts is a materially more sensitive action than editing site
  // content/contact settings, and must be grantable/revocable independently.
  'credentials.manage_defaults',
  // Complete subscription pause/resume lifecycle (Phase 2 meeting addendum
  // §2) — distinct from subscriptions.manage's general CRUD so the
  // higher-impact pause/resume action (wallet freeze + schedule pause +
  // future-session handling) can be scoped separately if desired; both
  // 'admin' and any role already holding subscriptions.manage get it below.
  'subscriptions.pause_resume',
  // Active-student transfer and whole-teacher replacement (Phase 2 meeting
  // addendum §3–§4).
  'transfers.view',
  'transfers.execute',
  // Hourly teacher payroll + financial adjustments (Phase 2 §6–§7). `.view`
  // covers browsing the ledger/periods/reports; `.manage` covers recording
  // bonuses/deductions/settlements and reopening a period for correction.
  // `.approve`/`.pay` are deliberately separate, higher-risk actions — same
  // "must be explicitly granted, never auto-inherited even by a plain admin"
  // treatment as `assignments.override`/`credentials.manage_defaults` below,
  // since they represent an actual sign-off on releasing real money.
  // `.export` covers the print/export capability, kept independent so it can
  // be granted to a read-only finance role without also granting `.manage`.
  'payroll.view',
  'payroll.manage',
  'payroll.approve',
  'payroll.pay',
  'payroll.export',
  // Quran session reports (Phase 2 §10) — teachers create/submit their own
  // (ownership-checked, no permission system involved for them, same
  // convention as every other teacher-facing surface); `.view`/`.manage`
  // here are for the ADMIN review side only (request correction/approve).
  'quranReports.view',
  'quranReports.manage',
  // Monthly teacher reports (Phase 2 §11) — same split: teachers
  // review/submit their own draft, admins review/approve via these.
  'monthlyReports.view',
  'monthlyReports.manage',
  // Evaluation/renewal survey (Phase 2 §13) — admin-only; teachers never get
  // a permission here at all (see models/Survey.js's privacy doc-comment —
  // raw responses are not a teacher-facing surface in this pass).
  'surveys.view',
  'surveys.manage',
]

// Internal role identifiers (User.role). Stable — never rename these values,
// only their displayRoleName/jobTitle (per-user, customizable). No
// SUPER_ADMIN role exists — the original administrator is instead flagged
// via User.isPrimaryAdmin and keeps role 'admin'.
const ROLES = {
  ADMIN: 'admin',
  ASSISTANT_ADMIN: 'assistant_admin',
  OPERATOR: 'operator',
  MANAGER: 'manager',
  STAFF: 'staff',
  TEACHER: 'teacher',
  STUDENT: 'student',
}

const ALL_ROLES = Object.values(ROLES)

// Roles that belong in the admin dashboard/staff hierarchy — distinct from
// TEACHER/STUDENT, which keep their own dedicated dashboards and never use
// the permission system.
const ADMIN_FAMILY_ROLES = [ROLES.ADMIN, ROLES.ASSISTANT_ADMIN, ROLES.OPERATOR, ROLES.MANAGER, ROLES.STAFF]

// Roles whose creation/role-change requires the `admins.create` /
// `admins.update` authority rather than the plain `users.create/update`.
const ADMINISTRATIVE_ROLES = ADMIN_FAMILY_ROLES

// Conservative starting permission set per role — used only as a *default
// suggestion* when an authorized admin creates a new account (and as the
// fallback for the RBAC migration of pre-existing accounts). Deliberately
// excludes admins.create/admins.update/admins.disable/permissions.assign/
// users.delete/roles.*/settings.update for every role — including 'admin' —
// so a newly created account never auto-inherits the power to create other
// administrative accounts or grant permissions; that must always be
// explicitly assigned by someone who already holds it (or the Primary Admin).
const DEFAULT_PERMISSIONS_BY_ROLE = {
  [ROLES.ADMIN]: [
    'users.view', 'users.create', 'users.update', 'users.disable', 'users.reset_password',
    'dashboard.view', 'roles.view', 'permissions.view',
    'content.view', 'content.create', 'content.update', 'content.delete', 'content.publish', 'content.schedule',
    'settings.view',
    // Full module coverage — a plain 'admin' account has always had full
    // access to every one of these via the legacy role-based gate; this
    // keeps that real-world behavior intact now that the gates are
    // permission-based instead of role-based. Deliberately still excludes
    // admins.*/permissions.assign/users.delete/roles.*/settings.update —
    // same reasoning as above, unchanged.
    'students.view', 'students.manage',
    'teachers.view', 'teachers.manage',
    'courses.view', 'courses.manage',
    'packages.view', 'packages.manage',
    'sessions.view', 'sessions.manage',
    'scheduleRules.view', 'scheduleRules.manage',
    'subscriptions.view', 'subscriptions.manage',
    'notifications.view', 'notifications.manage',
    'audit.view', 'reports.view', 'operations.view',
    'enrollments.view', 'enrollments.manage',
    'assignments.view', 'assignments.manage',
    'curricula.view', 'curricula.manage',
    // Subscription pause/resume and student transfer/teacher-replacement are
    // natural extensions of the subscriptions.manage/teachers.manage/
    // students.manage authority a plain 'admin' already holds above.
    'subscriptions.pause_resume',
    'transfers.view', 'transfers.execute',
    'payroll.view', 'payroll.manage', 'payroll.export',
    'quranReports.view', 'quranReports.manage',
    'monthlyReports.view', 'monthlyReports.manage',
    'surveys.view', 'surveys.manage',
    // 'assignments.override', 'credentials.manage_defaults', and
    // 'payroll.approve'/'payroll.pay' deliberately excluded even for a plain
    // 'admin' account — the immediate-assignment-without-teacher-approval
    // bypass, replacing the academy's shared default password for new
    // accounts, and actually signing off on releasing real payroll money,
    // must always be explicitly granted (or held via isPrimaryAdmin), never
    // auto-inherited, per the brief's "disabled by default" requirement for
    // sensitive/high-impact authority.
  ],
  [ROLES.ASSISTANT_ADMIN]: [
    'users.view', 'dashboard.view', 'content.view', 'content.create', 'content.update', 'content.publish',
    'students.view', 'teachers.view', 'courses.view', 'enrollments.view',
  ],
  [ROLES.OPERATOR]: [
    'dashboard.view', 'content.view', 'content.create', 'content.update',
    'sessions.view', 'enrollments.view',
  ],
  [ROLES.MANAGER]: [
    'users.view', 'dashboard.view', 'settings.view',
    'students.view', 'teachers.view', 'reports.view', 'subscriptions.view',
  ],
  [ROLES.STAFF]: [
    'dashboard.view',
  ],
  [ROLES.TEACHER]: [],
  [ROLES.STUDENT]: [],
}

// Fallback display name shown when a user has no custom displayRoleName set.
const DEFAULT_DISPLAY_NAMES = {
  [ROLES.ADMIN]: 'مدير',
  [ROLES.ASSISTANT_ADMIN]: 'مساعد مدير',
  [ROLES.OPERATOR]: 'موظف عمليات',
  [ROLES.MANAGER]: 'مدير قسم',
  [ROLES.STAFF]: 'موظف',
  [ROLES.TEACHER]: 'معلم',
  [ROLES.STUDENT]: 'طالب',
}

function isValidPermission(permission) {
  return ALL_PERMISSIONS.includes(permission)
}

function isValidRole(role) {
  return ALL_ROLES.includes(role)
}

module.exports = {
  ALL_PERMISSIONS,
  ROLES,
  ALL_ROLES,
  ADMIN_FAMILY_ROLES,
  ADMINISTRATIVE_ROLES,
  DEFAULT_PERMISSIONS_BY_ROLE,
  DEFAULT_DISPLAY_NAMES,
  isValidPermission,
  isValidRole,
}
