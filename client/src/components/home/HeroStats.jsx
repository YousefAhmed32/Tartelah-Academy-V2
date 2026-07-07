import { useEffect, useRef, useState } from 'react'

// Same public metrics the old hero showed, just re-presented. Count-up is
// self-contained here (triggers once this rail scrolls into view) so
// HomePage no longer has to own a ref/IntersectionObserver just for this.
function useCountUp(targets, duration = 1700) {
  const [counts, setCounts] = useState({ students: 0, teachers: 0, hours: 0, rating: 0 })
  const rafRef = useRef(null)
  const startedRef = useRef(false)

  function start() {
    if (startedRef.current) return
    startedRef.current = true
    const startTime = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration)
      const e = 1 - Math.pow(1 - t, 3)
      setCounts({
        students: Math.round(targets.students * e),
        teachers: Math.round(targets.teachers * e),
        hours: Math.round(targets.hours * e),
        rating: parseFloat((targets.rating * e).toFixed(1)),
      })
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])
  return [counts, start]
}

const STAT_ICONS = {
  students: <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" stroke="#E8C76A" strokeWidth="1.6" strokeLinecap="round" />,
  teachers: <><path d="m12 4 10 5-10 5L2 9l10-5Z" stroke="#E8C76A" strokeWidth="1.6" strokeLinejoin="round" /><path d="M6 11v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" stroke="#E8C76A" strokeWidth="1.6" strokeLinecap="round" /></>,
  hours: <><circle cx="12" cy="12" r="9" stroke="#E8C76A" strokeWidth="1.6" /><path d="M12 7v5l3 3" stroke="#E8C76A" strokeWidth="1.6" strokeLinecap="round" /></>,
  rating: <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" fill="#E8C76A" />,
}

export default function HeroStats() {
  const [counts, startCount] = useCountUp({ students: 20, teachers: 120, hours: 10, rating: 4.9 })
  const railRef = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) startCount() }, { threshold: 0.3 })
    if (railRef.current) obs.observe(railRef.current)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = [
    { key: 'students', value: `+${counts.students}K`, label: 'طالب وطالبة' },
    { key: 'teachers', value: `+${counts.teachers}`, label: 'معلم متخصص' },
    { key: 'hours', value: `+${counts.hours}K`, label: 'ساعة تعليمية' },
    { key: 'rating', value: `${counts.rating.toFixed(1)}/5`, label: 'تقييم الطلاب' },
  ]

  return (
    <div ref={railRef} className="hero-stats" role="list" aria-label="إحصائيات المنصة">
      {items.map((item, i) => (
        <div key={item.key} className="hero-stats__item" role="listitem">
          {i > 0 && <span className="hero-stats__sep" aria-hidden="true" />}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="hero-stats__icon">
            {STAT_ICONS[item.key]}
          </svg>
          <div className="hero-stats__text">
            <div className="hero-stats__value">{item.value}</div>
            <div className="hero-stats__label">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
