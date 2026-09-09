import api from '../utils/api.js'

// Monthly teacher reports (Phase 2 §12).
export const monthlyReportService = {
  // Teacher
  getMyReports: (params) => api.get('/monthly-reports/me', { params }),
  getMyReport: (id) => api.get(`/monthly-reports/me/${id}`),
  submitMyReport: (id, data) => api.post(`/monthly-reports/me/${id}/submit`, data),

  // Admin
  getAllReports: (params) => api.get('/monthly-reports/admin/all', { params }),
  getReport: (id) => api.get(`/monthly-reports/admin/${id}`),
  generateOne: (data) => api.post('/monthly-reports/admin/generate', data),
  generateAll: (data) => api.post('/monthly-reports/admin/generate-all', data),
  requestCompletion: (id, note) => api.post(`/monthly-reports/admin/${id}/request-completion`, { note }),
  markReviewed: (id, note) => api.post(`/monthly-reports/admin/${id}/reviewed`, { note }),
  approveReport: (id) => api.post(`/monthly-reports/admin/${id}/approve`),
}
