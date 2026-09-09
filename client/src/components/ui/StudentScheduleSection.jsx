import { useEffect, useMemo, useState, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, Loader2, ShieldAlert,
  Copy, X, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react'
import api from '../../utils/api.js'
import TeachingSubjectCombobox from './TeachingSubjectCombobox.jsx'
import WeekdayChipSelector from './WeekdayChipSelector.jsx'
import ScheduleSlotPicker from './ScheduleSlotPicker.jsx'
import {
  DURATION_OPTIONS, TEACHING_TYPE_OPTIONS, FREQUENCY_OPTIONS,
  FREQUENCIES_WITH_WEEKDAY_PICKER, conflictLabel, dayLabel, formatTimeArabic12Strict,
  computeLocalFreeWindows, localScheduleConflicts, deriveScheduleDays,
  buildSuggestions, computeUpcomingOccurrences, validateScheduleDates,
  generateTimeSlots,
} from '../../utils/assignmentSchedule.js'

const labelCls = 'text-xs font-bold text-gray-400 mb-1 block'
const selectCls = 'w-full h-11 bg-white border-2 border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

export function emptySchedule() {
  return {
    enabled: false, specialization: '', lessonDurationMinutes: 30,
    frequency: 'weekly',
    selectedDayOfWeeks: [], dayTimes: {}, singleTime: '16:00',
    startDate: new Date().toISOString().slice(0, 10), endDate: '', noEndDate: true,
    teachingType: 'individual', notes: '',
    immediateOverride: false, overrideReason: '',
  }
}

function startDateArabic(startDate) {
  if (!startDate) return ''
  const d = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

function RecurrenceSelector({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="نمط تكرار الجدول" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {FREQUENCY_OPTIONS.map((o) => (
        <button
          key={o.value} type="button" role="radio" aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-xl border-2 px-2.5 py-2.5 text-center transition-colors
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500
            ${value === o.value ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'}`}
        >
          <div className="text-sm font-bold">{o.label}</div>
          <div className={`text-[10px] mt-0.5 ${value === o.value ? 'text-violet-100' : 'text-gray-400'}`}>{o.description}</div>
        </button>
      ))}
    </div>
  )
}

function WeeklySummaryCard({ schedule, days, timezoneLabel, studentType }) {
  if (!days.length) return null
  const isDayBased = FREQUENCIES_WITH_WEEKDAY_PICKER.includes(schedule.frequency)
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 space-y-2.5">
      <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><CalendarDays size={13} className="text-violet-600" /> الجدول الأسبوعي</div>
      {isDayBased ? (
        <ul className="space-y-1">
          {days.map((d) => (
            <li key={d.dayOfWeek} className="text-xs text-gray-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-none" />
              <span className="font-semibold text-gray-800">{dayLabel(d.dayOfWeek)}</span> — {formatTimeArabic12Strict(d.time)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-600">
          {schedule.frequency === 'daily' ? 'كل يوم' : `نفس يوم الشهر (${startDateArabic(schedule.startDate) || '—'})`} — {formatTimeArabic12Strict(schedule.singleTime)}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-500 pt-1 border-t border-gray-200">
        <div>المدة: <b className="text-gray-700">{DURATION_OPTIONS.find((o) => o.value === schedule.lessonDurationMinutes)?.label}</b></div>
        <div>التكرار: <b className="text-gray-700">{FREQUENCY_OPTIONS.find((o) => o.value === schedule.frequency)?.label}</b></div>
        <div>البداية: <b className="text-gray-700">{startDateArabic(schedule.startDate) || '—'}</b></div>
        <div>المنطقة الزمنية: <b className="text-gray-700">{timezoneLabel}</b></div>
        <div>نوع التدريس: <b className="text-gray-700">{TEACHING_TYPE_OPTIONS.find((o) => o.value === schedule.teachingType)?.label}</b></div>
        <div>موافقة المعلم: <b className="text-gray-700">{studentType === 'existing' ? 'غير مطلوبة' : 'مطلوبة'}</b></div>
      </div>
    </div>
  )
}

function MonthlyPreviewDrawer({ schedule, days }) {
  const [open, setOpen] = useState(false)
  const occurrences = useMemo(
    () => computeUpcomingOccurrences({ days, startDate: schedule.startDate, endDate: schedule.noEndDate ? null : schedule.endDate, frequency: schedule.frequency }, { windowDays: 31, maxCount: 20 }),
    [days, schedule.startDate, schedule.endDate, schedule.noEndDate, schedule.frequency]
  )
  if (!days.length) return null
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-1.5"><CalendarClock size={13} className="text-violet-600" /> معاينة الشهر الأول ({occurrences.length} حصة)</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="p-3 bg-gray-50/60 border-t border-gray-200 max-h-52 overflow-y-auto">
          {!occurrences.length ? (
            <p className="text-xs text-gray-400 text-center py-2">لا توجد حصص متوقعة ضمن هذه المدة</p>
          ) : (
            <ul className="space-y-1.5">
              {occurrences.map((o, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
                  <span>{o.date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-violet-700">{formatTimeArabic12Strict(o.time)}</span>
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100/90 rounded-full px-2 py-0.5">
                      حصة {i + 1} من {occurrences.length}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-gray-400 mt-2">معاينة تقديرية بناءً على قاعدة التكرار المختارة — الحصص الفعلية تُنشأ عند التفعيل.</p>
        </div>
      )}
    </div>
  )
}

/**
 * Schedule + assignment-path section for one student in the onboarding
 * wizard / add-student flow / edit-and-resend modal (Phase 2 Part 2 §3–§4,
 * §6–§7 — redesigned per the compact-scheduling-UX pass). Queries the real
 * availability engine for slot data and revalidates the chosen days/times
 * live — the backend always re-checks authoritatively again before saving.
 */
export default function StudentScheduleSection({
  value, onChange, teacherId, studentId, studentType, overrideAllowed,
  localWorkingHoursDays, siblingDaysList, timezoneLabel = 'توقيت الأكاديمية',
}) {
  const uid = useId()
  const [conflictCheck, setConflictCheck] = useState({ status: 'idle', conflicts: [] })
  const set = (patch) => onChange({ ...value, ...patch })
  const setDayTime = (dow, time) => set({ dayTimes: { ...value.dayTimes, [dow]: time } })

  const hasRealTeacher = !!teacherId
  const isDayBased = FREQUENCIES_WITH_WEEKDAY_PICKER.includes(value.frequency)
  const days = useMemo(() => deriveScheduleDays(value), [value.frequency, value.selectedDayOfWeeks, value.dayTimes, value.singleTime, value.startDate])

  const { data: availability, isFetching: loadingAvailability } = useQuery({
    queryKey: ['admin', 'teacher-availability', teacherId, value.lessonDurationMinutes],
    queryFn: () => api.get(`/admin/teachers/${teacherId}/availability`, { params: { durationMinutes: value.lessonDurationMinutes } }).then((r) => r.data.data),
    enabled: hasRealTeacher && !!value.enabled && !!value.lessonDurationMinutes,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const freeWindowsByDay = useMemo(() => {
    if (hasRealTeacher) {
      if (!availability) return undefined
      const map = {}
      availability.days.forEach((d) => { map[d.dayOfWeek] = d.freeWindows })
      return map
    }
    return computeLocalFreeWindows(localWorkingHoursDays, value.lessonDurationMinutes)
  }, [hasRealTeacher, availability, localWorkingHoursDays, value.lessonDurationMinutes])

  const workingWindowsByDay = useMemo(() => {
    if (!availability) return freeWindowsByDay
    const map = {}
    availability.days.forEach((d) => { map[d.dayOfWeek] = d.workingWindows || d.freeWindows })
    return map
  }, [availability, freeWindowsByDay])

  // kind-tagged ('confirmed' | 'reserved') busy intervals — lets the picker
  // show a pending reservation distinctly from a confirmed booking. Only
  // meaningful once a real teacher exists (a not-yet-created teacher has no
  // bookings at all, confirmed or reserved).
  const busyWindowsByDay = useMemo(() => {
    if (!availability) return undefined
    const map = {}
    availability.days.forEach((d) => { map[d.dayOfWeek] = d.busyWindows })
    return map
  }, [availability])

  const loadingSlots = hasRealTeacher ? loadingAvailability || freeWindowsByDay === undefined : false

  // Live conflict check — server-authoritative when the teacher already
  // exists (debounced, matches exactly what the backend re-verifies at save
  // time); a local best-effort estimate otherwise.
  useEffect(() => {
    if (!value.enabled || !days.length || !value.lessonDurationMinutes) {
      setConflictCheck({ status: 'idle', conflicts: [] })
      return
    }
    const validDays = days.filter((d) => /^([01]\d|2[0-3]):[0-5]\d$/.test(d.time))
    if (validDays.length !== days.length) {
      setConflictCheck({ status: 'idle', conflicts: [] })
      return
    }

    if (!hasRealTeacher) {
      const conflicts = localScheduleConflicts(days, value.lessonDurationMinutes, freeWindowsByDay, siblingDaysList)
      setConflictCheck({ status: conflicts.length ? 'conflict' : 'ok', conflicts })
      return
    }

    setConflictCheck({ status: 'checking', conflicts: [] })
    const timer = setTimeout(() => {
      api.post('/admin/assignments/check-availability', {
        teacherId, studentId, days, durationMinutes: value.lessonDurationMinutes,
      }).then((r) => {
        setConflictCheck({ status: r.data.data.valid ? 'ok' : 'conflict', conflicts: r.data.data.conflicts || [] })
      }).catch(() => setConflictCheck({ status: 'idle', conflicts: [] }))
    }, 450)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, studentId, value.enabled, JSON.stringify(days), value.lessonDurationMinutes, JSON.stringify(siblingDaysList)])

  // Replace stale/hardcoded times with the nearest real free slot as soon as
  // availability is known. This prevents a newly-selected day from ever
  // starting on a time the system already knows is occupied.
  useEffect(() => {
    if (!value.enabled || !freeWindowsByDay) return
    if (isDayBased) {
      const nextTimes = { ...value.dayTimes }
      let changed = false
      for (const dow of value.selectedDayOfWeeks) {
        const availableSlots = generateTimeSlots(freeWindowsByDay[dow], value.lessonDurationMinutes)
        if (!availableSlots.includes(nextTimes[dow])) {
          nextTimes[dow] = availableSlots[0] || ''
          changed = true
        }
      }
      if (changed) set({ dayTimes: nextTimes })
      return
    }
    const targetDow = days[0]?.dayOfWeek ?? 0
    const availableSlots = generateTimeSlots(freeWindowsByDay[targetDow], value.lessonDurationMinutes)
    if (!availableSlots.includes(value.singleTime)) set({ singleTime: availableSlots[0] || '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeWindowsByDay, value.lessonDurationMinutes, isDayBased, JSON.stringify(value.selectedDayOfWeeks)])

  const conflictDayOfWeeks = conflictCheck.conflicts.map((c) => c.dayOfWeek).filter((d) => Number.isInteger(d))
  // Per-day conflict `kind` ('confirmed' | 'reserved') so the inline status
  // pill can say "محجوز مؤقتًا" instead of a flat "محجوز" when the blocking
  // slot is only another pending request's temporary hold.
  const conflictKindByDay = useMemo(() => {
    const map = {}
    for (const c of conflictCheck.conflicts) { if (Number.isInteger(c.dayOfWeek)) map[c.dayOfWeek] = c.kind }
    return map
  }, [conflictCheck.conflicts])
  const { startError, endError } = validateScheduleDates(value)

  const suggestions = useMemo(() => {
    if (!isDayBased || !freeWindowsByDay) return []
    return buildSuggestions({
      days: value.selectedDayOfWeeks.map((dow) => ({ dayOfWeek: dow, time: value.dayTimes[dow] || '16:00' })),
      freeWindowsByDay, durationMinutes: value.lessonDurationMinutes,
    })
  }, [isDayBased, freeWindowsByDay, value.selectedDayOfWeeks, value.dayTimes, value.lessonDurationMinutes])

  function applySuggestion(suggestion) {
    const dayTimes = {}
    suggestion.days.forEach((d) => { dayTimes[d.dayOfWeek] = d.time })
    set({ selectedDayOfWeeks: suggestion.days.map((d) => d.dayOfWeek), dayTimes: { ...value.dayTimes, ...dayTimes } })
  }

  function toggleDay(dow) {
    const exists = value.selectedDayOfWeeks.includes(dow)
    if (exists) {
      set({ selectedDayOfWeeks: value.selectedDayOfWeeks.filter((d) => d !== dow) })
    } else {
      const copiedTime = value.selectedDayOfWeeks.length ? value.dayTimes[value.selectedDayOfWeeks[0]] : ''
      const availableSlots = generateTimeSlots(freeWindowsByDay?.[dow], value.lessonDurationMinutes)
      const defaultTime = availableSlots.includes(copiedTime) ? copiedTime : (availableSlots[0] || '')
      set({
        selectedDayOfWeeks: [...value.selectedDayOfWeeks, dow].sort((a, b) => a - b),
        dayTimes: { ...value.dayTimes, [dow]: value.dayTimes[dow] && availableSlots.includes(value.dayTimes[dow]) ? value.dayTimes[dow] : defaultTime },
      })
    }
  }

  function removeDay(dow) {
    set({ selectedDayOfWeeks: value.selectedDayOfWeeks.filter((d) => d !== dow) })
  }

  function applyTimeToAll(sourceDow) {
    const time = value.dayTimes[sourceDow]
    const dayTimes = { ...value.dayTimes }
    value.selectedDayOfWeeks.forEach((dow) => { dayTimes[dow] = time })
    set({ dayTimes })
  }

  if (!value.enabled) {
    return (
      <button
        type="button"
        onClick={() => set({ enabled: true })}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-gray-300 text-sm font-bold text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors"
      >
        <CalendarClock size={15} /> جدولة الطالب مع المعلم الآن (اختياري — يمكن لاحقًا)
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><CalendarDays size={15} className="text-violet-600" /> جدول الطالب</span>
          <button type="button" onClick={() => set({ enabled: false })} className="text-[11px] text-gray-400 hover:text-red-500 font-semibold">إلغاء الجدولة الآن</button>
        </div>

        {/* Step 1+2: specialization + duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <TeachingSubjectCombobox
              label="المنهج/التخصص"
              value={value.specialization}
              onChange={(key) => set({ specialization: key })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor={`${uid}-dur`}>مدة الحصة</label>
            <select id={`${uid}-dur`} className={selectCls} value={value.lessonDurationMinutes} onChange={(e) => set({ lessonDurationMinutes: Number(e.target.value) })}>
              {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Step 3: recurrence */}
        <div>
          <label className={labelCls}>نمط التكرار</label>
          <RecurrenceSelector value={value.frequency} onChange={(frequency) => set({ frequency })} />
        </div>

        {/* Step 4: weekday selection — weekly/biweekly only */}
        {isDayBased && (
          <div>
            <label className={labelCls}>أيام الأسبوع</label>
            <WeekdayChipSelector selectedDayOfWeeks={value.selectedDayOfWeeks} onToggle={toggleDay} conflictDayOfWeeks={conflictDayOfWeeks} />
          </div>
        )}

        {!hasRealTeacher && !localWorkingHoursDays && (
          <p className="text-[11px] text-amber-600 font-semibold">حدد بيانات المعلم أولاً لعرض المواعيد الشاغرة.</p>
        )}
        {!hasRealTeacher && (localWorkingHoursDays || value.enabled) && (
          <p className="text-[11px] text-gray-400 -mt-2">تُحسب المواعيد الشاغرة هنا من أوقات عمل المعلم المُدخلة للتو (لا توجد حجوزات سابقة لمعلم جديد).</p>
        )}

        {/* Step 5: time selection — per selected day, or one for daily/monthly */}
        {isDayBased ? (
          value.selectedDayOfWeeks.length === 0 ? (
            <p className="text-xs text-gray-400 rounded-lg bg-gray-50 px-3 py-3 text-center">اختر يومًا واحدًا على الأقل لعرض المواعيد المتاحة</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`${labelCls} mb-0`}>المواعيد</label>
                {value.selectedDayOfWeeks.length > 1 && (
                  <button type="button" onClick={() => applyTimeToAll(value.selectedDayOfWeeks[0])}
                    className="text-[11px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1">
                    <Copy size={11} /> تطبيق موعد {dayLabel(value.selectedDayOfWeeks[0])} على الجميع
                  </button>
                )}
              </div>
              {value.selectedDayOfWeeks.map((dow) => {
                const rowConflict = conflictDayOfWeeks.includes(dow)
                const rowReserved = rowConflict && conflictKindByDay[dow] === 'reserved'
                return (
                  <div key={dow} className={`rounded-xl border-2 p-2.5 flex flex-col sm:flex-row sm:items-center gap-2 ${rowConflict ? (rowReserved ? 'border-amber-200 bg-amber-50/40' : 'border-red-200 bg-red-50/40') : 'border-gray-100 bg-gray-50/40'}`}>
                    <div className="flex items-center justify-between sm:justify-start sm:w-24 flex-none gap-2">
                      <span className="text-sm font-bold text-gray-800">{dayLabel(dow)}</span>
                      <button type="button" onClick={() => removeDay(dow)} aria-label={`إزالة ${dayLabel(dow)}`}
                        className="text-gray-400 hover:text-red-500 sm:hidden"><X size={15} /></button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <ScheduleSlotPicker
                        id={`${uid}-day-${dow}`} value={value.dayTimes[dow] || ''} onChange={(t) => setDayTime(dow, t)}
                        freeWindows={freeWindowsByDay?.[dow]} workingWindows={workingWindowsByDay?.[dow]} busyWindows={busyWindowsByDay?.[dow]}
                        durationMinutes={value.lessonDurationMinutes}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-none">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${rowConflict ? (rowReserved ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700') : 'bg-emerald-50 text-emerald-700'}`}>
                        {loadingSlots ? <Loader2 size={10} className="animate-spin" /> : rowConflict ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                        {loadingSlots ? 'جارٍ التحقق' : rowConflict ? (rowReserved ? 'محجوز مؤقتًا — بانتظار الموافقة' : 'الموعد محجوز') : 'متاح'}
                      </span>
                      {value.selectedDayOfWeeks.length > 1 && (
                        <button type="button" onClick={() => applyTimeToAll(dow)} title="نسخ هذا الموعد لباقي الأيام"
                          className="w-8 h-8 flex-none rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-violet-600 hover:border-violet-300 flex items-center justify-center">
                          <Copy size={13} />
                        </button>
                      )}
                      <button type="button" onClick={() => removeDay(dow)} aria-label={`إزالة ${dayLabel(dow)}`}
                        className="hidden sm:flex w-8 h-8 flex-none rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-300 items-center justify-center">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div>
            <label className={labelCls}>{value.frequency === 'daily' ? 'الموعد اليومي' : 'موعد الحصة الشهرية'}</label>
            <ScheduleSlotPicker
              id={`${uid}-single`} value={value.singleTime} onChange={(t) => set({ singleTime: t })}
              freeWindows={freeWindowsByDay?.[days[0]?.dayOfWeek ?? 0]}
              workingWindows={workingWindowsByDay?.[days[0]?.dayOfWeek ?? 0]}
              busyWindows={busyWindowsByDay?.[days[0]?.dayOfWeek ?? 0]}
              durationMinutes={value.lessonDurationMinutes}
            />
            {value.frequency === 'monthly' && (
              <p className="text-[11px] text-gray-400 mt-1">
                سيتم تكرار الحصة في نفس يوم الشهر لتاريخ البداية{value.startDate ? ` (${new Date(`${value.startDate}T00:00:00`).getDate()} من كل شهر)` : ''}.
                {value.startDate && new Date(`${value.startDate}T00:00:00`).getDate() > 28 && ' قد يُتخطى هذا اليوم في الأشهر الأقصر تلقائيًا.'}
              </p>
            )}
          </div>
        )}

        {/* Overall conflict/status banner */}
        {days.length > 0 && (
          <div className={`text-xs rounded-lg px-3 py-2 flex items-start gap-1.5 ${
            conflictCheck.status === 'conflict' ? 'bg-red-50 text-red-600' : conflictCheck.status === 'ok' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
          }`} role="status" aria-live="polite">
            {conflictCheck.status === 'conflict' ? <AlertTriangle size={13} className="mt-0.5 flex-none" /> : conflictCheck.status === 'ok' ? <CheckCircle2 size={13} className="mt-0.5 flex-none" /> : <Loader2 size={13} className="mt-0.5 flex-none animate-spin" />}
            <div>
              {conflictCheck.status === 'checking' && 'جارٍ التحقق من توفر الموعد…'}
              {conflictCheck.status === 'ok' && 'الموعد متاح ولا يوجد تعارض.'}
              {conflictCheck.status === 'conflict' && (
                <ul className="space-y-0.5">
                  {conflictCheck.conflicts.map((c, i) => <li key={i}>{conflictLabel(c)}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 space-y-2">
            <div className="text-xs font-bold text-violet-700 flex items-center gap-1.5"><Sparkles size={13} /> جدولة مقترحة</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s.key} type="button" onClick={() => applySuggestion(s)}
                  className="text-[11px] font-bold bg-white border border-violet-200 text-violet-700 rounded-lg px-2.5 py-1.5 hover:bg-violet-100 transition-colors">
                  {s.label} — {s.description}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor={`${uid}-start`}>تاريخ البداية</label>
            <input id={`${uid}-start`} type="date" className={selectCls} value={value.startDate} onChange={(e) => set({ startDate: e.target.value })}
              aria-invalid={!!startError} aria-describedby={startError ? `${uid}-start-err` : undefined} />
            {startError ? (
              <p id={`${uid}-start-err`} className="text-[11px] text-red-600 font-semibold mt-1" role="alert">{startError}</p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1">{startDateArabic(value.startDate)}</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-400" htmlFor={`${uid}-end`}>تاريخ النهاية</label>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 cursor-pointer select-none">
                <input type="checkbox" checked={value.noEndDate} onChange={(e) => set({ noEndDate: e.target.checked, endDate: e.target.checked ? '' : value.endDate })}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-400" />
                يستمر حتى الإلغاء
              </label>
            </div>
            {value.noEndDate ? (
              <div className={`${selectCls} flex items-center text-gray-400 bg-gray-50`}>بلا تاريخ نهاية — يستمر حتى الإلغاء</div>
            ) : (
              <>
                <input id={`${uid}-end`} type="date" className={selectCls} value={value.endDate} onChange={(e) => set({ endDate: e.target.value })}
                  aria-invalid={!!endError} aria-describedby={endError ? `${uid}-end-err` : undefined} />
                {endError ? (
                  <p id={`${uid}-end-err`} className="text-[11px] text-red-600 font-semibold mt-1" role="alert">{endError}</p>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-1">{startDateArabic(value.endDate)}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Teaching type */}
        <div>
          <label className={labelCls}>نوع التدريس</label>
          <div className="grid grid-cols-2 gap-2">
            {TEACHING_TYPE_OPTIONS.map((o) => (
              <button key={o.value} type="button" onClick={() => set({ teachingType: o.value })}
                className={`h-10 rounded-xl text-xs font-bold border-2 transition-colors ${value.teachingType === o.value ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly summary + monthly preview */}
        <WeeklySummaryCard schedule={value} days={days} timezoneLabel={timezoneLabel} studentType={studentType} />
        <MonthlyPreviewDrawer schedule={value} days={days} />

        <div>
          <label className={labelCls}>ملاحظات إدارية (اختياري)</label>
          <textarea rows={2} className={`${selectCls} h-auto py-2`} value={value.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>

      {/* Assignment path — visually separate from the schedule builder itself */}
      <div className="rounded-xl border border-gray-200 bg-white p-3.5 space-y-2.5">
        {studentType === 'existing' && (
          <div className="text-xs rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2.5 font-semibold flex items-center gap-2">
            <CheckCircle2 size={15} className="flex-none" /> سيتم الإسناد مباشرة دون انتظار موافقة المعلم
          </div>
        )}

        {studentType === 'new' && (
          <div className="space-y-2">
            <div className="text-xs rounded-lg bg-amber-50 text-amber-700 px-3 py-2.5 font-semibold flex items-center gap-2">
              <CalendarClock size={15} className="flex-none" /> سيُرسل طلب إلى المعلم للموافقة قبل تفعيل الجدول
            </div>
            {overrideAllowed && (
              <>
                <label className="flex items-center gap-2 text-xs text-gray-600 font-semibold cursor-pointer select-none">
                  <input type="checkbox" checked={!!value.immediateOverride} onChange={(e) => set({ immediateOverride: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-400" />
                  اعتماد فوري بدون انتظار موافقة المعلم (صلاحية إدارية)
                </label>
                {value.immediateOverride && (
                  <div className="rounded-lg bg-red-50 p-2.5 space-y-2">
                    <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1.5"><ShieldAlert size={13} /> سيُفعَّل الجدول فورًا دون علم المعلم المسبق — يُستخدم فقط عند الضرورة.</p>
                    <textarea
                      rows={2} placeholder="سبب الاعتماد الفوري (مطلوب)"
                      className={`${selectCls} h-auto py-2`} value={value.overrideReason}
                      onChange={(e) => set({ overrideReason: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
