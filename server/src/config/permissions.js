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
  'content.create',
  'content.update',
  'content.delete',
  'content.publish',
  'content.schedule',
  'settings.view',
  'settings.update',
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
    'content.create', 'content.update', 'content.delete', 'content.publish', 'content.schedule',
    'settings.view',
  ],
  [ROLES.ASSISTANT_ADMIN]: [
    'users.view', 'dashboard.view', 'content.create', 'content.update', 'content.publish',
  ],
  [ROLES.OPERATOR]: [
    'dashboard.view', 'content.create', 'content.update',
  ],
  [ROLES.MANAGER]: [
    'users.view', 'dashboard.view', 'settings.view',
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
