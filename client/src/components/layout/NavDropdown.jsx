import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronDown, ArrowLeft } from 'lucide-react'

// Desktop navigation dropdown — disclosure pattern (button + real links),
// not a full ARIA menu widget: the children are destination links, not
// actions, so a simple accessible disclosure is the correct, lighter-weight
// pattern (matches how GitHub/GOV.UK build nav dropdowns).
export default function NavDropdown({ group, active }) {
  const { label, items, highlight } = group
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const closeTimer = useRef(null)
  // After a client-side route change, Chromium replays the last pointer
  // position against the freshly-mounted layout to keep :hover accurate —
  // which re-fires mouseenter on this trigger even though the cursor never
  // moved (most visible when the route change is *caused* by clicking a
  // link inside this very panel). Suppress hover-opens briefly after a
  // navigation; clicks still work immediately.
  const suppressHoverRef = useRef(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    setOpen(false)
    suppressHoverRef.current = true
    const t = setTimeout(() => { suppressHoverRef.current = false }, 400)
    return () => clearTimeout(t)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return undefined
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  function openOnHover() {
    if (suppressHoverRef.current) return
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  function openNow() {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  function closeSoon() {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={openOnHover} onMouseLeave={closeSoon}>
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-full bg-white/[0.08]"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={openNow}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            requestAnimationFrame(() => wrapRef.current?.querySelector('a')?.focus())
          }
        }}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14.5px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0320] ${
          active ? 'font-bold text-brand-gold' : 'text-[#E7E0F5] hover:text-brand-gold'
        }`}
      >
        {label}
        <ChevronDown size={15} strokeWidth={2.2} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute start-0 top-full z-50 w-[340px] pt-3"
          >
            <div
              role="group"
              aria-label={label}
              className="rounded-2xl border border-[rgba(232,199,106,0.16)] bg-[rgba(14,6,30,0.98)] p-2.5 shadow-[0_28px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            >
              <ul className="flex flex-col gap-0.5">
                {items.map(({ label: itemLabel, description, to, Icon }) => {
                  const isActive = location.pathname === to
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        onClick={() => setOpen(false)}
                        className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-gold/70 ${
                          isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-lg bg-[rgba(232,199,106,0.12)]">
                          <Icon size={17} strokeWidth={1.8} className="text-brand-gold" />
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-[14px] font-bold ${isActive ? 'text-brand-gold' : 'text-[#F3EFFA]'}`}>
                            {itemLabel}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-[#a89ec8]">
                            {description}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>

              {highlight && (
                <Link
                  to={highlight.to}
                  onClick={() => setOpen(false)}
                  className="mt-1.5 flex items-center justify-between gap-3 rounded-xl border-t border-white/[0.06] px-3 pb-1 pt-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/70"
                >
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-bold text-[#F3EFFA]">{highlight.label}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-[#a89ec8]">{highlight.description}</span>
                  </span>
                  <ArrowLeft size={16} strokeWidth={2} className="flex-none text-brand-gold" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
