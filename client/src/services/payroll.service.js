import api from '../utils/api.js'

// Hourly teacher payroll + financial adjustments (Phase 2 §6–§7) — mirrors
// server/src/routes/admin.routes.js's /payroll endpoints and
// teacher.routes.js's /teachers/me/payroll endpoints. Every call is
// independently re-authorized on the backend via payroll.view/manage/
// approve/pay (admin) or ownership scoping (teacher self-service).
export const payrollService = {
  // Admin — periods
  listOrgPeriods: (year, month, params) => api.get('/admin/payroll/periods', { params: { year, month, ...params } }),
  getPeriod: (periodId) => api.get(`/admin/payroll/periods/${periodId}`),
  getPeriodEntries: (periodId) => api.get(`/admin/payroll/periods/${periodId}/entries`),
  listTeacherPeriods: (teacherId, params) => api.get(`/admin/payroll/teachers/${teacherId}/periods`, { params }),
  submitPeriod: (periodId, reason) => api.post(`/admin/payroll/periods/${periodId}/submit`, { reason }),
  approvePeriod: (periodId, reason) => api.post(`/admin/payroll/periods/${periodId}/approve`, { reason }),
  markPeriodPaid: (periodId, { reference, reason }) => api.post(`/admin/payroll/periods/${periodId}/pay`, { reference, reason }),
  reopenPeriod: (periodId, reason) => api.post(`/admin/payroll/periods/${periodId}/reopen`, { reason }),

  // Admin — adjustments
  listAdjustments: (params) => api.get('/admin/payroll/adjustments', { params }),
  createAdjustment: (teacherId, data) => api.post(`/admin/payroll/teachers/${teacherId}/adjustments`, data),
  reverseAdjustment: (entryId, reason) => api.post(`/admin/payroll/entries/${entryId}/reverse`, { reason }),

  // Existing ledger browser (kept, pre-existing endpoint)
  getLedger: (params) => api.get('/admin/payroll/ledger', { params }),

  // Teacher self-service
  getMyCurrentPeriod: () => api.get('/teachers/me/payroll/current'),
  getMyPeriods: (params) => api.get('/teachers/me/payroll/periods', { params }),
  getMyPeriod: (periodId) => api.get(`/teachers/me/payroll/periods/${periodId}`),
  getMyPeriodEntries: (periodId) => api.get(`/teachers/me/payroll/periods/${periodId}/entries`),
}
