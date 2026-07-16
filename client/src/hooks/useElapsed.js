import { useEffect, useState } from 'react'

// Live "how long has this session been running" counter — ticks every second
// off a start timestamp (teacherStartedAt), purely for display. Shared by the
// Sessions page and the Home Dashboard's current-session card.
export function useElapsed(startDate) {
  const [elapsed, setElapsed] = useState('00:00:00')
  useEffect(() => {
    if (!startDate) return
    function tick() {
      const diff = Math.max(0, Date.now() - new Date(startDate).getTime())
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startDate])
  return elapsed
}
