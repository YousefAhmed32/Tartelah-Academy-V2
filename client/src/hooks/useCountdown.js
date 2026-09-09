import { useEffect, useState } from 'react'

// Live "time remaining until X" ticker — companion to useElapsed.js's
// "time elapsed since X". Ticks once a minute (a session countdown never
// needs second-level precision, unlike the in-progress elapsed timer) and
// returns a friendly Arabic label plus the raw minutes remaining so callers
// can branch on it (e.g. disabling a button until it hits 0).
export function useCountdown(targetDate) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!targetDate) return
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [targetDate])

  if (!targetDate) return { label: '', minutesRemaining: null, isPast: false }
  const diffMs = new Date(targetDate).getTime() - now
  const isPast = diffMs <= 0
  const minutesRemaining = Math.max(0, Math.round(diffMs / 60000))

  let label
  if (isPast) {
    label = 'الآن'
  } else if (minutesRemaining < 1) {
    label = 'أقل من دقيقة'
  } else if (minutesRemaining < 60) {
    label = `${minutesRemaining} دقيقة`
  } else {
    const hours = Math.floor(minutesRemaining / 60)
    const mins = minutesRemaining % 60
    label = mins > 0 ? `${hours} ساعة و${mins} دقيقة` : `${hours} ساعة`
  }

  return { label, minutesRemaining, isPast }
}
