import { Check, AlertTriangle } from 'lucide-react'
import { DAY_LABELS_AR, DAY_ABBR_AR } from '../../utils/assignmentSchedule.js'

/**
 * Compact multi-select weekday chip row — the interaction pattern from the
 * teacher recurring-schedule modal, adapted for accessibility: every chip is
 * a real `<button>` with `aria-pressed` and a full-day-name `aria-label`, so
 * the short two-letter abbreviation shown visually is never the only name
 * available (screen readers announce "الأحد", not "أح"). Selected/conflict
 * states are never color-only — each carries its own icon/badge too.
 */
export default function WeekdayChipSelector({ selectedDayOfWeeks, onToggle, conflictDayOfWeeks = [] }) {
  return (
    <div role="group" aria-label="أيام الأسبوع" className="flex flex-wrap gap-2">
      {DAY_LABELS_AR.map((fullName, dow) => {
        const selected = selectedDayOfWeeks.includes(dow)
        const hasConflict = selected && conflictDayOfWeeks.includes(dow)
        return (
          <button
            key={dow}
            type="button"
            aria-pressed={selected}
            aria-label={hasConflict ? `${fullName} — يوجد تعارض` : fullName}
            title={fullName}
            onClick={() => onToggle(dow)}
            className={`relative min-w-[52px] h-11 px-3 rounded-xl text-sm font-bold border-2 transition-colors flex items-center justify-center gap-1
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500
              ${hasConflict
                ? 'bg-red-50 border-red-300 text-red-700'
                : selected
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'
              }`}
          >
            {hasConflict ? <AlertTriangle size={13} className="flex-none" /> : selected ? <Check size={13} className="flex-none" /> : null}
            <span>{DAY_ABBR_AR[dow]}</span>
          </button>
        )
      })}
    </div>
  )
}
