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
import { ROUTES, ROLES, getFileUrl } from '../config/constants.js'
import api from '../utils/api.js'

function ContentFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner color="border-brand-purple" />
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────
const HomeIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11 12 4l9 7M5 10v9h5v-5h4v5h5v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
const CalIcon     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
const SessIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
const HwIcon      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 4h8l3 3v13H5V4h3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
const EvalIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16l-7-3-7 3V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 10l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
const PrgIcon     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 15l3-4 3 3 4-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
const AcadIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M17 5h2.5a2.5 2.5 0 0 1-2.5 4M7 5H4.5A2.5 2.5 0 0 0 7 9M10 14h4M9 20h6M12 14v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
const EnrollIcon  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 2v6h6M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
const SubIcon     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
const BellIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
const SettIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14.1a1.6 1.6 0 0 0-1.5-1H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7Z" stroke="currentColor" strokeWidth="1.4"/></svg>
const LogoutIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
const StarIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="#E8C76A"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>
const MenuIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>

// ── Navigation groups ──────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'التعلم',
    items: [
      { to: ROUTES.STUDENT_DASHBOARD,   label: 'الرئيسية',       end: true, Icon: HomeIcon  },
      { to: ROUTES.STUDENT_SCHEDULE,    label: 'جدولي الدراسي',          Icon: CalIcon   },
      { to: ROUTES.STUDENT_SESSIONS,    label: 'حصصي',                   Icon: SessIcon  },
      { to: ROUTES.STUDENT_HOMEWORK,    label: 'الواجبات',               Icon: HwIcon    },
      { to: ROUTES.STUDENT_EVALUATIONS, label: 'التقييمات',              Icon: EvalIcon  },
      { to: ROUTES.STUDENT_PROGRESS,    label: 'المستويات',              Icon: PrgIcon   },
    ],
  },
  {
    label: 'الأكاديمي',
    items: [
      { to: ROUTES.STUDENT_ACADEMIC,     label: 'السجل الأكاديمي',       Icon: AcadIcon   },
      { to: ROUTES.STUDENT_ENROLLMENT,   label: 'التسجيل في برنامج',     Icon: EnrollIcon },
      { to: ROUTES.STUDENT_SUBSCRIPTION, label: 'اشتراكي',              Icon: SubIcon    },
    ],
  },
  {
    label: 'الحساب',
    items: [
      { to: ROUTES.STUDENT_NOTIFICATIONS, label: 'الاشعارات', notification: true, Icon: BellIcon },
      { to: ROUTES.STUDENT_SETTINGS,      label: 'الإعدادات',                    Icon: SettIcon },
    ],
  },
]

const MOBILE_ITEMS = [
  { to: ROUTES.STUDENT_DASHBOARD,     label: 'الرئيسية',   end: true, Icon: HomeIcon  },
  { to: ROUTES.STUDENT_SESSIONS,      label: 'حصصي',                  Icon: SessIcon  },
  { to: ROUTES.STUDENT_HOMEWORK,      label: 'الواجبات',              Icon: HwIcon    },
  { to: ROUTES.STUDENT_NOTIFICATIONS, label: 'إشعارات',   notification: true, Icon: BellIcon },
  { to: ROUTES.STUDENT_SETTINGS,      label: 'إعدادات',              Icon: SettIcon  },
]

