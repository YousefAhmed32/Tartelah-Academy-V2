import { Check } from 'lucide-react'
import { SHIFT_OPTIONS } from '../../utils/teacherProfile.js'

/**
 * Multi-select toggle group for a teacher's available shifts:
 * [ صباحًا ] [ مساءً ] [ على مدار اليوم (24 ساعة) ]
 *
 * Adheres to the exact visual language of AudienceCategoriesMultiSelect:
 * 3 uniform buttons in a grid, seamless active violet state with checkmark,
 * and robust toggle mechanics handling 24-hour vs specific shift selection.
 */
export default function ShiftsMultiSelect({
  value = [],
  onChange,
  label = 'أوقات الشيفت المتاحة',
  required = false,
}) {
  const toggle = (v) => {
    if (v === 'full_day') {
      // Toggle full_day: if active, clear; if not, select full_day (clearing morning/evening)
      if (value.includes('full_day')) {
        onChange(value.filter((x) => x !== 'full_day'))
      } else {
        onChange(['full_day'])
      }
    } else {
      // Toggle individual shift: clear full_day if previously active
      const withoutFullDay = value.filter((x) => x !== 'full_day')
      if (withoutFullDay.includes(v)) {
        onChange(withoutFullDay.filter((x) => x !== v))
      } else {
        onChange([...withoutFullDay, v])
      }
    }
  }

  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-400 mb-1 block">{label}</label>}
      <div role="group" aria-label={label} className="grid grid-cols-3 gap-2">
        {SHIFT_OPTIONS.map((o) => {
          const active = value.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(o.value)}
              className={`h-10 sm:h-11 px-1.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors flex items-center justify-center gap-1 sm:gap-1.5 text-center leading-tight ${
                active
                  ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
              }`}
            >
              {active && <Check size={14} className="shrink-0" />}
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
      {required && !value.length && (
        <p className="text-[11px] text-amber-600 mt-1.5 font-semibold">
          مطلوب — اختر شيفت واحد على الأقل
        </p>
      )}
    </div>
  )
}
