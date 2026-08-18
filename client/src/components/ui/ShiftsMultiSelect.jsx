import { Check } from 'lucide-react'
import { SHIFT_OPTIONS } from '../../utils/teacherProfile.js'

// Polished multi-select toggle group for a teacher's available shifts —
// same visual language as GenderSegmentedControl, but checkbox semantics
// (0..N selected) instead of radio semantics (exactly 1).
export default function ShiftsMultiSelect({ value = [], onChange, label = 'أوقات الشيفت المتاحة', required = false }) {
  const toggle = (v) => {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-400 mb-1 block">{label}</label>}
      <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
        {SHIFT_OPTIONS.map(o => {
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
        <p className="text-[11px] text-amber-600 mt-1.5 font-semibold">مطلوب — اختر شيفت واحد على الأقل</p>
      )}
    </div>
  )
}
