import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, AlertTriangle, Check, Plus, X, ArrowLeftRight } from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Spinner from '../ui/Spinner.jsx'
import ErrorState from '../shared/ErrorState.jsx'
import ScheduleSlotPicker from '../ui/ScheduleSlotPicker.jsx'
import WeekdayChipSelector from '../ui/WeekdayChipSelector.jsx'
import { useTeachingSubjects } from '../../hooks/useTeachingSubjects.js'
import { subjectLabel } from '../../utils/teacherProfile.js'
import { formatDateAr } from '../../utils/date.js'
import {
  DAY_LABELS_AR, dayLabel, durationLabel, TEACHING_TYPE_OPTIONS,
  formatTimeArabic12Strict, generateTimeSlots,
} from '../../utils/assignmentSchedule.js'

function teachingTypeLabel(value) {
  return TEACHING_TYPE_OPTIONS.find((o) => o.value === value)?.label || 'حصص فردية'
}

/**
 * Flexible multi-day alternative-schedule proposal (Phase 2 change request
 * #2). Rebuilt from a single-slot picker into a real schedule builder: the
 * teacher starts from their CURRENT requested schedule (pre-filled, so
 * "propose an alternative" reads as "edit this schedule" rather than
 * "start from nothing"), can replace one or several days, add or remove
 * weekly sessions, and pick a different time per day — never limited to one
 * substitute slot. Every candidate slot is real, backend-computed
 * availability (never a guess), and the backend re-validates the entire
 * proposed set authoritatively at submit time regardless of what this
 * picker showed a moment earlier.
 */
