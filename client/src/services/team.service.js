import api from '../utils/api.js'

// RBAC + PBAC team/account management — mirrors server/src/routes/user.routes.js,
// roles.routes.js, permissions.routes.js. Every call here is independently
// re-authorized on the backend (requirePermission/requirePrimaryAdmin); this
// service does not decide who is allowed to call it.
export const teamService = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  updatePermissions: (id, permissions) => api.patch(`/users/${id}/permissions`, { permissions }),
  setStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, newPassword ? { newPassword } : {}),
  listRoles: () => api.get('/roles'),
  listPermissions: () => api.get('/permissions'),
}
