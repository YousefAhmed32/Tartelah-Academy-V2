import { Check, Sunrise, Sun, Sunset, Moon, Clock, Sparkles } from 'lucide-react'
import { SHIFT_OPTIONS } from '../../utils/teacherProfile.js'

// Icons map for each shift period
const SHIFT_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
  full_day: Clock,
}

// 4 discrete time-of-day periods that partition the 24 hours (6 hours each)
const QUADRANT_SHIFTS = ['morning', 'afternoon', 'evening', 'night']

/**
 * Modern 24-hour shift selector for teachers.
 * Displays discrete periods covering the entire 24-hour day plus a 1-click
 * "24/7 Full Day" master toggle to support worldwide student time zones.
 */
export default function ShiftsMultiSelect({
  value = [],
  onChange,
  label = 'أوقات الشيفت المتاحة على مدار اليوم (24 ساعة)',
  required = false,
}) {
  const isAll24h =
    value.includes('full_day') ||
    QUADRANT_SHIFTS.every((s) => value.includes(s))

  // Toggle individual shift
  const toggle = (shiftKey) => {
    if (shiftKey === 'full_day') {
      toggleAll24h()
      return
    }
    const next = value.includes(shiftKey)
      ? value.filter((x) => x !== shiftKey && x !== 'full_day')
      : [...value.filter((x) => x !== 'full_day'), shiftKey]

    // If user selected all 4 quadrant shifts, also append full_day for clean persistence
    if (QUADRANT_SHIFTS.every((s) => next.includes(s))) {
      onChange([...next, 'full_day'])
    } else {
      onChange(next)
    }
  }

  // Toggle all 24 hours at once
  const toggleAll24h = () => {
    if (isAll24h) {
      onChange([])
    } else {
      onChange([...QUADRANT_SHIFTS, 'full_day'])
    }
  }

  return (
    <div className="space-y-2">
      {/* Label and Quick 24-hour master button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {label && (
          <label className="text-xs font-bold text-gray-500 block">
            {label}
          </label>
        )}
        <button
          type="button"
          onClick={toggleAll24h}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            isAll24h
              ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm'
              : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100'
          }`}
          title="تحديد كل الفترات لتغطية اليوم بالكامل (24 ساعة)"
        >
          {isAll24h ? <Check size={13} className="text-amber-700" /> : <Sparkles size={13} />}
          <span>على مدار 24 ساعة (طوال اليوم)</span>
        </button>
      </div>

      {/* 4 Shift Cards Partitioning the 24 Hours */}
      <div role="group" aria-label={label} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {SHIFT_OPTIONS.filter((o) => o.value !== 'full_day').map((o) => {
          const active = value.includes(o.value) || value.includes('full_day')
          const Icon = SHIFT_ICONS[o.value] || Clock
          return (
            <button
              key={o.value}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(o.value)}
              className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 min-h-[68px] ${
                active
                  ? 'bg-violet-600 border-violet-600 text-white shadow-sm ring-1 ring-violet-300'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50/20'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-none ${
                  active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon size={14} />
                </span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  active ? 'bg-white text-violet-700' : 'border border-gray-300'
                }`}>
                  {active && <Check size={11} strokeWidth={3} />}
                </span>
              </div>

              <div>
                <div className="text-xs font-bold leading-tight">{o.label}</div>
                <div className={`text-[10px] mt-0.5 font-medium ${
                  active ? 'text-violet-100' : 'text-gray-400'
                }`}>
                  {o.period}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Helper text */}
      <p className="text-[11px] text-gray-400 flex items-center gap-1">
        <span>توزيع الـ 24 ساعة يضمن تلبية مواعيد الطلاب في جميع المناطق الزمنية دولياً.</span>
      </p>

      {required && !value.length && (
        <p className="text-[11px] text-amber-600 mt-1 font-semibold">
          مطلوب — اختر شيفت واحد على الأقل أو اختر على مدار 24 ساعة
        </p>
      )}
    </div>
  )
}
