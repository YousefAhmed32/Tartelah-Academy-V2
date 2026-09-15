import api from '../utils/api.js'

// Evaluation/renewal survey (Phase 2 §13).
export const surveyService = {
  // Student
  getMyPending: () => api.get('/surveys/me/pending'),
  ensureForSubscription: (subscriptionId) => api.post(`/surveys/me/ensure/${subscriptionId}`),
  submitResponse: (id, responses) => api.post(`/surveys/me/${id}/submit`, responses),
  skip: (id) => api.post(`/surveys/me/${id}/skip`),

  // Admin
  getAll: (params) => api.get('/surveys/admin/all', { params }),
  getById: (id) => api.get(`/surveys/admin/${id}`),
  getAggregate: (params) => api.get('/surveys/admin/aggregate', { params }),
  markFollowedUp: (id) => api.post(`/surveys/admin/${id}/followed-up`),
}

