import { create } from 'zustand'
import { ROLES } from '../config/constants.js'

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

  isAdmin: () => get().user?.role === ROLES.ADMIN,
  isTeacher: () => get().user?.role === ROLES.TEACHER,
  isStudent: () => get().user?.role === ROLES.STUDENT,

  getRole: () => get().user?.role || null,

  getDashboardPath: () => {
    const role = get().user?.role
    if (role === ROLES.ADMIN) return '/admin'
    if (role === ROLES.TEACHER) return '/teacher'
    if (role === ROLES.STUDENT) return '/student'
    return '/'
  },
}))
