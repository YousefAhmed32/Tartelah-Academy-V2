import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore.js'
import { useNotificationStore } from '../store/notificationStore.js'
import { authService } from '../services/auth.service.js'
import Avatar from '../components/ui/Avatar.jsx'
import { ROUTES, ROLES } from '../config/constants.js'

const navItems = [
  { to: ROUTES.STUDENT_DASHBOARD, label: 'الرئيسية', end: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11 12 4l9 7M5 10v9h5v-5h4v5h5v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.STUDENT_SCHEDULE, label: 'جدولي الدراسي', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.STUDENT_SESSIONS, label: 'حصصي', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.STUDENT_HOMEWORK, label: 'الواجبات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 4h8l3 3v13H5V4h3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.STUDENT_EVALUATIONS, label: 'التقييمات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16l-7-3-7 3V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 10l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.STUDENT_PROGRESS, label: 'المستويات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 15l3-4 3 3 4-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.STUDENT_ACADEMIC, label: 'السجل الأكاديمي', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M17 5h2.5a2.5 2.5 0 0 1-2.5 4M7 5H4.5A2.5 2.5 0 0 0 7 9M10 14h4M9 20h6M12 14v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> },
  { to: ROUTES.STUDENT_ENROLLMENT, label: 'التسجيل في برنامج', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 2v6h6M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.STUDENT_SUBSCRIPTION, label: 'اشتراكي', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.STUDENT_NOTIFICATIONS, label: 'الاشعارات', notification: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.STUDENT_SETTINGS, label: 'الإعدادات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14.1a1.6 1.6 0 0 0-1.5-1H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7Z" stroke="currentColor" strokeWidth="1.4"/></svg> },
]

export default function StudentLayout() {
  const { user, isAuthenticated, getRole, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (getRole() !== ROLES.STUDENT) return <Navigate to="/" replace />

  function handleLogout() {
    authService.logout().catch(() => {})  // clear httpOnly refresh-token cookie on server
    logout()                               // clear Zustand state immediately
    navigate(ROUTES.LOGIN)
  }

  return (
    <div className="flex min-h-screen bg-brand-light" style={{ direction: 'ltr' }}>

      {/* Sidebar */}
      <aside
        className={`
          flex-none w-[230px] flex flex-col py-[22px] px-4 transition-transform duration-300
          fixed inset-y-0 start-0 z-40 lg:static lg:translate-x-0
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'linear-gradient(185deg, #1d0a3f 0%, #160730 100%)', boxShadow: '6px 0 30px rgba(0,0,0,0.18)' }}
      >
        {/* Logo */}
        <div
  className="flex-none w-[56px] h-[56px] rounded-[14px] overflow-hidden flex items-center justify-center"
  style={{
    border: '1.5px solid rgba(212,175,55,0.4)',
    background: 'rgba(255,255,255,0.04)'
  }}
>
  <img
    src="/logo-png.png"
    alt="Tartelah"
    className="w-full h-full object-contain p-1"
  />
</div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scroll" style={{ direction: 'rtl' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `navi ${isActive ? 'active' : ''} justify-between`
              }
            >
              <span className="flex items-center gap-[13px]">
                {item.icon}
                {item.label}
              </span>
              {item.notification && unreadCount > 0 && (
                <span className="bg-brand-purple text-white text-xs font-extrabold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile card */}
        <div
          className="mt-3.5 rounded-[18px] p-3.5 flex items-center gap-3 cursor-pointer"
          style={{ direction: 'rtl', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={handleLogout}
        >
          <Avatar
            src={user?.avatar}
            firstName={user?.firstNameAr || user?.firstName}
            lastName={user?.lastNameAr || user?.lastName}
            size="sm"
            border
          />
          <div className="flex-1 min-w-0 leading-[1.3]">
            <div className="text-white font-bold text-sm truncate">
              {user?.firstNameAr || user?.firstName} {user?.lastNameAr || user?.lastName}
            </div>
            <div className="text-xs" style={{ color: '#a78fd6' }}>طالب</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="#a78fd6" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
      </aside>

      {/* Backdrop */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: 'rgba(8,3,20,0.6)', backdropFilter: 'blur(2px)' }}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col" style={{ direction: 'rtl' }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-4 bg-brand-light/95 backdrop-blur-sm border-b border-[#ede8f7]"
          style={{ direction: 'rtl' }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center border border-[#e8e0f5] text-brand-textBody hover:bg-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
          </button>
          <div className="hidden lg:block text-brand-textBody font-heading font-bold text-lg">
            منصة ترتيلة أونلاين
          </div>
          <div className="flex items-center gap-2.5">
            <NavLink
              to={ROUTES.STUDENT_NOTIFICATIONS}
              className="hdric relative"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="#8a7bb0" strokeWidth="1.7" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="#8a7bb0" strokeWidth="1.7" strokeLinecap="round"/></svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-brand-purple text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink to={ROUTES.STUDENT_SETTINGS}>
              <Avatar
                src={user?.avatar}
                firstName={user?.firstNameAr || user?.firstName}
                lastName={user?.lastNameAr || user?.lastName}
                size="sm"
                className="cursor-pointer"
              />
            </NavLink>
          </div>
        </div>

        {/* Page */}
        <div className="flex-1 p-5 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </div>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 flex bg-white border-t border-[#ede8f7] safe-bottom" style={{ direction: 'rtl' }}>
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors ${isActive ? 'text-brand-purple' : 'text-[#b3a4d0]'}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  )
}

function LogoIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="24.5" cy="6" r="2.2" stroke="#E8C76A" strokeWidth="1.4"/>
      <path d="M16 6.5c2.6 0 4.2 2 4.2 4.2H11.8C11.8 8.5 13.4 6.5 16 6.5Z" stroke="#E8C76A" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M16 8.7v2.2" stroke="#E8C76A" strokeWidth="1.4"/>
      <path d="M8 27V15.5c0-1 .6-1.9 1.5-2.3L16 10l6.5 3.2c.9.4 1.5 1.3 1.5 2.3V27" stroke="#E8C76A" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M13.2 27v-4.4c0-1.5 1.2-2.7 2.8-2.7s2.8 1.2 2.8 2.7V27" stroke="#E8C76A" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5.5 27h21" stroke="#E8C76A" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
