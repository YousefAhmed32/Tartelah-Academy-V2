import { motion, useTransform } from 'framer-motion'

// The outer <header> is a pure positioning layer — full width, no
// background, pointer-events-none — so it can never re-create the
// "full-width strip" failure mode. Every visible property (background,
// blur, border, shadow, radius, width, top offset) belongs to the inner
// shell, which is what actually morphs from an edge-to-edge hero bar into
// a detached floating rectangle with real breathing room on both sides.
//
// Material is two crossfading layers rather than one interpolated color:
// a `scrim` (the original transparent top-of-hero gradient) fades out
// while a `surface` (the floating obsidian-glass material) fades in.
// Plain `opacity` crossfades are cheap and don't need calc()-in-color
// support, so they render identically on older engines too.
export default function PublicHeaderShell({ progress, retreat, children }) {
  const marginTop = useTransform(progress, [0, 1], [0, 16])
  const maxWidth = useTransform(progress, [0, 1], [1600, 1360])
  const radius = useTransform(progress, [0, 1], [0, 22])
  // paddingTop/Bottom (physical), not paddingBlock: Framer Motion's numeric
  // px-unit whitelist doesn't reliably cover the newer logical shorthand,
  // and an un-suffixed number is invalid CSS. Block-direction padding has
  // no RTL implication, so the physical longhand is exactly equivalent here.
  const paddingY = useTransform([progress, retreat], ([p, r]) => 20 - p * 8 - r * 3)

  const scrimOpacity = useTransform(progress, [0, 1], [1, 0])
  const surfaceOpacity = useTransform(progress, [0, 1], [0, 1])
  const blurPx = useTransform(progress, [0, 1], [6, 20])
  const blurFilter = useTransform(blurPx, (v) => `blur(${v}px)`)
  const shadowAlpha = useTransform([progress, retreat], ([p, r]) => Math.min(0.4, p * 0.32 + r * 0.08))
  const boxShadow = useTransform(shadowAlpha, (v) => `0 24px 60px -18px rgba(0,0,0,${v.toFixed(3)})`)
  const borderAlpha = useTransform(progress, [0, 1], [0, 0.09])
  const borderColor = useTransform(borderAlpha, (v) => `rgba(255,255,255,${v.toFixed(3)})`)
  const highlightOpacity = useTransform(progress, [0, 1], [0, 0.7])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <motion.div
        style={{
          '--mp': progress,
          marginTop,
          maxWidth,
          borderRadius: radius,
          paddingTop: paddingY,
          paddingBottom: paddingY,
          boxShadow,
          borderColor,
        }}
        className="public-header-shell pointer-events-auto relative mx-auto overflow-hidden border border-transparent"
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: scrimOpacity,
            background: 'linear-gradient(to bottom, rgba(8,3,20,0.7) 0%, rgba(8,3,20,0.22) 100%)',
          }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: surfaceOpacity,
            backdropFilter: blurFilter,
            WebkitBackdropFilter: blurFilter,
            background: 'linear-gradient(135deg, rgba(20,11,35,0.94) 0%, rgba(10,6,18,0.9) 100%)',
          }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            opacity: highlightOpacity,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)',
          }}
        />

        <div className="relative z-10 flex items-center gap-4 px-4 sm:px-5 lg:gap-6 lg:px-6 xl:px-7">
          {children}
        </div>
      </motion.div>
    </header>
  )
}
