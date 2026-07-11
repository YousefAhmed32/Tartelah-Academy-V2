import { motion } from 'framer-motion'
import { EASE_CINEMATIC } from './motion.constants.js'

// Content emerges from a circular "portal" instead of a rectangular fade —
// reserved for the sections that should read as a distinct visual language
// (Success Stories, Community map) rather than every section doing this.
// 150% guarantees full coverage regardless of the container's aspect ratio.
export default function RadialReveal({
  children, delay = 0, duration = 1.1, reducedMotion = false,
  once = true, viewportMargin = '-100px', className, style,
}) {
  if (reducedMotion) {
    return <div className={className} style={style}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0.5 }}
      whileInView={{ clipPath: 'circle(150% at 50% 50%)', opacity: 1 }}
      viewport={{ once, margin: viewportMargin }}
      transition={{ duration, delay, ease: EASE_CINEMATIC }}
    >
      {children}
    </motion.div>
  )
}
