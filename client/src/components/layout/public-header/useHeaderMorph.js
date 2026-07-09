import { useEffect, useRef } from 'react'
import { useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

// Continuous scroll-driven morph — not a boolean switch. `progress` sweeps
// 0 -> 1 across MORPH_END pixels of scroll and every shell property (width
// inset, top offset, radius, blur, shadow, logo size...) is derived from it
// via useTransform in the components that consume this hook. Framer Motion
// writes MotionValues straight to the DOM on each frame, so none of this
// causes a React re-render.
//
// `retreat` is a second, direction-aware spring layered on top: scrolling
// down past a deeper threshold nudges the already-floating shell a little
// denser; scrolling back up releases it. It's driven by accumulated
// same-direction travel (hysteresis), not raw scroll position, so trackpad
// jitter right at a threshold can't flicker it — a genuine reversal is
// required before the accumulator resets.
const MORPH_END = 140
const RETREAT_ENTER_AT = 320
const RETREAT_EXIT_DELTA = 40
const DIR_NOISE_FLOOR = 4

export default function useHeaderMorph() {
  const reduced = useReducedMotion()
  const { scrollY } = useScroll()

  const rawProgress = useTransform(scrollY, [0, MORPH_END], [0, 1], { clamp: true })
  const progress = useSpring(rawProgress, reduced ? { duration: 0 } : { stiffness: 260, damping: 34, mass: 0.7 })

  const retreatTarget = useMotionValue(0)
  const retreat = useSpring(retreatTarget, reduced ? { duration: 0 } : { stiffness: 220, damping: 30 })

  const lastY = useRef(0)
  const accum = useRef(0)
  const dir = useRef(0)

  useEffect(() => {
    lastY.current = scrollY.get()

    function onChange(y) {
      const diff = y - lastY.current
      lastY.current = y

      if (y <= MORPH_END) {
        accum.current = 0
        dir.current = 0
        retreatTarget.set(0)
        return
      }

      const nextDir = diff > 0 ? 1 : diff < 0 ? -1 : dir.current
      if (nextDir !== dir.current && Math.abs(diff) > DIR_NOISE_FLOOR) {
        dir.current = nextDir
        accum.current = 0
      }
      accum.current += diff

      if (dir.current === 1 && y > RETREAT_ENTER_AT) {
        retreatTarget.set(1)
      } else if (dir.current === -1 && Math.abs(accum.current) > RETREAT_EXIT_DELTA) {
        retreatTarget.set(0)
      }
    }

    const unsubscribe = scrollY.on('change', onChange)
    onChange(scrollY.get())
    return () => unsubscribe()
  }, [scrollY, retreatTarget])

  return { progress, retreat, reduced }
}
