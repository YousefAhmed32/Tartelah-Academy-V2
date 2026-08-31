import { Check } from 'lucide-react'
import { AUDIENCE_CATEGORY_OPTIONS } from '../../utils/studentAudience.js'

// Multi-select toggle group for a teacher's audience categories
// (أطفال/ناشئون/كبار/رجال/نساء/جميع الفئات) — a separate taxonomy from
// teaching specialization (SpecializationsMultiSelect.jsx). Same visual
// language as ShiftsMultiSelect.
export default function AudienceCategoriesMultiSelect({ value = [], onChange, label = 'الفئات المستهدفة', required = false }) {
  const toggle = (v) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-400 mb-1 block">{label}</label>}
      <div role="group" aria-label={label} className="grid grid-cols-3 gap-2">
        {AUDIENCE_CATEGORY_OPTIONS.map((o) => {
          const active = value.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(o.value)}
              className={`h-10 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                active
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
              }`}
            >
              {active && <Check size={14} />}
              {o.label}
            </button>
          )
        })}
      </div>
      {required && !value.length && (
        <p className="text-[11px] text-amber-600 mt-1.5 font-semibold">مطلوب — اختر فئة واحدة على الأقل</p>
      )}
    </div>
  )
}
