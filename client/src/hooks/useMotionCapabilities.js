import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

// Gates pointer-only effects (tilt, magnetic buttons, cursor spotlight) and
// scales down travel distance on narrow/touch viewports — mobile gets its
// own choreography, not a shrunk desktop one.
export default function useMotionCapabilities() {
  const reducedMotionRaw = useReducedMotion()
  const reducedMotion = !!reducedMotionRaw
  const [finePointer, setFinePointer] = useState(false)
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const pointerMq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const narrowMq = window.matchMedia('(max-width: 639px)')

    setFinePointer(pointerMq.matches)
    setNarrow(narrowMq.matches)

    const onPointerChange = (e) => setFinePointer(e.matches)
    const onNarrowChange = (e) => setNarrow(e.matches)
    pointerMq.addEventListener('change', onPointerChange)
    narrowMq.addEventListener('change', onNarrowChange)
    return () => {
      pointerMq.removeEventListener('change', onPointerChange)
      narrowMq.removeEventListener('change', onNarrowChange)
    }
  }, [])

  return { reducedMotion, finePointer, narrow }
}
