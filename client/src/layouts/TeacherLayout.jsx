import { Suspense, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore.js'
import { useNotificationStore } from '../store/notificationStore.js'
import { authService } from '../services/auth.service.js'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationBell from '../components/ui/NotificationBell.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import ErrorBoundary from '../components/shared/ErrorBoundary.jsx'
import { useNotificationInit } from '../hooks/useNotificationInit.js'
import { ROUTES, ROLES } from '../config/constants.js'

function ContentFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner color="border-brand-purple" />
    </div>
  )
}

const NAV_GROUPS = [
  {
    label: 'التدريس',
    items: [
      {
        to: ROUTES.TEACHER_DASHBOARD, label: 'الرئيسية', end: true,
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M3 11 12 4l9 7M5 10v9h5v-5h4v5h5v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        to: ROUTES.TEACHER_STUDENTS, label: 'طلابي',
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.8"/><path d="M15.5 19a4 4 0 0 1 6-3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.TEACHER_SESSIONS, label: 'الحصص والجداول',
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
    ]
  },
  {
    label: 'الأكاديمي',
    items: [
      {
        to: ROUTES.TEACHER_ATTENDANCE, label: 'الحضور والغياب',
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 10h18M8 3v4M16 3v4M8 15l2.5 2.5L16 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        to: ROUTES.TEACHER_EVALUATIONS, label: 'التقييمات',
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16l-7-3-7 3V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 10l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        to: ROUTES.TEACHER_HOMEWORK, label: 'الواجبات',
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M8 4h8l3 3v13H5V4h3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        to: ROUTES.TEACHER_PROGRESS, label: 'التقدم الدراسي',
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 16v-4M12 16V8M17 16v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
    ]
  },
  {
    label: 'الأدوات',
    items: [
      {
        to: ROUTES.TEACHER_LINKS, label: 'روابط الحصص',
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M9 17H7a4 4 0 0 1 0-8h2M15 7h2a4 4 0 0 1 0 8h-2M8 13h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      },
      {
        to: ROUTES.TEACHER_PERFORMANCE, label: 'أدائي والراتب',
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 16v-4M12 16V8M17 16v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.8"/></svg>
      },
      {
        to: ROUTES.TEACHER_NOTIFICATIONS, label: 'الإشعارات', notification: true,
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      },
      {
        to: ROUTES.TEACHER_SETTINGS, label: 'الإعدادات',
        icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.47V21a2 2 0 0 1-4 0v-.09A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 0 1 0-4h.09A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 1-1.47V3a2 2 0 0 1 4 0v.09a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.8-.3l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 0 1 0 4h-.09a1.6 1.6 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.8"/></svg>
      },
    ]
  },
]

const MOBILE_ITEMS = [
  NAV_GROUPS[0].items[0], // Dashboard
  NAV_GROUPS[0].items[2], // Sessions
  NAV_GROUPS[1].items[1], // Evaluations
  NAV_GROUPS[1].items[2], // Homework
  NAV_GROUPS[2].items[2], // Notifications
]

export default function TeacherLayout() {
  const { user, isAuthenticated, getRole, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  useNotificationInit()

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (getRole() !== ROLES.TEACHER) return <Navigate to="/" replace />

  function handleLogout() {
    authService.logout().catch(() => {})
    logout()
    navigate(ROUTES.LOGIN)
  }

  const SidebarContent = () => (
    <>
      {/* Academy Identity */}
      <div className="px-3 pb-5 mb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-2 pt-4 pb-5 flex-none">
          <div
            className="flex-none w-[44px] h-[44px] rounded-[13px] overflow-hidden flex items-center justify-center"
            style={{ border: '1.5px solid rgba(212,175,55,0.5)', background: 'rgba(20,5,46,0.5)' }}
          >
            <img src="/logo-png.png" alt="Tartelah" className="w-full h-full object-contain p-1" />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div className="font-heading font-extrabold text-[20px] text-white">ترتيلة</div>
            <div className="text-[10px] font-semibold tracking-wide" style={{ color: '#E8C76A', letterSpacing: '0.08em' }}>
              Tartelah Online
            </div>
          </div>
        </div>

        {/* Teacher Profile Card */}
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Avatar
            src={user?.avatar}
            firstName={user?.firstNameAr || user?.firstName}
            lastName={user?.lastNameAr || user?.lastName}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate">
              {user?.firstNameAr} {user?.lastNameAr}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px]" style={{ color: '#b3a4d0' }}>معلم قرآن كريم</span>
            </div>
          </div>
          <div className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(124,58,237,0.3)', color: '#c4b5fd' }}>
            معلم
          </div>
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto custom-scroll px-1">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6b5a8e' }}>
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => `navi ${isActive ? 'active' : ''} justify-between`}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </span>
                {item.notification && unreadCount > 0 && (
                  <span className="bg-brand-purple text-white text-[10px] font-extrabold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-1 pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={handleLogout}
          className="navi w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          تسجيل الخروج
        </button>
      </div>
    </>
  )

  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#F8FAFC', direction: 'rtl' }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="flex-none w-[268px] flex flex-col py-5 px-3 hidden lg:flex"
        style={{
          background: 'linear-gradient(195deg, #22103f, #180a32)',
          borderInlineStart: '1px solid rgba(150,120,220,0.1)',
          boxShadow: '-6px 0 30px rgba(0,0,0,0.25)',
        }}
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
              className="fixed inset-0 z-30 lg:hidden"
              style={{ background: 'rgba(8,3,20,0.65)', backdropFilter: 'blur(3px)' }}
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 end-0 z-40 w-[268px] flex flex-col py-5 px-3 lg:hidden"
              style={{ background: 'linear-gradient(195deg, #22103f, #180a32)' }}
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

          <div className="font-heading font-bold text-base text-gray-900 hidden lg:block">
            لوحة المعلم
          </div>

          {/* Header Right: Notifications + Avatar */}
          <div className="flex items-center gap-2.5">
            <NotificationBell theme="light" viewAllPath={ROUTES.TEACHER_NOTIFICATIONS} />
            <Avatar
              src={user?.avatar}
              firstName={user?.firstNameAr || user?.firstName}
              lastName={user?.lastNameAr || user?.lastName}
              size="sm"
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-5 lg:p-8 pb-24 lg:pb-8">
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
          {MOBILE_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[9px] font-semibold transition-colors ${isActive ? 'text-violet-700' : 'text-gray-400'}`
              }
            >
              {item.icon}
              <span className="truncate w-full text-center px-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  )
}
