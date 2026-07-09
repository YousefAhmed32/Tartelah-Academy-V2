import { NavLink, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { PUBLIC_NAV, isNavItemActive } from './publicNav.config.js'

// A precision interaction system, not a pill-behind-item pattern: items sit
// inside a nearly-invisible "rail" (2.5% white, hairline ring) so the row
// reads as one designed instrument rather than loose links. The active
// route gets a leading 3px marker + a thin (not thick) gradient baseline
// under ~55% of the label, both animated with a single shared layoutId so
// they glide between routes instead of snapping. Hover gets its own
// restrained local surface + a 1px lift — never the same treatment as active.
export default function PublicDesktopNav() {
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const spring = reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }

  return (
    <nav aria-label="التنقل الرئيسي" className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
      <div className="flex items-center gap-0.5 rounded-full bg-white/[0.025] px-1.5 py-1 ring-1 ring-white/[0.05] xl:gap-1">
        {PUBLIC_NAV.map((item) => {
          const active = isNavItemActive(pathname, item)
          return (
            <div
              key={item.key}
              className={`relative ${item.tier === 'extended' ? 'hidden xl:block' : 'block'}`}
            >
              <NavLink
                to={item.to}
                end={item.end}
                aria-current={active ? 'page' : undefined}
                className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] outline-none transition-[color,background-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-brand-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0320] xl:px-4 xl:text-[14px] ${
                  active
                    ? 'bg-white/[0.045] font-semibold text-brand-gold'
                    : 'font-medium text-[#E7E0F5] hover:-translate-y-px hover:bg-white/[0.03] hover:text-brand-gold'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nc-dot"
                    className="h-[3px] w-[3px] flex-none rounded-full bg-brand-gold"
                    transition={spring}
                  />
                )}
                {item.label}
              </NavLink>
              {active && (
                <motion.span
                  layoutId="nc-line"
                  className="pointer-events-none absolute inset-x-[24%] -bottom-[1px] h-[1.5px] rounded-full bg-gradient-to-l from-transparent via-brand-gold to-transparent"
                  transition={spring}
                />
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
