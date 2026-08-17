import { create } from 'zustand'
import { ROLES, ADMIN_FAMILY_ROLES, ROLE_DISPLAY_NAMES } from '../config/constants.js'

// RBAC + PBAC auth store. `user` (hydrated from GET /auth/me, see
// hooks/useAuth.js) already carries `role` (the stable systemRole),
// `permissions`, `isPrimaryAdmin`, `displayRoleName`, `jobTitle` from the
// backend — see server/src/models/User.js toPublic(). This store never
// invents authorization on its own; every selector here just reads what the
// backend already decided. The backend re-checks all of this independently
// on every request (see server/src/middleware/rbac.middleware.js) — nothing
// here is a security boundary by itself.
export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAccessToken: (token) => set({ accessToken: token }),

  setAuth: (user, token) => set({
    user,
    accessToken: token,
    isAuthenticated: true,
    isLoading: false,
  }),

  logout: () => set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
  }),

  setLoading: (isLoading) => set({ isLoading }),

  // ── Backward-compatible role checks ─────────────────────────────────────
  isAdmin: () => get().user?.role === ROLES.ADMIN,
  isTeacher: () => get().user?.role === ROLES.TEACHER,
  isStudent: () => get().user?.role === ROLES.STUDENT,
  getRole: () => get().user?.role || null,

  // ── RBAC + PBAC selectors ────────────────────────────────────────────────
  isPrimaryAdmin: () => get().user?.isPrimaryAdmin === true,
  isAssistantAdmin: () => get().user?.role === ROLES.ASSISTANT_ADMIN,

  // True for the whole admin-family hierarchy (admin/assistant_admin/
  // operator/manager/staff) — gates entry into the /admin dashboard shell.
  // Individual features inside it still gate on hasPermission().
  hasAdminAccess: () => ADMIN_FAMILY_ROLES.includes(get().user?.role),

  hasPermission: (permission) => {
    const user = get().user
    if (!user) return false
    if (user.isPrimaryAdmin) return true
    return Array.isArray(user.permissions) && user.permissions.includes(permission)
  },

  hasAnyPermission: (permissions = []) => {
    const { hasPermission } = get()
    return permissions.some((p) => hasPermission(p))
  },

  hasAllPermissions: (permissions = []) => {
    const { hasPermission } = get()
    return permissions.every((p) => hasPermission(p))
  },

  canCreateUser: () => get().hasPermission('users.create'),
  canCreateAdmin: () => get().hasPermission('admins.create'),
  canAssignPermissions: () => get().hasPermission('permissions.assign'),
  canManageUsers: () => get().hasAnyPermission(['users.view', 'users.update', 'users.disable']),

  getDisplayRoleName: () => {
    const user = get().user
    if (!user) return null
    return user.displayRoleName || ROLE_DISPLAY_NAMES[user.role] || user.role
  },
  getJobTitle: () => get().user?.jobTitle || null,

  getDashboardPath: () => {
    const role = get().user?.role
    if (ADMIN_FAMILY_ROLES.includes(role)) return '/admin'
    if (role === ROLES.TEACHER) return '/teacher'
    if (role === ROLES.STUDENT) return '/student'
    return '/'
  },
}))
