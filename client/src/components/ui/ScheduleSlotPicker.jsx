import { useMemo, useState } from 'react'
import { Clock, ChevronDown, AlertTriangle, CheckCircle2, LockKeyhole, Sparkles, TimerReset } from 'lucide-react'
import {
  formatTimeArabic12, addMinutesToTime, describeAvailability, generateTimeSlots,
  groupSlotsByPeriod, PERIOD_LABELS_AR, buildSlotStatusMap,
} from '../../utils/assignmentSchedule.js'

function SlotSkeleton() {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-8 w-16 rounded-lg bg-gray-100 animate-pulse motion-reduce:animate-none" />
      ))}
    </div>
  )
}

/**
 * Smart available-slot picker for one day (or the single daily/monthly time)
 * — never a plain free-text time input when real availability data exists.
 * `freeWindows` undefined = still loading; `[]` = genuinely nothing fits.
 */
export default function ScheduleSlotPicker({
  id, label, value, onChange, freeWindows, workingWindows, busyWindows, durationMinutes, disabled,
}) {
  const [open, setOpen] = useState(false)
  const availabilityText = useMemo(() => describeAvailability(freeWindows, durationMinutes), [freeWindows, durationMinutes])
  const slots = useMemo(() => generateTimeSlots(freeWindows, durationMinutes), [freeWindows, durationMinutes])
  const slotMap = useMemo(
    () => buildSlotStatusMap(workingWindows || freeWindows, freeWindows, durationMinutes, 15, busyWindows),
    [workingWindows, freeWindows, durationMinutes, busyWindows],
  )
  const slotStatus = useMemo(() => new Map(slotMap.map((slot) => [slot.time, slot.status])), [slotMap])
  const grouped = useMemo(() => groupSlotsByPeriod(slotMap.map((slot) => slot.time)), [slotMap])
  const valueFitsAvailability = !value || freeWindows === undefined || slots.includes(value)
  const busyCount = slotMap.filter((slot) => slot.status === 'busy').length
  const reservedCount = slotMap.filter((slot) => slot.status === 'reserved').length

  function pick(time) {
    onChange(time)
    setOpen(false)
  }

  const panelId = `${id}-slots`

  return (
    <div className="min-w-0">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-11 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center justify-between gap-2 transition-colors
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${!valueFitsAvailability ? 'border-amber-300 bg-amber-50 text-amber-700' : value ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500'}`}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          <Clock size={14} className="flex-none" />
          {value ? `${formatTimeArabic12(value)} ← ${formatTimeArabic12(addMinutesToTime(value, durationMinutes))}` : 'اختر موعدًا'}
        </span>
        <ChevronDown size={15} className={`flex-none transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {!valueFitsAvailability && (
        <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1" role="alert">
          <AlertTriangle size={11} /> هذا الموعد لم يعد متاحًا — اختر موعدًا آخر
        </p>
      )}

      <p className="text-[11px] text-gray-400 mt-1" aria-live="polite">
        {label ? `${label}: ` : ''}{availabilityText.text}
      </p>

      {open && (
        <div id={panelId} className="mt-2 rounded-xl border border-gray-200 bg-white p-3 space-y-3 shadow-lg">
          {freeWindows === undefined ? (
            <SlotSkeleton />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"><CheckCircle2 size={11} /> متاح ({slots.length})</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-red-700"><LockKeyhole size={11} /> محجوز ({busyCount})</span>
                  {reservedCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700"><TimerReset size={11} /> محجوز مؤقتًا ({reservedCount})</span>
                  )}
                </div>
                {slots[0] && (
                  <button type="button" onClick={() => pick(slots[0])}
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
                    <Sparkles size={12} /> اختيار أقرب موعد
                  </button>
                )}
              </div>
              {!slotMap.length ? (
                <p className="text-xs text-gray-500 text-center py-3">لا توجد مواعيد ضمن أوقات عمل المعلم لهذا اليوم</p>
              ) : !slots.length ? (
                <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">كل مواعيد هذا اليوم محجوزة أو لا تناسب مدة الحصة</p>
              ) : null}
              <div className="max-h-80 overflow-y-auto overscroll-contain space-y-3 pe-1">
                {['morning', 'afternoon', 'evening'].map((period) => (
                  grouped[period].length > 0 && (
                    <div key={period}>
                      <div className="text-[10px] font-bold text-gray-500 mb-1.5">{PERIOD_LABELS_AR[period]}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {grouped[period].map((t) => {
                          const status = slotStatus.get(t)
                          const available = status === 'available'
                          const reserved = status === 'reserved'
                          const selected = value === t && available
                          const statusLabel = available ? 'متاح' : reserved ? 'محجوز مؤقتًا — بانتظار الموافقة' : 'محجوز'
                          return (
                            <button
                              key={t}
                              type="button"
                              disabled={!available}
                              onClick={() => pick(t)}
                              aria-pressed={selected}
                              aria-label={`${formatTimeArabic12(t)} — ${statusLabel}`}
                              title={available ? 'موعد متاح' : reserved ? 'محجوز مؤقتًا — طلب آخر بانتظار الموافقة على هذا الموعد' : 'موعد محجوز أو ضمن الفترة الفاصلة'}
                              className={`min-h-10 px-2 rounded-lg text-xs font-bold border transition-colors inline-flex items-center justify-center gap-1
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500
                                ${selected
                                  ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                                  : available
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400'
                                    : reserved
                                      ? 'bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed opacity-90'
                                      : 'bg-red-50 border-red-200 text-red-500 cursor-not-allowed opacity-80'
                                }`}
                            >
                              {available ? <CheckCircle2 size={11} aria-hidden="true" /> : reserved ? <TimerReset size={11} aria-hidden="true" /> : <LockKeyhole size={11} aria-hidden="true" />}
                              {formatTimeArabic12(t)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
