import api from '../utils/api.js'

// Subscription renewal requests (Phase 2 §9) — mirrors the existing
// enrollment-request client calls in shape. Student routes live under
// /subscriptions; admin review lives under /admin/subscriptions.
export const renewalService = {
  // Student
  submitRequest: (subscriptionId, data) => api.post(`/subscriptions/${subscriptionId}/renewal-requests`, data),
  uploadProof: (requestId, file) => {
    const form = new FormData()
    form.append('paymentProof', file)
    return api.post(`/subscriptions/renewal-requests/${requestId}/payment-proof`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getMyRequests: () => api.get('/subscriptions/renewal-requests/me'),
  cancelRequest: (requestId, reason) => api.post(`/subscriptions/renewal-requests/${requestId}/cancel`, { reason }),

  // Admin
  getAllRequests: (params) => api.get('/admin/subscriptions/renewal-requests', { params }),
  getPendingCount: () => api.get('/admin/subscriptions/renewal-requests/pending-count'),
  getRequest: (requestId) => api.get(`/admin/subscriptions/renewal-requests/${requestId}`),
  reviewRequest: (requestId, data) => api.patch(`/admin/subscriptions/renewal-requests/${requestId}/review`, data),
}
