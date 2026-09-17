import { Clock3 } from 'lucide-react'
import { getAcademyTimezone, getAcademyTimezoneLabel } from '../../utils/date.js'

export default function AcademyTimezoneNotice({ compact = false, className = '' }) {
  const timezone = getAcademyTimezone()
  const label = getAcademyTimezoneLabel(timezone)

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-violet-200/80 bg-violet-50/70 text-violet-900 ${compact ? 'px-3 py-2 text-[11px]' : 'px-3.5 py-3 text-xs'} ${className}`}
      role="note"
      dir="rtl"
    >
      <Clock3 size={compact ? 14 : 16} className="mt-0.5 flex-none text-violet-600" aria-hidden="true" />
      <span className="leading-relaxed">
        كل المواعيد تُحفظ وتُعرض بتوقيت الأكاديمية: <b>{label}</b>
        <span dir="ltr" className="font-semibold"> ({timezone})</span>.
      </span>
    </div>
  )
}