export default function ProposeAlternativeTimeModal({ request, onClose, onSubmit, loading }) {
  const { data: subjects = [] } = useTeachingSubjects()
  const [selectedDayOfWeeks, setSelectedDayOfWeeks] = useState([])
  const [dayTimes, setDayTimes] = useState({})
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  const { data: availability, isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher', 'assignment-request-availability', request?._id],
    queryFn: () => api.get(`/teachers/me/assignment-requests/${request._id}/availability`).then((r) => r.data.data),
    enabled: !!request,
  })

  const durationMinutes = request?.lessonDurationMinutes || 30
  const requestedDays = useMemo(() => request?.schedule?.days || [], [request?.schedule?.days])

  // Reset picker state whenever a different request is opened — pre-filled
  // from the CURRENT schedule so editing starts from something real.
  useEffect(() => {
    setSelectedDayOfWeeks(requestedDays.map((d) => d.dayOfWeek))
    const times = {}
    requestedDays.forEach((d) => { times[d.dayOfWeek] = d.time })
    setDayTimes(times)
    setNote('')
    setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?._id])

  const freeWindowsByDay = useMemo(() => {
    if (!availability?.days) return undefined
    const map = {}
    availability.days.forEach((d) => { map[d.dayOfWeek] = d.freeWindows })
    return map
  }, [availability])
  const workingWindowsByDay = useMemo(() => {
    if (!availability?.days) return undefined
    const map = {}
    availability.days.forEach((d) => { map[d.dayOfWeek] = d.workingWindows })
    return map
  }, [availability])
  const busyWindowsByDay = useMemo(() => {
    if (!availability?.days) return undefined
    const map = {}
    availability.days.forEach((d) => { map[d.dayOfWeek] = d.busyWindows })
    return map
  }, [availability])

  function toggleDay(dow) {
    setSelectedDayOfWeeks((prev) => {
      if (prev.includes(dow)) return prev.filter((d) => d !== dow)
      return [...prev, dow].sort((a, b) => a - b)
    })
    setDayTimes((prev) => {
      if (prev[dow]) return prev
      const firstFree = generateTimeSlots(freeWindowsByDay?.[dow], durationMinutes)[0]
      return { ...prev, [dow]: firstFree || '' }
    })
  }

  function setDayTime(dow, time) {
    setDayTimes((prev) => ({ ...prev, [dow]: time }))
  }

  function applySuggestion(suggestion) {
    setSelectedDayOfWeeks((prev) => (prev.includes(suggestion.dayOfWeek) ? prev : [...prev, suggestion.dayOfWeek].sort((a, b) => a - b)))
    setDayTimes((prev) => ({ ...prev, [suggestion.dayOfWeek]: suggestion.time }))
  }

  // Real proposed days — filters out any selected day whose time has since
  // become invalid/unset. This (not raw `selectedDayOfWeeks`) is what gets
  // submitted.
  const proposedDays = useMemo(
    () => selectedDayOfWeeks.filter((dow) => dayTimes[dow]).map((dow) => ({ dayOfWeek: dow, time: dayTimes[dow] })),
    [selectedDayOfWeeks, dayTimes],
  )

  // Every selected day's chosen time must actually fit a real free window —
  // client-side gating only; the backend always re-validates authoritatively.
  const invalidDayOfWeeks = useMemo(() => {
    if (!freeWindowsByDay) return []
    return selectedDayOfWeeks.filter((dow) => {
      const time = dayTimes[dow]
      if (!time) return true
      return !generateTimeSlots(freeWindowsByDay[dow], durationMinutes).includes(time)
    })
  }, [selectedDayOfWeeks, dayTimes, freeWindowsByDay, durationMinutes])

  // Diff against the original schedule — powers the comparison panel's
  // "جديد"/"بنفس الموعد"/"تغيّر الموعد" badges and the original column's
  // "سيُحذف" strike-through, so the teacher sees exactly what changes.
  const originalByDay = useMemo(() => new Map(requestedDays.map((d) => [d.dayOfWeek, d.time])), [requestedDays])
  const dayDiffKind = (dow) => {
    if (!originalByDay.has(dow)) return 'added'
    return originalByDay.get(dow) === dayTimes[dow] ? 'unchanged' : 'changed'
  }
  const removedDays = requestedDays.filter((d) => !selectedDayOfWeeks.includes(d.dayOfWeek))

  const scheduleChanged = proposedDays.length !== requestedDays.length
    || proposedDays.some((d) => originalByDay.get(d.dayOfWeek) !== d.time)
    || removedDays.length > 0

  const hasValidProposal = proposedDays.length > 0 && invalidDayOfWeeks.length === 0 && scheduleChanged
  const canSubmit = hasValidProposal || note.trim().length > 0

  function handleSubmit() {
    if (!canSubmit) { setTouched(true); return }
    onSubmit({
      action: 'time_change',
      proposedSchedule: hasValidProposal ? { days: proposedDays } : undefined,
      note: note.trim() || undefined,
    })
  }

  if (!request) return null
  const student = request.studentId || {}

  return (
    <Modal open title="اقتراح جدول بديل" size="xl" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose} className="!bg-gray-100 !text-gray-600">إلغاء</Button>
        <Button variant="purple" loading={loading} disabled={!canSubmit} onClick={handleSubmit}>
          إرسال الاقتراح للإدارة
        </Button>
      </>}>
      <div dir="rtl" className="space-y-4">
        {/* Request summary */}
        <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5 text-xs text-gray-600">
          <div className="font-bold text-sm text-gray-900 mb-1">{student.firstNameAr} {student.lastNameAr}</div>
          <div className="grid grid-cols-2 gap-1.5">
            <div><span className="text-gray-400">المنهج:</span> {subjectLabel(subjects, request.specialization) || '—'}</div>
            <div><span className="text-gray-400">مدة الحصة (ثابتة):</span> {durationLabel(durationMinutes)}</div>
            <div><span className="text-gray-400">نوع التدريس:</span> {teachingTypeLabel(request.teachingType)}</div>
            <div><span className="text-gray-400">تاريخ البداية:</span> {formatDateAr(request.schedule?.startDate)}</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner color="border-brand-purple" /></div>
        ) : isError ? (
          <ErrorState onRetry={refetch} title="تعذّر تحميل المواعيد المتاحة" />
        ) : (
          <>
            {/* Original vs proposed comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-[11px] font-bold text-gray-400 mb-2">الجدول الحالي</div>
                <ul className="space-y-1.5">
                  {requestedDays.map((d) => {
                    const removed = !selectedDayOfWeeks.includes(d.dayOfWeek)
                    return (
                      <li key={d.dayOfWeek} className={`text-xs font-semibold flex items-center gap-1.5 ${removed ? 'text-gray-300 line-through' : 'text-gray-700'}`}>
                        <CalendarClock size={12} className="flex-none" /> {dayLabel(d.dayOfWeek)} — {formatTimeArabic12Strict(d.time)}
                        {removed && <span className="text-[10px] font-bold text-red-400 no-underline">سيُحذف</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="rounded-xl border-2 border-violet-200 bg-violet-50/40 p-3">
                <div className="text-[11px] font-bold text-violet-500 mb-2 flex items-center gap-1"><ArrowLeftRight size={12} /> الجدول المقترح</div>
                {!proposedDays.length ? (
                  <p className="text-xs text-gray-400">لم يتم اختيار أي يوم بعد</p>
                ) : (
                  <ul className="space-y-1.5">
                    {proposedDays.map((d) => {
                      const kind = dayDiffKind(d.dayOfWeek)
                      const invalid = invalidDayOfWeeks.includes(d.dayOfWeek)
                      return (
                        <li key={d.dayOfWeek} className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                          <CalendarClock size={12} className="flex-none text-violet-500" /> {dayLabel(d.dayOfWeek)} — {formatTimeArabic12Strict(d.time)}
                          {invalid ? (
                            <span className="text-[10px] font-bold text-red-500">غير متاح</span>
                          ) : kind === 'added' ? (
                            <span className="text-[10px] font-bold text-emerald-600">جديد</span>
                          ) : kind === 'changed' ? (
                            <span className="text-[10px] font-bold text-amber-600">تغيّر الموعد</span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Smart suggestions */}
            {!!availability?.suggestions?.length && (
              <div>
                <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5"><CalendarClock size={13} className="text-violet-600" /> مواعيد مقترحة (اضغط للإضافة)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {availability.suggestions.map((s) => {
                    const active = selectedDayOfWeeks.includes(s.dayOfWeek) && dayTimes[s.dayOfWeek] === s.time
                    return (
                      <button
                        key={`${s.dayOfWeek}-${s.time}`}
                        type="button"
                        onClick={() => applySuggestion(s)}
                        aria-pressed={active}
                        className={`min-h-[44px] rounded-xl border-2 p-2.5 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                          active ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 hover:border-violet-300'
                        }`}
                      >
                        <div className={`text-sm font-bold flex items-center gap-1 ${active ? 'text-white' : 'text-gray-900'}`}>
                          {active ? <Check size={13} /> : <Plus size={13} />} {dayLabel(s.dayOfWeek)} — {formatTimeArabic12Strict(s.time)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Day selection */}
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">أيام الحلقة المقترحة (اختر يومًا واحدًا أو أكثر)</div>
              <WeekdayChipSelector selectedDayOfWeeks={selectedDayOfWeeks} onToggle={toggleDay} conflictDayOfWeeks={invalidDayOfWeeks} />
            </div>

            {/* One time row per selected day — real availability, never a plain text input */}
            {selectedDayOfWeeks.length > 0 && (
              <div className="space-y-2.5">
                {selectedDayOfWeeks.map((dow) => (
                  <div key={dow} className="rounded-xl border-2 border-gray-100 bg-gray-50/40 p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center justify-between sm:justify-start sm:w-24 flex-none gap-2">
                      <span className="text-sm font-bold text-gray-800">{dayLabel(dow)}</span>
                      <button type="button" onClick={() => toggleDay(dow)} aria-label={`إزالة ${dayLabel(dow)}`}
                        className="text-gray-400 hover:text-red-500 sm:hidden"><X size={15} /></button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <ScheduleSlotPicker
                        id={`propose-alt-${dow}`} value={dayTimes[dow] || ''} onChange={(t) => setDayTime(dow, t)}
                        freeWindows={freeWindowsByDay?.[dow]} workingWindows={workingWindowsByDay?.[dow]} busyWindows={busyWindowsByDay?.[dow]}
                        durationMinutes={durationMinutes}
                      />
                    </div>
                    <button type="button" onClick={() => toggleDay(dow)} aria-label={`إزالة ${dayLabel(dow)}`}
                      className="hidden sm:flex w-9 h-9 flex-none rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-300 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add another day (any weekday not already selected) */}
            {selectedDayOfWeeks.length < 7 && (
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS_AR.map((name, dow) => !selectedDayOfWeeks.includes(dow) && (
                  <button key={dow} type="button" onClick={() => toggleDay(dow)}
                    className="min-h-[36px] px-3 rounded-lg text-xs font-bold border border-dashed border-gray-300 text-gray-500 hover:border-violet-400 hover:text-violet-600 flex items-center gap-1
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
                    <Plus size={12} /> إضافة {name}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label htmlFor="propose-note" className="text-xs font-bold text-gray-500 mb-1 block">ملاحظة {hasValidProposal ? '(اختياري)' : 'أو اكتب ملاحظة إن لم يناسبك أي موعد'}</label>
              <textarea id="propose-note" rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-violet-400"
                value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {touched && !canSubmit && (
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1" role="alert">
                <AlertTriangle size={13} /> اختر جدولاً مختلفًا عن الحالي بمواعيد متاحة، أو أضف ملاحظة توضيحية
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
