import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, ChevronDown, LayoutDashboard } from 'lucide-react'
import { ROUTES } from '../../config/constants.js'
import { PUBLIC_NAV } from './publicNav.config.js'

// Premium off-canvas drawer — anchored at the logical inline-end edge
// (resolves to the physical left in RTL, matching the hamburger's
// position), sliding in from off-canvas rather than a collapsed
// full-width dropdown list.
export default function MobileNavDrawer({ id, open, onClose, isAuthenticated, dashboardPath, returnFocusRef }) {
  const location = useLocation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const closeBtnRef = useRef(null)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    if (!open) return
    const initial = {}
    PUBLIC_NAV.forEach((item) => {
      if (item.type === 'group') {
        initial[item.key] = item.matchPaths.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
      }
    })
    setExpanded(initial)
    // Only re-derive the initial accordion state when the drawer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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

  function toggle(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function goToDashboard() {
    onClose()
    if (dashboardPath) navigate(dashboardPath)
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
            className="fixed inset-y-0 end-0 z-[60] flex w-[min(86vw,380px)] flex-col bg-[#0c0320] shadow-[0_0_60px_rgba(0,0,0,0.5)] lg:hidden"
            dir="rtl"
          >
            {/* Top */}
            <div className="flex flex-none items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <Link to={ROUTES.HOME} onClick={onClose} className="flex items-center gap-2.5">
                <img
                  src="/images/logo.jpg"
                  alt="ترتيلة أونلاين"
                  className="h-10 w-10 rounded-xl object-cover"
                  style={{ border: '1px solid rgba(212,175,55,0.45)' }}
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
            <nav aria-label="التنقل" className="custom-scroll flex-1 overflow-y-auto px-4 py-3">
              <div className="flex flex-col gap-1">
                {PUBLIC_NAV.map((item) => {
                  if (item.type === 'link') {
                    return (
                      <NavLink
                        key={item.key}
                        to={item.to}
                        end={item.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15.5px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-gold/70 ${
                            isActive ? 'bg-[rgba(232,199,106,0.12)] text-brand-gold' : 'text-[#EDE7F7] hover:bg-white/5'
                          }`
                        }
                      >
                        {item.Icon && <item.Icon size={19} strokeWidth={1.8} />}
                        {item.label}
                      </NavLink>
                    )
                  }

                  const isOpen = !!expanded[item.key]
                  return (
                    <div key={item.key}>
                      <button
                        type="button"
                        onClick={() => toggle(item.key)}
                        aria-expanded={isOpen}
                        aria-controls={`drawer-acc-${item.key}`}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-[15.5px] font-bold text-[#EDE7F7] outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-brand-gold/70"
                      >
                        {item.label}
                        <ChevronDown
                          size={18}
                          strokeWidth={2}
                          className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-gold' : 'text-[#a89ec8]'}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={`drawer-acc-${item.key}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-1 py-1 ps-3">
                              {item.items.map(({ label, to, Icon }) => (
                                <NavLink
                                  key={to}
                                  to={to}
                                  onClick={onClose}
                                  className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-gold/70 ${
                                      isActive ? 'bg-[rgba(232,199,106,0.1)] text-brand-gold' : 'text-[#cdbef0] hover:bg-white/5'
                                    }`
                                  }
                                >
                                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-white/5">
                                    <Icon size={15} strokeWidth={1.8} />
                                  </span>
                                  {label}
                                </NavLink>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
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
