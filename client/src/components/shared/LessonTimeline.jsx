import Badge from '../ui/Badge.jsx'

// Renders the composed lesson-lifecycle label the backend computes in
// sessionIntelligence.service.js's getLessonTimelineLabel (status + outcome
// + teacherAcceptanceStatus + attendance, reconciled into one label) — see
// ARCHITECTURE_PLAN.md's Lesson Wallet section for why this is composed
// server-side from several fields rather than stored as one big enum.
// `timeline` is the `{ code, labelAr, color, isLate }` object as returned
// by the API; `size` controls badge sizing for dense table rows vs cards.
export default function LessonTimeline({ timeline, className = '' }) {
  if (!timeline) return null
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Badge variant={timeline.color || 'gray'} dot>{timeline.labelAr}</Badge>
      {timeline.isLate && (
        <span className="text-[11px] font-semibold text-amber-600">متأخر</span>
      )}
    </span>
  )
}
