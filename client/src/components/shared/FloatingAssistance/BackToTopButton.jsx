import { useState, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'

// A menu item inside the unified FloatingActionStack. The stack's expand
// menu is now what gates visibility (this button no longer mounts/unmounts
// on its own scroll threshold) — but scrolling to the top when already
// there is a no-op, so it's dimmed/disabled instead of a dead click.
export default function BackToTopButton({ onNavigate }) {
  const [atTop, setAtTop] = useState(true)
  const reducedMotion = !!useReducedMotion()

  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 120)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleClick() {
    if (atTop) return
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
    onNavigate?.()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={atTop}
      aria-label="العودة إلى أعلى الصفحة"
      title="للأعلى"
      className="group flex items-center gap-3 outline-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className="fab-item-icon flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full text-white shadow-lg ring-1 ring-white/10 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:scale-[1.05] group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 group-disabled:transform-none"
        style={{
          background: 'linear-gradient(135deg, #2a1a4d, #1a1030)',
          boxShadow: '0 8px 22px rgba(0,0,0,0.4)',
          '--tw-ring-color': '#E8C76A',
          '--tw-ring-offset-color': '#0f0226',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="transition-transform duration-200 group-hover:-translate-y-0.5">
          <path d="m18 15-6-6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fab-item-label hidden md:inline-flex">للأعلى</span>
    </button>
  )
}
