import api from '../utils/api.js'

// Quran session reports + missing-report tracking (Phase 2 §10–§11).
export const quranReportService = {
  // Teacher
  saveDraft: (sessionId, data) => api.post(`/quran-reports/sessions/${sessionId}/draft`, data),
  submitReport: (sessionId, data) => api.post(`/quran-reports/sessions/${sessionId}/submit`, data),
  getMyDailyProgress: (date) => api.get('/quran-reports/me/daily-progress', { params: { date } }),
  getMyOverdue: (minAgeHours) => api.get('/quran-reports/me/overdue', { params: { minAgeHours } }),
  getMyReports: (params) => api.get('/quran-reports/me', { params }),

  // Shared
  getSessionReport: (sessionId) => api.get(`/quran-reports/sessions/${sessionId}`),

  // Student
  getMyStudentReports: (params) => api.get('/quran-reports/student/me', { params }),

  // Admin
  getAllReports: (params) => api.get('/quran-reports/admin/all', { params }),
  getOverview: (params) => api.get('/quran-reports/admin/overview', { params }),
  getOverdueTeachers: (minAgeHours) => api.get('/quran-reports/admin/overdue-teachers', { params: { minAgeHours } }),
  getMonthlyRatio: (params) => api.get('/quran-reports/admin/monthly-ratio', { params }),
  requestCorrection: (id, reason) => api.post(`/quran-reports/admin/${id}/request-correction`, { reason }),
  approveReport: (id) => api.post(`/quran-reports/admin/${id}/approve`),
}
