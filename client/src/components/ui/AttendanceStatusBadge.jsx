// Teacher's own punctuality/attendance status for a session (distinct from student attendance)
const TEACHER_STATUS = {
  pending:  { label: 'لم تُحدَّد بعد', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  on_time:  { label: 'حضر في الموعد', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  late:     { label: 'متأخر',         color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  absent:   { label: 'غائب',          color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  excused:  { label: 'معذور',         color: '#7c3aed', bg: 'rgba(124,58,237,0.15)' },
}

export default function AttendanceStatusBadge({ status, size = 'md' }) {
  const cfg = TEACHER_STATUS[status] || TEACHER_STATUS.pending
  const sizeCls = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${sizeCls}`}
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

export { TEACHER_STATUS }
