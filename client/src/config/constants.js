export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
export const APP_NAME = 'ترتيلة أونلاين'
export const APP_NAME_EN = 'Tartelah Online'

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
}

export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  PROGRAMS: '/programs',
  TEACHERS: '/teachers',
  PRICING: '/pricing',
  FAQ: '/faq',
  CONTACT: '/contact',

  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  STUDENT_DASHBOARD: '/student',
  STUDENT_SCHEDULE: '/student/schedule',
  STUDENT_SESSIONS: '/student/sessions',
  STUDENT_HOMEWORK: '/student/homework',
  STUDENT_EVALUATIONS: '/student/evaluations',
  STUDENT_PROGRESS: '/student/progress',
  STUDENT_ACADEMIC: '/student/academic-record',
  STUDENT_SUBSCRIPTION: '/student/subscription',
  STUDENT_ENROLLMENT: '/student/enrollment',
  STUDENT_NOTIFICATIONS: '/student/notifications',
  STUDENT_SETTINGS: '/student/settings',

  TEACHER_DASHBOARD: '/teacher',
  TEACHER_STUDENTS: '/teacher/students',
  TEACHER_SESSIONS: '/teacher/sessions',
  TEACHER_ATTENDANCE: '/teacher/attendance',
  TEACHER_EVALUATIONS: '/teacher/evaluations',
  TEACHER_HOMEWORK: '/teacher/homework',
  TEACHER_PROGRESS: '/teacher/progress',
  TEACHER_LINKS: '/teacher/meeting-links',
  TEACHER_NOTIFICATIONS: '/teacher/notifications',
  TEACHER_SETTINGS: '/teacher/settings',

  ADMIN_DASHBOARD: '/admin',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_ADMINS: '/admin/admins',
  ADMIN_COURSES: '/admin/courses',
  ADMIN_LEVELS: '/admin/levels',
  ADMIN_SESSIONS: '/admin/sessions',
  ADMIN_PACKAGES: '/admin/packages',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_ENROLLMENTS: '/admin/enrollments',
  ADMIN_WEBSITE: '/admin/website',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_SETTINGS: '/admin/settings',

  AI_ASSISTANT: '/ai',
}

export const MEETING_PROVIDERS = {
  zoom: { label: 'Zoom', color: '#2D8CFF' },
  meet: { label: 'Google Meet', color: '#00897B' },
  teams: { label: 'Microsoft Teams', color: '#6264A7' },
  other: { label: 'رابط مخصص', color: '#7c3aed' },
  custom: { label: 'رابط مخصص', color: '#7c3aed' },
}

export const SESSION_STATUS_NO_SHOW = 'no_show'

export const SESSION_STATUS = {
  scheduled: { label: 'مجدولة', labelEn: 'Scheduled', color: '#7c3aed', bg: 'rgba(124,58,237,0.15)' },
  ongoing: { label: 'جارية', labelEn: 'Ongoing', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  completed: { label: 'مكتملة', labelEn: 'Completed', color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  cancelled: { label: 'ملغاة', labelEn: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

export const ATTENDANCE_STATUS = {
  present: { label: 'حاضر', color: '#22c55e' },
  absent: { label: 'غائب', color: '#ef4444' },
  late: { label: 'متأخر', color: '#f59e0b' },
  excused: { label: 'معذور', color: '#7c3aed' },
}

export const EVALUATION_QUALITY = {
  excellent: { label: 'ممتاز', color: '#22c55e' },
  good: { label: 'جيد', color: '#7c3aed' },
  fair: { label: 'مقبول', color: '#f59e0b' },
  weak: { label: 'ضعيف', color: '#ef4444' },
}
