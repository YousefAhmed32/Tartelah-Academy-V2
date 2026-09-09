import api from '../utils/api.js'

// Active-student transfer & bulk whole-teacher replacement (Phase 2 meeting
// addendum §3–§4) — mirrors server/src/routes/admin.routes.js's /transfers
// endpoints. Every call is independently re-authorized on the backend via
// the dedicated transfers.view/transfers.execute permissions.
export const transferService = {
  previewStudentTransfer: (studentId, data) => api.post(`/admin/transfers/students/${studentId}/preview`, data),
  executeStudentTransfer: (studentId, data) => api.post(`/admin/transfers/students/${studentId}`, data),
  getStudentTransferHistory: (studentId) => api.get(`/admin/transfers/students/${studentId}/history`),

  previewTeacherReplacement: (teacherId, targetTeacherId) => api.post(`/admin/transfers/teachers/${teacherId}/preview`, { targetTeacherId }),
  createBatch: (teacherId, data) => api.post(`/admin/transfers/teachers/${teacherId}/batches`, data),
  listBatches: (params) => api.get('/admin/transfers/batches', { params }),
  getBatch: (batchId) => api.get(`/admin/transfers/batches/${batchId}`),
  setEntryResolution: (batchId, studentId, resolvedSchedule) => api.patch(`/admin/transfers/batches/${batchId}/entries/${studentId}`, { resolvedSchedule }),
  runBatch: (batchId) => api.post(`/admin/transfers/batches/${batchId}/run`),
  retryBatch: (batchId) => api.post(`/admin/transfers/batches/${batchId}/retry`),
  cancelBatch: (batchId) => api.post(`/admin/transfers/batches/${batchId}/cancel`),
}
