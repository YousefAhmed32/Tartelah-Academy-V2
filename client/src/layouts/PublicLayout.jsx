import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore.js'
import { ROUTES } from '../config/constants.js'

const navLinks = [
  { to: ROUTES.HOME, label: 'الرئيسية' },
  { to: ROUTES.PROGRAMS, label: 'مسارات التعلم' },
  { to: ROUTES.TEACHERS, label: 'المعلمون' },
  { to: ROUTES.PRICING, label: 'الأسعار' },
  { to: ROUTES.ABOUT, label: 'من نحن' },
  { to: ROUTES.CONTACT, label: 'تواصل معنا' },
]

export default function PublicLayout() {
  const { isAuthenticated, getDashboardPath } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-brand-dark overflow-x-hidden" dir="rtl">
      {/* Navbar */}
      <header
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-6 transition-all duration-300"
        style={{
          padding: 'clamp(13px,2vw,20px) clamp(18px,4.5vw,68px)',
          background: scrolled ? 'rgba(15,2,38,0.92)' : 'transparent',
          boxShadow: scrolled ? '0 8px 30px rgba(0,0,0,0.3)' : 'none',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        {/* Logo */}
        <Link to={ROUTES.HOME} className="flex items-center gap-[11px] flex-none">
          <img src="/images/logo.jpg" alt="ترتيلة أونلاين" className="w-[50px] h-[50px] rounded-[13px] object-cover" style={{ border: '1px solid rgba(212,175,55,0.45)', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }} />
          <div style={{ lineHeight: 1.18 }}>
            <div className="font-heading font-extrabold text-[17px] text-[#F3E6C0] tracking-[0.3px]">ترتيلة</div>
            <div className="text-[10px] tracking-[3px] font-semibold" style={{ color: '#9b7fd6' }}>ONLINE</div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8 font-medium text-base">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === ROUTES.HOME}
              className={({ isActive }) =>
                `relative text-[#E7E0F5] no-underline transition-colors duration-200 hover:text-brand-gold ${isActive ? '!text-brand-gold font-bold' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-[9px] h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, #D4AF37, #E8C76A)' }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="flex items-center gap-3 flex-none">
          {isAuthenticated ? (
            <button
              onClick={() => navigate(getDashboardPath())}
              className="btn-gold hidden sm:flex text-sm px-5 py-2.5"
            >
              لوحة التحكم
            </button>
          ) : (
            <>
              <Link
                to={ROUTES.LOGIN}
                className="btn-outline hidden md:flex text-sm px-5 py-2.5"
              >
                تسجيل الدخول
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="btn-gold hidden sm:flex text-sm px-5 py-2.5"
              >
                ابدأ رحلتك الآن
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden w-[46px] h-[46px] rounded-xl flex items-center justify-center transition-colors"
            style={{ border: '1px solid rgba(232,199,106,0.4)', background: 'rgba(255,255,255,0.05)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              {menuOpen
                ? <path d="m6 6 12 12M18 6 6 18" stroke="#E8C76A" strokeWidth="1.9" strokeLinecap="round"/>
                : <path d="M4 7h16M4 12h16M4 17h16" stroke="#E8C76A" strokeWidth="1.9" strokeLinecap="round"/>
              }
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-[76px] inset-x-0 z-40 lg:hidden flex flex-col"
            style={{ background: 'rgba(15,3,38,0.98)', backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px clamp(20px,5vw,68px) 24px', boxShadow: '0 24px 44px rgba(0,0,0,0.55)' }}
          >
            {navLinks.map((link, i) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === ROUTES.HOME}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `text-[17px] font-medium py-3.5 px-1 border-b border-white/[0.06] transition-colors ${isActive ? 'text-brand-gold font-bold' : 'text-[#E7E0F5]'} ${i === navLinks.length - 1 ? 'border-none' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="flex gap-3 mt-[18px]">
              <Link to={ROUTES.LOGIN} onClick={() => setMenuOpen(false)} className="btn-outline flex-1 text-center py-3.5 text-sm">تسجيل الدخول</Link>
              <Link to={ROUTES.REGISTER} onClick={() => setMenuOpen(false)} className="btn-gold flex-1 text-center py-3.5 text-sm">ابدأ رحلتك الآن</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content */}
      <Outlet />
    </div>
  )
}
