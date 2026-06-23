import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore.js'
import { useNotificationStore } from '../store/notificationStore.js'
import { authService } from '../services/auth.service.js'
import Avatar from '../components/ui/Avatar.jsx'
import api from '../utils/api.js'
import { ROUTES, ROLES } from '../config/constants.js'

const navItems = [
  { to: ROUTES.ADMIN_DASHBOARD, label: 'الرئيسية', end: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11 12 4l9 7M5 10v9h5v-5h4v5h5v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.ADMIN_ENROLLMENTS, label: 'طلبات التسجيل', enrollment: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 2v6h6M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: ROUTES.ADMIN_STUDENTS, label: 'الطلاب', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.8"/><path d="M15.5 19a4 4 0 0 1 6-3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.ADMIN_TEACHERS, label: 'المعلمون', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.ADMIN_COURSES, label: 'الدورات والمستويات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="13" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="13" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><rect x="13" y="13" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/></svg> },
  { to: ROUTES.ADMIN_SESSIONS, label: 'الحصص والجداول', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.ADMIN_PACKAGES, label: 'الاشتراكات والباقات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/></svg> },
  { to: ROUTES.ADMIN_REPORTS, label: 'التقارير والإحصائيات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 16v-4M12 16V8M17 16v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.ADMIN_WEBSITE, label: 'إدارة الموقع', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M3 12h18M12 3c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10s1.5-7.3 4-10Z" stroke="currentColor" strokeWidth="1.8"/></svg> },
  { to: ROUTES.ADMIN_NOTIFICATIONS, label: 'الإشعارات', notification: true, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { to: ROUTES.ADMIN_SETTINGS, label: 'الإعدادات', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8m0 9.6A1.6 1.6 0 0 0 4.6 15m14.8-6a1.6 1.6 0 0 0 .3-1.8M12 2v3m0 14v3M2 12h3m14 0h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
]

export default function AdminLayout() {
  const { user, isAuthenticated, getRole, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  const { data: pendingEnrollments = 0 } = useQuery({
    queryKey: ['admin', 'enrollments', 'pending-count'],
    queryFn: () => api.get('/enrollments/pending-count').then(r => r.data.data?.count || 0),
    refetchInterval: 60000,
    enabled: isAuthenticated && getRole() === ROLES.ADMIN,
  })

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (getRole() !== ROLES.ADMIN) return <Navigate to="/" replace />

  function handleLogout() {
    authService.logout().catch(() => {})  // clear httpOnly refresh-token cookie on server
    logout()                               // clear Zustand state immediately
    navigate(ROUTES.LOGIN)
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: 'linear-gradient(160deg, #1a0a36 0%, #120526 55%, #0c0419 100%)', direction: 'ltr' }}
    >
      {/* LEFT Sidebar */}
      <aside
        className={`
          flex-none w-[248px] flex flex-col py-6 px-4 transition-transform duration-300 overflow-y-auto custom-scroll
          fixed inset-y-0 start-0 z-40 lg:static lg:translate-x-0
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'linear-gradient(190deg, #1c0d39, #140628)', borderInlineEnd: '1px solid rgba(150,120,220,0.1)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-1.5 pb-[22px]" style={{ direction: 'rtl' }}>
          <div className="flex-none w-[54px] h-[54px] rounded-[15px] flex items-center justify-center" style={{ border: '1.5px solid rgba(212,175,55,0.6)', background: 'rgba(20,5,46,0.5)' }}>
            <LogoIcon size={30} />
          </div>
          <div style={{ lineHeight: 1.12 }}>
            <div className="font-heading font-extrabold text-[24px] text-white">ترتيلة</div>
            <div className="text-[11px] tracking-[0.6px] font-semibold" style={{ color: '#a78fd6' }}>Tartelah Online</div>
          </div>
        </div>

        <nav className="flex flex-col gap-[3px] flex-1" style={{ direction: 'rtl', overflowY: 'auto' }}>
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
              <span className="flex items-center gap-[13px]">{item.icon}{item.label}</span>
              {item.notification && unreadCount > 0 && (
                <span className="bg-brand-purple text-white text-xs font-extrabold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5">{unreadCount}</span>
              )}
              {item.enrollment && pendingEnrollments > 0 && (
                <span className="bg-amber-500 text-white text-xs font-extrabold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5">{pendingEnrollments}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile */}
        <div
          className="mt-3 rounded-[16px] p-3 flex items-center gap-[11px] cursor-pointer"
          style={{ direction: 'rtl', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(150,120,220,0.12)' }}
          onClick={handleLogout}
        >
          <Avatar src={user?.avatar} firstName={user?.firstNameAr || user?.firstName} lastName={user?.lastNameAr || user?.lastName} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm truncate">{user?.firstNameAr || user?.firstName} {user?.lastNameAr || user?.lastName}</div>
            <div className="text-[#a78fd6] text-xs">مدير المنصة</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="#a78fd6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </aside>

      {/* Backdrop */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(8,3,20,0.6)', backdropFilter: 'blur(2px)' }} />
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col" style={{ direction: 'rtl' }}>
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-4 backdrop-blur-sm" style={{ background: 'rgba(12,4,25,0.85)', borderBottom: '1px solid rgba(150,120,220,0.1)' }}>
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center border border-[rgba(150,120,220,0.2)] text-white/70 hover:bg-white/5 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
          </button>
          <div className="font-heading font-bold text-lg text-white hidden lg:block">لوحة التحكم</div>
          <div className="flex items-center gap-3">
            <NavLink to={ROUTES.ADMIN_NOTIFICATIONS} className="relative w-10 h-10 rounded-xl flex items-center justify-center border border-[rgba(150,120,220,0.18)] text-[#cdbef0] hover:bg-white/5 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.7"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              {unreadCount > 0 && <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-brand-purple text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>}
            </NavLink>
            <Avatar src={user?.avatar} firstName={user?.firstNameAr || user?.firstName} lastName={user?.lastNameAr || user?.lastName} size="sm" className="cursor-pointer" />
          </div>
        </div>

        <div className="flex-1 p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function LogoIcon({ size = 30 }) {
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
