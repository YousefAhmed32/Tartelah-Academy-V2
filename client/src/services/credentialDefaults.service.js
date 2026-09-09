import api from '../utils/api.js'

// Academy-wide default student/teacher passwords (Phase 2 meeting addendum
// §1) — mirrors server/src/routes/admin.routes.js's /credential-defaults
// endpoints. Every call is independently re-authorized on the backend via
// the dedicated 'credentials.manage_defaults' permission.
export const credentialDefaultsService = {
  getStatus: () => api.get('/admin/credential-defaults'),
  getAvailability: () => api.get('/admin/credential-defaults/availability'),
  setDefault: (role, password, passwordConfirm) => api.put(`/admin/credential-defaults/${role}`, { password, passwordConfirm }),
  clearDefault: (role) => api.delete(`/admin/credential-defaults/${role}`),
}
