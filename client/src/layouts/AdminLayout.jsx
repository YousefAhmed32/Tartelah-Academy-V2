import { Suspense, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore.js'
import { useNotificationStore } from '../store/notificationStore.js'
import { authService } from '../services/auth.service.js'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationBell from '../components/ui/NotificationBell.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorBoundary from '../components/shared/ErrorBoundary.jsx'
import { useNotificationInit } from '../hooks/useNotificationInit.js'
import api from '../utils/api.js'
import { ROUTES, getFileUrl } from '../config/constants.js'

function ContentFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner color="border-brand-purple" />
    </div>
  )
}

const NAV_GROUPS = [
  {
    label: 'المنصة',
    items: [
      {
        to: ROUTES.ADMIN_DASHBOARD, label: 'لوحة التحكم', end: true, permission: 'dashboard.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 11 12 4l9 7M5 10v9h5v-5h4v5h5v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_OPERATIONS, label: 'مركز العمليات', permission: 'operations.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_ENROLLMENTS, label: 'طلبات التسجيل', enrollment: true, permission: 'enrollments.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 2v6h6M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
    ]
  },
  {
    label: 'إدارة المستخدمين',
    items: [
      {
        to: ROUTES.ADMIN_STUDENTS, label: 'الطلاب', permission: 'students.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.8"/><path d="M15.5 19a4 4 0 0 1 6-3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_TEACHERS, label: 'المعلمون', permission: 'teachers.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        // Team/Account management — admins, assistant admins, operators,
        // managers, staff. Hidden unless the current user can at least view
        // accounts (backend independently enforces this on every route).
        to: ROUTES.ADMIN_ADMINS, label: 'إدارة الفريق', permission: 'users.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M2.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M15.5 4.5a3 3 0 0 1 0 6M17 19a4.2 4.2 0 0 0-3.3-4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_ASSIGNMENT_REQUESTS, label: 'طلبات إسناد الطلاب', assignmentRequests: true, permission: 'assignments.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        // Bulk whole-teacher replacement (Phase 2 meeting addendum §4).
        to: ROUTES.ADMIN_TEACHER_REPLACEMENT, label: 'استبدال معلم', permission: 'transfers.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 2l4 4-4 4M21 6H9a4 4 0 0 0-4 4v1M7 22l-4-4 4-4M3 18h12a4 4 0 0 0 4-4v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
    ]
  },
  {
    label: 'الأكاديمية',
    items: [
      {
        to: ROUTES.ADMIN_PACKAGES, label: 'الباقات والأسعار', permission: 'packages.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/></svg>
      },
      {
        to: ROUTES.ADMIN_COURSES, label: 'المقررات والمستويات', permission: 'courses.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="13" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="13" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="13" y="13" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/></svg>
      },
      {
        to: ROUTES.ADMIN_SESSIONS, label: 'الحصص', permission: 'sessions.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_SCHEDULE_RULES, label: 'جداول الحصص', permission: 'scheduleRules.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2" stroke="currentColor" strokeWidth="1.8"/><path d="M12 3v6l2-1.5L16 9V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_SUBSCRIPTIONS, label: 'الاشتراكات', permission: 'subscriptions.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/><path d="M6 14h4M14 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        // Subscription renewal review queue (Phase 2 §9).
        to: ROUTES.ADMIN_SUBSCRIPTION_RENEWALS, label: 'طلبات التجديد', permission: 'subscriptions.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M21 3v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        // Quran session report review + missing-report tracking (Phase 2 §10–§11).
        to: ROUTES.ADMIN_QURAN_REPORTS, label: 'تقارير الحلقات', permission: 'quranReports.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
      },
      {
        // Monthly teacher reports (Phase 2 §12).
        to: ROUTES.ADMIN_MONTHLY_REPORTS, label: 'التقارير الشهرية', permission: 'monthlyReports.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 13h4M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        // Evaluation/renewal survey (Phase 2 §13).
        to: ROUTES.ADMIN_SURVEYS, label: 'استبيانات التقييم', permission: 'surveys.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
    ]
  },
  {
    label: 'المحتوى',
    items: [
      {
        to: ROUTES.ADMIN_ARTICLES, label: 'المقالات والمدونة', permission: 'content.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_CONTACT_MESSAGES, label: 'رسائل التواصل', contactMessages: true, permission: 'content.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_WEBSITE, label: 'إدارة الموقع', permission: 'content.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M3 12h18M12 3c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10s1.5-7.3 4-10Z" stroke="currentColor" strokeWidth="1.8"/></svg>
      },
      {
        to: ROUTES.ADMIN_SUCCESS_STORIES, label: 'قصص النجاح', permission: 'content.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2.5l3.09 6.26L22 9.77l-5 4.87 1.18 6.88L12 18.27l-6.18 3.25L7 14.64l-5-4.87 6.91-1.01L12 2.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
      },
    ]
  },
  {
    label: 'التقارير والنظام',
    items: [
      {
        to: ROUTES.ADMIN_REPORTS, label: 'التقارير والإحصائيات', permission: 'reports.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 16v-4M12 16V8M17 16v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_TEACHER_PERFORMANCE, label: 'أداء المعلمين', permission: 'reports.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M9 8.5 11 10.5 15.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        // Hourly teacher payroll + financial adjustments (Phase 2 §6–§7).
        to: ROUTES.ADMIN_PAYROLL, label: 'الرواتب', permission: 'payroll.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M6.5 9.5h.01M17.5 14.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_NOTIFICATIONS, label: 'الإشعارات', notification: true, permission: 'notifications.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_AUDIT_LOGS, label: 'سجل الأنشطة', permission: 'audit.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        to: ROUTES.ADMIN_SETTINGS, label: 'الإعدادات', permission: 'settings.view',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.47V21a2 2 0 0 1-4 0v-.09A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 0 1 0-4h.09A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 1-1.47V3a2 2 0 0 1 4 0v.09a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.8-.3l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 0 1 0 4h-.09a1.6 1.6 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.8"/></svg>
      },
    ]
  },
]

const MOBILE_NAV = [
  NAV_GROUPS[0].items[0],  // Dashboard
  NAV_GROUPS[0].items[1],  // Operations Center
  NAV_GROUPS[0].items[2],  // Enrollments
  NAV_GROUPS[1].items[0],  // Students
  NAV_GROUPS[4].items[2],  // Notifications (شفت index بعد إضافة أداء المعلمين)
]

function navLinkClass({ isActive }) {
  return [
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer no-underline',
    isActive
      ? 'bg-violet-50 text-violet-700'
      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
  ].join(' ')
}

// Every nav item now declares the exact module permission that gates its
// backend routes (see server/src/config/permissions.js + the matching
// requirePermission(...) calls across admin.routes.js/course.routes.js/...).
// This is the single canonical check — same permission string the route
// guard (RequirePermission, App.jsx) and the backend middleware use — so the
// Sidebar can never show a link the user's own effective permissions don't
// actually back.
function isNavItemVisible(item, hasPermission) {
  return hasPermission(item.permission)
}

// The header used to hardcode "مركز العمليات" (Operations Center) regardless
// of which admin page was actually open — this derives the real page title
// from the matching nav item instead, falling back to the academy name for
// routes with no nav entry (e.g. /admin/students/:id).
function currentPageTitle(pathname) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.end ? pathname === item.to : pathname.startsWith(item.to)) return item.label
    }
  }
  return 'ترتيلة أونلاين'
}

