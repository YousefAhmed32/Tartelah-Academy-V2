import { useMemo } from 'react'
import { Plus, Trash2, AlertCircle, CalendarCheck2, CalendarX2, CalendarClock } from 'lucide-react'
import {
  DAY_LABELS_AR, MODE_OPTIONS, QUICK_PRESETS, buildDefaultWorkingHours, validateWorkingHoursDays,
} from '../../utils/workingHours.js'

// Arabic-week display order (Saturday first) — purely presentational; the
// stored `dayOfWeek` values (0=Sunday..6=Saturday) never change, only the
// order they're rendered in.
const DISPLAY_ORDER = [6, 0, 1, 2, 3, 4, 5]

function timeInputCls(hasError) {
  return `h-9 rounded-lg border px-2 text-sm outline-none focus:ring-2 focus:ring-violet-100 ${hasError ? 'border-red-300' : 'border-gray-200 focus:border-violet-400'}`
}

/**
 * Full weekly working-hours editor — one row per day, each independently
 * set to "all day" / "unavailable" / "custom periods". Mirrors the backend's
 * validateWorkingHoursDays so invalid input (overlaps, bad ordering) is
 * caught before submission, never only after a failed request.
 *
 * value: array of { dayOfWeek, mode, periods } — pass buildDefaultWorkingHours()
 * for a brand-new teacher.
 */
export default function WorkingHoursEditor({ value, onChange, disabled = false }) {
  const days = value?.length ? value : buildDefaultWorkingHours()
  const error = useMemo(() => validateWorkingHoursDays(days), [days])

  const allDaysMode = useMemo(() => {
    const firstMode = days[0]?.mode
    return firstMode && days.every((day) => day.mode === firstMode) ? firstMode : null
  }, [days])

  function updateDay(dayOfWeek, patch) {
    onChange(days.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)))
  }

  function setMode(dayOfWeek, mode) {
    updateDay(dayOfWeek, { mode, periods: mode === 'custom' ? [{ start: '10:00', end: '18:00' }] : [] })
  }

  function applyModeToAll(mode) {
    const firstCustomPeriods = days.find((day) => day.mode === 'custom' && day.periods?.length)?.periods
    const periods = mode === 'custom'
      ? (firstCustomPeriods || [{ start: '10:00', end: '18:00' }])
      : []

    onChange(days.map((day) => ({
      ...day,
      mode,
      periods: periods.map((period) => ({ ...period })),
    })))
  }

  function applyPreset(dayOfWeek, preset) {
    updateDay(dayOfWeek, { mode: 'custom', periods: preset.periods })
  }

  function addPeriod(dayOfWeek) {
    const day = days.find((d) => d.dayOfWeek === dayOfWeek)
    updateDay(dayOfWeek, { periods: [...(day.periods || []), { start: '10:00', end: '18:00' }] })
  }

  function updatePeriod(dayOfWeek, index, field, val) {
    const day = days.find((d) => d.dayOfWeek === dayOfWeek)
    const periods = day.periods.map((p, i) => (i === index ? { ...p, [field]: val } : p))
    updateDay(dayOfWeek, { periods })
  }

  function removePeriod(dayOfWeek, index) {
    const day = days.find((d) => d.dayOfWeek === dayOfWeek)
    updateDay(dayOfWeek, { periods: day.periods.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
        <div className="mb-2.5">
          <p className="text-sm font-bold text-gray-800">تطبيق سريع على جميع الأيام</p>
          <p className="mt-0.5 text-xs text-gray-500" aria-live="polite">
            اختر حالة واحدة لتطبيقها على الأسبوع بالكامل، ويمكنك تعديل أي يوم بعد ذلك.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="تطبيق حالة أوقات العمل على جميع أيام الأسبوع">
          {[
            { value: 'full_day', label: 'متاح طوال الأسبوع', icon: CalendarCheck2 },
            { value: 'unavailable', label: 'غير متاح طوال الأسبوع', icon: CalendarX2 },
            { value: 'custom', label: 'فترات مخصصة لكل الأيام', icon: CalendarClock },
          ].map((option) => {
            const Icon = option.icon
            const selected = allDaysMode === option.value
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => applyModeToAll(option.value)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? 'border-violet-500 bg-violet-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Icon size={16} aria-hidden="true" />
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {DISPLAY_ORDER.map((dayOfWeek) => {
        const day = days.find((d) => d.dayOfWeek === dayOfWeek) || { dayOfWeek, mode: 'unavailable', periods: [] }
        return (
          <div key={dayOfWeek} className="rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-bold text-sm text-gray-800 w-24 flex-none">{DAY_LABELS_AR[dayOfWeek]}</span>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg flex-1 min-w-[220px]">
                {MODE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setMode(dayOfWeek, o.value)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all disabled:opacity-60 ${
                      day.mode === o.value ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {day.mode === 'custom' && (
              <div className="mt-3 space-y-2">
                {(day.periods || []).map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-wrap">
                    <input
                      type="time"
                      dir="ltr"
                      value={p.start}
                      disabled={disabled}
                      onChange={(e) => updatePeriod(dayOfWeek, idx, 'start', e.target.value)}
                      className={`${timeInputCls(!!error)} flex-1 min-w-[110px]`}
                      aria-label={`بداية الفترة ${idx + 1} — ${DAY_LABELS_AR[dayOfWeek]}`}
                    />
                    <span className="text-gray-400 text-xs flex-none">إلى</span>
                    <input
                      type="time"
                      dir="ltr"
                      value={p.end}
                      disabled={disabled}
                      onChange={(e) => updatePeriod(dayOfWeek, idx, 'end', e.target.value)}
                      className={`${timeInputCls(!!error)} flex-1 min-w-[110px]`}
                      aria-label={`نهاية الفترة ${idx + 1} — ${DAY_LABELS_AR[dayOfWeek]}`}
                    />
                    {day.periods.length > 1 && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removePeriod(dayOfWeek, idx)}
                        aria-label="حذف الفترة"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => addPeriod(dayOfWeek)}
                    className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors disabled:opacity-60"
                  >
                    <Plus size={13} /> إضافة فترة (فاصل = استراحة)
                  </button>
                  <span className="text-gray-300 text-xs">|</span>
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => applyPreset(dayOfWeek, preset)}
                      className="text-[11px] font-semibold text-gray-500 hover:text-violet-700 px-2 py-1 rounded-md hover:bg-violet-50 transition-colors disabled:opacity-60"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {error && (
        <div className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="flex-none" /> {error}
        </div>
      )}
    </div>
  )
}
