import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore.js'
import { ROUTES } from '../../../config/constants.js'
import { PUBLIC_NAV, SECONDARY_NAV, isNavItemActive } from './publicNav.config.js'

// Premium off-canvas drawer — anchored at the logical inline-end edge
// (resolves to the physical left in RTL, matching the hamburger's
// position), sliding in from off-canvas rather than a collapsed
// full-width dropdown list. Mirrors the desktop nav's flat IA: one primary
// list, no nested accordions — every destination is one tap away.
export default function MobileNavDrawer({ id, open, onClose, returnFocusRef }) {
  const location = useLocation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const closeBtnRef = useRef(null)
  const { isAuthenticated, user, getDashboardPath } = useAuthStore()

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      returnFocusRef?.current?.focus()
    }
  }, [open, onClose, returnFocusRef])

  function goToDashboard() {
    onClose()
    if (isAuthenticated) navigate(getDashboardPath())
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55] bg-[rgba(6,2,16,0.62)] backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            id={id}
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التنقل"
            initial={{ x: reduced ? 0 : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: reduced ? 0 : '-100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 end-0 z-[60] flex w-[min(86vw,380px)] flex-col shadow-[0_0_60px_rgba(0,0,0,0.55)] lg:hidden"
            style={{ background: 'linear-gradient(165deg, rgba(20,11,35,0.99) 0%, rgba(10,6,18,0.99) 100%)' }}
            dir="rtl"
          >
            {/* Top */}
            <div className="flex flex-none items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <Link to={ROUTES.HOME} onClick={onClose} className="flex items-center gap-2.5">
                <img
                  src="/images/logo.jpg"
                  alt="ترتيلة أونلاين"
                  className="h-10 w-10 rounded-[10px] object-cover ring-1 ring-white/[0.09]"
                />
                <span className="font-heading text-[15px] font-extrabold text-[#F3E6C0]">ترتيلة أونلاين</span>
              </Link>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label="إغلاق القائمة"
                className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-white/10 text-[#E8C76A] outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-brand-gold/70"
              >
                <X size={19} strokeWidth={2} />
              </button>
            </div>

            {/* Nav body */}
            <nav aria-label="التنقل" className="custom-scroll flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-col gap-1">
                {PUBLIC_NAV.map((item) => {
                  const active = isNavItemActive(location.pathname, item)
                  return (
                    <NavLink
                      key={item.key}
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center rounded-xl border-s-2 px-4 py-3.5 text-[15.5px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-gold/70 ${
                        active
                          ? 'border-s-brand-gold bg-white/[0.045] text-brand-gold'
                          : 'border-s-transparent text-[#EDE7F7] hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>

              <div className="mt-5 border-t border-white/[0.06] pt-4">
                <div className="px-4 pb-2 text-[12px] font-bold tracking-wide text-[#7a6ba0]">المزيد</div>
                <div className="flex flex-col gap-1">
                  {SECONDARY_NAV.map((item) => {
                    const active = isNavItemActive(location.pathname, item)
                    return (
                      <NavLink
                        key={item.key}
                        to={item.to}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center rounded-xl border-s-2 px-4 py-3 text-[14.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-gold/70 ${
                          active
                            ? 'border-s-brand-gold bg-white/[0.04] text-brand-gold'
                            : 'border-s-transparent text-[#cdbef0] hover:bg-white/5'
                        }`}
                      >
                        {item.label}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            </nav>

            {/* Bottom CTA */}
            <div className="flex-none border-t border-white/[0.06] px-5 py-5">
              {isAuthenticated ? (
                <button
                  onClick={goToDashboard}
                  className="btn-gold flex w-full items-center justify-center gap-2 py-3.5 text-sm"
                >
                  <LayoutDashboard size={17} strokeWidth={2} />
                  لوحة التحكم
                </button>
              ) : (
                <div className="flex gap-3">
                  <Link to={ROUTES.LOGIN} onClick={onClose} className="btn-outline flex-1 py-3.5 text-center text-sm">
                    تسجيل الدخول
                  </Link>
                  <Link to={ROUTES.REGISTER} onClick={onClose} className="btn-gold flex-1 py-3.5 text-center text-sm">
                    ابدأ رحلتك الآن
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
