import { motion } from 'framer-motion'
import { EASE_CINEMATIC } from './motion.constants.js'

// Directional scroll reveal — the one primitive reused across sections, but
// parametrized by `from` so Journey/Platform/Pricing/Community each get a
// genuinely different entrance instead of the same opacity+y fade repeated.
const OFFSETS = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  'lower-right': { x: 0.6, y: 1 },
  'lower-left': { x: -0.6, y: 1 },
  center: { x: 0, y: 0, scale: 0.92 },
}

export default function RevealSection({
  as: Component = motion.div,
  from = 'up',
  distance = 48,
  delay = 0,
  duration = 0.75,
  once = true,
  viewportMargin = '-80px',
  reducedMotion = false,
  className,
  style,
  children,
  ...rest
}) {
  const preset = OFFSETS[from] || OFFSETS.up
  const x = preset.x * distance
  const y = preset.y * distance

  const initial = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, x, y, scale: preset.scale ?? 1 }
  const show = reducedMotion
    ? { opacity: 1 }
    : { opacity: 1, x: 0, y: 0, scale: 1 }

  return (
    <Component
      initial={initial}
      whileInView={show}
      viewport={{ once, margin: viewportMargin }}
      transition={{ duration: reducedMotion ? 0.4 : duration, delay: reducedMotion ? 0 : delay, ease: EASE_CINEMATIC }}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </Component>
  )
}
