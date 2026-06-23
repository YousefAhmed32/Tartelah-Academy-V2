import api from '../utils/api.js'

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  changePassword: (data) => api.patch('/auth/change-password', data),
  // Uses the correct /auth/refresh endpoint (not /auth/refresh-token)
  refreshToken: () => api.post('/auth/refresh'),
  // Development only — calls /auth/dev-login which is disabled in production
  devLogin: (role) => api.post('/auth/dev-login', { role }),
}
