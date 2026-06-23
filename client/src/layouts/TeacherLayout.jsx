import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore.js'
import { useNotificationStore } from '../store/notificationStore.js'
import { authService } from '../services/auth.service.js'
import Avatar from '../components/ui/Avatar.jsx'
import { ROUTES, ROLES } from '../config/constants.js'

const navItems = [
  { to: ROUTES.TEACHER_DASHBOARD, label: 'الرئيسية', end: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11 12 4l9 7M5 10v9h5v-5h4v5h5v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.TEACHER_STUDENTS, label: 'الطلاب', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.8"/><path d="M15.5 19a4 4 0 0 1 6-3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.TEACHER_SESSIONS, label: 'الحصص والجداول', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.TEACHER_ATTENDANCE, label: 'الحضور والغياب', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 10h18M8 3v4M16 3v4M8 15l2.5 2.5L16 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.TEACHER_EVALUATIONS, label: 'التقييمات والملاحظات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16l-7-3-7 3V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 10l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.TEACHER_HOMEWORK, label: 'الواجبات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 4h8l3 3v13H5V4h3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.TEACHER_PROGRESS, label: 'التقارير والإحصائيات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 16v-4M12 16V8M17 16v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.TEACHER_LINKS, label: 'روابط الحصص', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 17H7a4 4 0 0 1 0-8h2M15 7h2a4 4 0 0 1 0 8h-2M8 13h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.TEACHER_NOTIFICATIONS, label: 'الإشعارات', notification: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.TEACHER_SETTINGS, label: 'الإعدادات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8m0 9.6A1.6 1.6 0 0 0 4.6 15m14.8-6a1.6 1.6 0 0 0 .3-1.8M12 2v3m0 14v3M2 12h3m14 0h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
]

export default function TeacherLayout() {
  const { user, isAuthenticated, getRole, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (getRole() !== ROLES.TEACHER) return <Navigate to="/" replace />

  function handleLogout() {
    authService.logout().catch(() => {})  // clear httpOnly refresh-token cookie on server
    logout()                               // clear Zustand state immediately
    navigate(ROUTES.LOGIN)
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: 'linear-gradient(165deg, #1d0c3a 0%, #150729 60%, #10061f 100%)', direction: 'rtl' }}
    >
      {/* Sidebar — RIGHT side (inline-start in RTL) */}
      <aside
        className={`
          flex-none w-[262px] flex flex-col py-[26px] px-[18px] transition-transform duration-300
          fixed inset-y-0 start-0 z-40 lg:static lg:translate-x-0
          ${drawerOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'linear-gradient(195deg, #22103f, #180a32)', borderInlineStart: '1px solid rgba(150,120,220,0.1)' }}
      >
        <h2 className="font-heading font-extrabold text-[21px] text-white text-end px-2 pb-[22px]">
          لوحة تحكم المعلم
        </h2>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto custom-scroll">
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

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="navi mt-3 border border-[rgba(150,120,220,0.18)] bg-white/3 justify-start font-body"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          تسجيل الخروج
        </button>
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

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-4 backdrop-blur-sm" style={{ background: 'rgba(15,5,35,0.8)', borderBottom: '1px solid rgba(150,120,220,0.1)' }}>
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center border border-[rgba(150,120,220,0.2)] text-white/70 hover:bg-white/5 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
          </button>
          <div className="flex items-center gap-3">
            <NavLink to={ROUTES.TEACHER_NOTIFICATIONS} className="relative w-10 h-10 rounded-xl flex items-center justify-center border border-[rgba(150,120,220,0.18)] text-[#cdbef0] hover:bg-white/5 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.7"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              {unreadCount > 0 && <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-brand-purple text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>}
            </NavLink>
            <Avatar src={user?.avatar} firstName={user?.firstNameAr || user?.firstName} lastName={user?.lastNameAr || user?.lastName} size="sm" className="cursor-pointer" />
          </div>
        </div>

        <div className="flex-1 p-6 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </div>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 flex" style={{ background: 'rgba(22,7,41,0.98)', borderTop: '1px solid rgba(150,120,220,0.15)', direction: 'rtl' }}>
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors ${isActive ? 'text-brand-purple' : 'text-[#b1a0d6]'}`
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
