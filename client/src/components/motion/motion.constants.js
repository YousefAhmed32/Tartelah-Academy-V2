// Shared motion language for the homepage's cinematic choreography system.
// One set of curves/springs/viewport configs reused everywhere so the whole
// page reads as one directed experience instead of per-section one-offs.

export const EASE_CINEMATIC = [0.16, 1, 0.3, 1]
export const EASE_SOFT = [0.22, 0.85, 0.22, 1]

export const SPRING_SOFT = { type: 'spring', stiffness: 260, damping: 28, mass: 0.7 }
export const SPRING_SNAPPY = { type: 'spring', stiffness: 340, damping: 30, mass: 0.6 }

export const VIEWPORT_ONCE = { once: true, margin: '-80px' }
export const VIEWPORT_ONCE_TIGHT = { once: true, margin: '-40px' }

// Orchestration helpers — paired with StaggerGroup.jsx's container so a
// group of cards reveals as one cascade instead of N independent triggers.
export function staggerContainer(staggerChildren = 0.12, delayChildren = 0) {
  return { hidden: {}, show: { transition: { staggerChildren, delayChildren } } }
}

export function itemVariant({ x = 0, y = 0, scale = 1, duration = 0.7, ease } = {}) {
  return {
    hidden: { opacity: 0, x, y, scale },
    show: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration, ease } },
  }
}