export default function AdminLayout() {
  const { user, isAuthenticated, hasAdminAccess, hasPermission, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  useNotificationInit()

  const { data: pendingEnrollments = 0 } = useQuery({
    queryKey: ['admin', 'enrollments', 'pending-count'],
    queryFn: () => api.get('/enrollments/pending-count').then(r => r.data.data?.count || 0),
    refetchInterval: 60000,
    enabled: isAuthenticated && hasPermission('enrollments.view'),
  })

  const { data: newContactMessages = 0 } = useQuery({
    queryKey: ['admin', 'contact-stats'],
    queryFn: () => api.get('/website/contact-messages/stats').then(r => r.data.data?.new || 0),
    refetchInterval: 120000,
    enabled: isAuthenticated && hasPermission('content.view'),
  })

  // Rejected/needs-schedule-change assignment requests waiting on an admin
  // follow-up action (edit & resend / reassign / cancel) — see
  // AdminAssignmentRequestsPage.jsx.
  const { data: pendingAssignmentFollowUps = 0 } = useQuery({
    queryKey: ['admin', 'assignment-requests', 'follow-up-count'],
    queryFn: () => api.get('/admin/assignments', { params: { status: 'rejected,time_change_requested', limit: 1 } }).then(r => r.data.data?.total || 0),
    refetchInterval: 60000,
    enabled: isAuthenticated && hasPermission('assignments.view'),
  })

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  // Admin-family roles (admin/assistant_admin/operator/manager/staff) reach
  // the dashboard shell; which nav items and data they can actually use is
  // still gated per-feature by permission (backend enforces this — see
  // rbac.middleware.js — this is only the entry gate to the shell itself).
  if (!hasAdminAccess()) return <Navigate to="/" replace />
  // /admin (the dashboard) requires dashboard.view like any other module —
  // a restricted account landing there would just hit AccessDeniedPage via
  // RequirePermission. Send them straight to Team Management instead (the
  // one page every admin-family role is realistically meant to reach; its
  // own data still 403s per-user if they lack users.view too, same as any
  // other page here).
  if (!hasPermission('dashboard.view') && location.pathname === ROUTES.ADMIN_DASHBOARD) {
    return <Navigate to={ROUTES.ADMIN_ADMINS} replace />
  }

  function handleLogout() {
    authService.logout().catch(() => {})
    logout()
    navigate(ROUTES.LOGIN)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Academy Identity */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-none bg-white border border-gray-100 shadow-sm">
            <img src="/logo-png.png" alt="ترتيلة" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-[17px] text-gray-900 leading-tight">ترتيلة</div>
            <div className="text-[10px] font-medium tracking-wider text-violet-500">Tartelah Online</div>
          </div>
        </div>

        {/* Admin profile card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
          <Avatar
            src={getFileUrl(user?.avatar)}
            firstName={user?.firstNameAr || user?.firstName}
            lastName={user?.lastNameAr || user?.lastName}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 truncate">
              {user?.firstNameAr} {user?.lastNameAr}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-gray-500">مدير المنصة</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
            أدمن
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 custom-scroll-light">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'pt-4' : ''}>
            <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {group.label}
            </div>
            {group.items.filter((item) => isNavItemVisible(item, hasPermission)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setDrawerOpen(false)}
                className={navLinkClass}
              >
                <span className="flex-none opacity-70">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.notification && unreadCount > 0 && (
                  <span className="bg-violet-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {item.enrollment && pendingEnrollments > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {pendingEnrollments}
                  </span>
                )}
                {item.contactMessages && newContactMessages > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {newContactMessages > 9 ? '9+' : newContactMessages}
                  </span>
                )}
                {item.assignmentRequests && pendingAssignmentFollowUps > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {pendingAssignmentFollowUps > 9 ? '9+' : pendingAssignmentFollowUps}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          تسجيل الخروج
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: '#F4F6F9', direction: 'rtl' }}>

      {/* Desktop Sidebar — RIGHT side (RTL first child) */}
      <aside
        className="flex-none w-[260px] flex-col hidden lg:flex bg-white border-s border-gray-200"
        style={{ boxShadow: '-1px 0 0 0 #E5E7EB' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-30 lg:hidden bg-black/30 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-40 w-[260px] bg-white lg:hidden"
              style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', direction: 'rtl' }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 h-16 bg-white border-b border-gray-200">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="font-heading font-bold text-base text-gray-900 hidden lg:block truncate">
            {currentPageTitle(location.pathname)}
          </div>

          <div className="flex items-center gap-2.5">
            {pendingEnrollments > 0 && (
              <button
                onClick={() => navigate(ROUTES.ADMIN_ENROLLMENTS)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {pendingEnrollments} طلب جديد
              </button>
            )}

            <NotificationBell theme="light" viewAllPath={ROUTES.ADMIN_NOTIFICATIONS} />

            <Avatar
              src={getFileUrl(user?.avatar)}
              firstName={user?.firstNameAr || user?.firstName}
              lastName={user?.lastNameAr || user?.lastName}
              size="sm"
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-5 lg:p-7 pb-24 lg:pb-8" dir="rtl">
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<ContentFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Mobile Bottom Nav */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-20 flex bg-white border-t border-gray-200"
          style={{ direction: 'rtl' }}
        >
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[9px] font-semibold transition-colors ${isActive ? 'text-violet-700' : 'text-gray-400'}`
              }
            >
              {item.icon}
              <span className="truncate w-full text-center px-0.5">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  )
}