// ── Layout ──────────────────────────────────────────────────────────────────
export default function StudentLayout() {
  const { user, isAuthenticated, getRole, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  useNotificationInit()

  const { data: subscription } = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: () => api.get('/subscriptions/me').then(r => r.data.data).catch(() => null),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (getRole() !== ROLES.STUDENT) return <Navigate to="/" replace />

  function handleLogout() {
    authService.logout().catch(() => {})
    logout()
    navigate(ROUTES.LOGIN)
  }

  const daysLeft = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / 86400000))
    : null
  const isSubActive = subscription?.status === 'active' && daysLeft > 0

  return (
    // RTL outer container: in RTL flex-row, first child (sidebar) is on the RIGHT
    <div className="flex min-h-screen bg-brand-light" style={{ direction: 'rtl' }}>

      {/* ═══ SIDEBAR (RIGHT) ═══ */}
      <aside
        className={[
          'flex-none w-[260px] flex flex-col',
          'fixed inset-y-0 right-0 z-40 lg:static',
          'transition-transform duration-300',
          drawerOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        ].join(' ')}
        style={{
          background: 'linear-gradient(185deg, #1d0a3f 0%, #160730 100%)',
          boxShadow: '-6px 0 30px rgba(0,0,0,0.2)',
          direction: 'rtl',
        }}
      >

        {/* Academy Identity */}
        <div
          className="flex items-center gap-3 px-5 py-5 flex-none"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="flex-none w-[48px] h-[48px] rounded-[14px] overflow-hidden flex items-center justify-center"
            style={{ border: '1.5px solid rgba(212,175,55,0.6)', background: 'rgba(20,5,46,0.5)' }}
          >
            <img src="/logo-png.png" alt="Tartelah" className="w-full h-full object-contain p-1" />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div className="font-heading font-extrabold text-[22px] text-white">ترتيلة</div>
            <div className="text-[11px] font-semibold tracking-wide" style={{ color: '#a78fd6' }}>
              Tartelah Online
            </div>
          </div>
        </div>

        {/* Student Profile */}
        <div className="px-4 pt-4 pb-3 flex-none">
          <div
            className="rounded-[18px] p-4"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                src={getFileUrl(user?.avatar)}
                firstName={user?.firstNameAr || user?.firstName}
                lastName={user?.lastNameAr || user?.lastName}
                size="sm"
                border
              />
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm truncate leading-tight">
                  {user?.firstNameAr || user?.firstName} {user?.lastNameAr || user?.lastName}
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: '#a78fd6' }}>طالب</div>
              </div>
            </div>

            {/* Subscription badge */}
            {isSubActive ? (
              <div
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: 'rgba(232,199,106,0.12)', border: '1px solid rgba(232,199,106,0.2)' }}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#E8C76A' }}>
                  <StarIcon />
                  اشتراك فعال
                </div>
                <div
                  className="text-xs font-bold"
                  style={{ color: daysLeft < 7 ? '#f59e0b' : '#E8C76A' }}
                >
                  {daysLeft} يوم
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
                لا يوجد اشتراك فعال
              </div>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex flex-col flex-1 overflow-y-auto px-3 py-2 custom-scroll">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              <div
                className="text-[10px] font-bold uppercase tracking-[0.12em] px-4 py-1 mb-1"
                style={{ color: 'rgba(167,143,214,0.45)' }}
              >
                {group.label}
              </div>
              {group.items.map(({ to, label, end, notification, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => `navi ${isActive ? 'active' : ''} justify-between`}
                >
                  <span className="flex items-center gap-[13px]">
                    <Icon />
                    {label}
                  </span>
                  {notification && unreadCount > 0 && (
                    <span className="bg-brand-purple text-white text-[11px] font-extrabold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 flex-none" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-nav text-sm font-semibold transition-all duration-200 hover:bg-white/5"
            style={{ color: 'rgba(252,165,165,0.75)' }}
          >
            <LogoutIcon />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Backdrop */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: 'rgba(8,3,20,0.65)', backdropFilter: 'blur(3px)' }}
          />
        )}
      </AnimatePresence>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 min-w-0 flex flex-col" style={{ direction: 'rtl' }}>

        {/* Top bar */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-3.5 border-b"
          style={{
            background: 'rgba(246,244,251,0.95)',
            backdropFilter: 'blur(12px)',
            borderColor: '#ede8f7',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center border border-[#e8e0f5] text-brand-textBody hover:bg-white transition-colors"
            >
              <MenuIcon />
            </button>
            <div className="hidden lg:block font-heading font-bold text-lg text-brand-textBody">
              منصة ترتيلة أونلاين
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <NotificationBell theme="light" viewAllPath={ROUTES.STUDENT_NOTIFICATIONS} />
            <NavLink to={ROUTES.STUDENT_SETTINGS}>
              <Avatar
                src={getFileUrl(user?.avatar)}
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
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<ContentFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Mobile bottom nav */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-20 flex bg-white border-t border-[#ede8f7]"
          style={{ direction: 'rtl' }}
        >
          {MOBILE_ITEMS.map(({ to, label, end, notification, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors relative ${isActive ? 'text-brand-purple' : 'text-[#b3a4d0]'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon />
                  <span>{label}</span>
                  {notification && unreadCount > 0 && (
                    <span className="absolute top-2 left-[calc(50%+8px)] w-[14px] h-[14px] rounded-full bg-brand-purple text-white text-[8px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  )
}
