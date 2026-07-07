import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'
import { ROUTES, getFileUrl } from '../../config/constants.js'
import Avatar from '../ui/Avatar.jsx'
import NavDropdown from './NavDropdown.jsx'
import MobileNavDrawer from './MobileNavDrawer.jsx'
import { PUBLIC_NAV, isNavItemActive } from './publicNav.config.js'

// Adaptive chrome, not route-detection: every public hero (Home, Programs,
// Courses, Teachers, Pricing, Articles, About) is authored dark at the top
// specifically so a transparent navbar with light/gold text stays legible
// (see ContactHero's own gradient comment). The one gap is article detail
// pages, which can open directly on a light background. Rather than special-
// casing routes, the header carries its own bounded dark-to-transparent
// scrim at all times — legible everywhere, fragile nowhere.
export default function PublicHeader() {
  const { isAuthenticated, user, getDashboardPath } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const ticking = useRef(false)
  const hamburgerRef = useRef(null)

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const next = window.scrollY > 28
        setScrolled((prev) => (prev === next ? prev : next))
        ticking.current = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[padding,box-shadow] duration-300 ease-out ${scrolled ? 'py-2.5' : 'py-4'}`}
        style={{
          background: scrolled
            ? 'rgba(9,3,22,0.94)'
            : 'linear-gradient(to bottom, rgba(8,3,20,0.7) 0%, rgba(8,3,20,0.24) 100%)',
          backdropFilter: scrolled ? 'blur(18px)' : 'blur(6px)',
          WebkitBackdropFilter: scrolled ? 'blur(18px)' : 'blur(6px)',
          boxShadow: scrolled ? '0 12px 32px rgba(0,0,0,0.35)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-[clamp(18px,4.5vw,68px)]">
          {/* Brand */}
          <Link to={ROUTES.HOME} className="flex flex-none items-center gap-[11px] outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70 rounded-xl">
            <img
              src="/images/logo.jpg"
              alt="ترتيلة أونلاين"
              className={`rounded-[13px] object-cover transition-[width,height] duration-300 ${scrolled ? 'h-[42px] w-[42px]' : 'h-[50px] w-[50px]'}`}
              style={{ border: '1px solid rgba(212,175,55,0.45)', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}
            />
            <div style={{ lineHeight: 1.18 }}>
              <div className="font-heading text-[17px] font-extrabold tracking-[0.3px] text-[#F3E6C0]">ترتيلة</div>
              <div className="text-[10px] font-semibold tracking-[3px]" style={{ color: '#9b7fd6' }}>ONLINE</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 lg:flex">
            {PUBLIC_NAV.map((item) => {
              const active = isNavItemActive(location.pathname, item)
              if (item.type === 'group') {
                return <NavDropdown key={item.key} group={item} active={active} />
              }
              return (
                <div key={item.key} className="relative">
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.08]"
                      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={`relative z-10 block rounded-full px-4 py-2.5 text-[14.5px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0320] ${
                      active ? 'font-bold text-brand-gold' : 'text-[#E7E0F5] hover:text-brand-gold'
                    }`}
                  >
                    {item.label}
                  </NavLink>
                </div>
              )
            })}
          </nav>

          {/* Actions */}
          <div className="flex flex-none items-center gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => navigate(getDashboardPath())}
                className="hidden items-center gap-2.5 rounded-full py-1.5 ps-1.5 pe-4 outline-none transition-colors duration-200 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-brand-gold/70 sm:flex"
              >
                <Avatar
                  src={getFileUrl(user?.avatar)}
                  firstName={user?.firstNameAr || user?.firstName}
                  lastName={user?.lastNameAr || user?.lastName}
                  size="sm"
                />
                <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#F3EFFA]">
                  <LayoutDashboard size={15} strokeWidth={2} className="text-brand-gold" />
                  لوحة التحكم
                </span>
              </button>
            ) : (
              <>
                <Link to={ROUTES.LOGIN} className="btn-outline hidden px-5 py-2.5 text-sm xl:flex">
                  تسجيل الدخول
                </Link>
                <Link to={ROUTES.REGISTER} className="btn-gold hidden px-5 py-2.5 text-sm sm:flex">
                  ابدأ رحلتك الآن
                </Link>
              </>
            )}

            {/* Hamburger */}
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              aria-controls="public-mobile-drawer"
              aria-label="فتح قائمة التنقل"
              className="grid h-[46px] w-[46px] flex-none place-items-center rounded-xl outline-none transition-colors duration-200 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-brand-gold/70 lg:hidden"
              style={{ border: '1px solid rgba(232,199,106,0.4)', background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="relative block h-[13px] w-[18px]">
                <span className="absolute inset-x-0 top-0 h-[1.9px] rounded-full bg-[#E8C76A]" />
                <span className="absolute inset-x-0 top-1/2 h-[1.9px] -translate-y-1/2 rounded-full bg-[#E8C76A]" />
                <span className="absolute inset-x-0 bottom-0 h-[1.9px] rounded-full bg-[#E8C76A]" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <MobileNavDrawer
        id="public-mobile-drawer"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAuthenticated={isAuthenticated}
        dashboardPath={isAuthenticated ? getDashboardPath() : null}
        returnFocusRef={hamburgerRef}
      />
    </>
  )
}
