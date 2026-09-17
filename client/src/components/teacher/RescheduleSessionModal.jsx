import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  CalendarClock,
  Check,
  Calendar,
  Clock,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Avatar from '../ui/Avatar.jsx'
import {
  academyDateKey,
  formatDateAr,
  formatDateKeyAr,
  formatTimeAr,
  shiftDateKey,
  toAcademyDateTimeLocal,
} from '../../utils/date.js'
import { formatTimeArabic12Strict } from '../../utils/assignmentSchedule.js'
import { getFileUrl } from '../../config/constants.js'

const QUICK_REASONS = [
  'ظرف طارئ للطالب',
  'ظرف طارئ للمعلم',
  'عطل في الإنترنت أو الكهرباء',
  'بناءً على طلب ولي الأمر',
]

export default function RescheduleSessionModal({ open, onClose, session, onSuccess }) {
  const qc = useQueryClient()

  // Base dates from session in academy timezone
  const originalDate = useMemo(() => {
    return session?.scheduledAt ? new Date(session.scheduledAt) : new Date()
  }, [session?.scheduledAt])

  const baseDateKey = useMemo(() => academyDateKey(originalDate), [originalDate])
  const originalTimeStr = useMemo(() => {
    try {
      const dt = toAcademyDateTimeLocal(originalDate)
      return dt.slice(11, 16) || '12:00'
    } catch {
      return '12:00'
    }
  }, [originalDate])

  // Presets definition: tomorrow (+1), +2 days, +3 days, next week (+7)
  const presets = useMemo(() => {
    const p1 = shiftDateKey(baseDateKey, 1)
    const p2 = shiftDateKey(baseDateKey, 2)
    const p3 = shiftDateKey(baseDateKey, 3)
    const p7 = shiftDateKey(baseDateKey, 7)

    return [
      { key: 'tomorrow', label: 'غداً', dateKey: p1, helper: formatDateKeyAr(p1).replace(/، \d{4}$/, '') },
      { key: 'plus2', label: 'بعد يومين', dateKey: p2, helper: formatDateKeyAr(p2).replace(/، \d{4}$/, '') },
      { key: 'plus3', label: 'بعد 3 أيام', dateKey: p3, helper: formatDateKeyAr(p3).replace(/، \d{4}$/, '') },
      { key: 'nextWeek', label: 'الأسبوع القادم', dateKey: p7, helper: formatDateKeyAr(p7).replace(/، \d{4}$/, '') },
    ]
  }, [baseDateKey])

  // Form states
  const [activePreset, setActivePreset] = useState('tomorrow')
  const [selectedDateKey, setSelectedDateKey] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [isCustomTime, setIsCustomTime] = useState(false)
  const [reason, setReason] = useState('')

  // Initialize values whenever modal opens or session changes
  useEffect(() => {
    if (open && session) {
      const defaultTomorrow = shiftDateKey(baseDateKey, 1)
      setSelectedDateKey(defaultTomorrow)
      setSelectedTime(originalTimeStr)
      setActivePreset('tomorrow')
      setIsCustomTime(false)
      setReason('')
    }
  }, [open, session, baseDateKey, originalTimeStr])

  // Select a preset button
  const handleSelectPreset = (presetKey) => {
    setActivePreset(presetKey)
    const matched = presets.find((p) => p.key === presetKey)
    if (matched) {
      setSelectedDateKey(matched.dateKey)
    }
  }

  // Combined datetime string: YYYY-MM-DDTHH:mm
  const combinedDateTime = useMemo(() => {
    if (!selectedDateKey || !selectedTime) return ''
    return `${selectedDateKey}T${selectedTime}`
  }, [selectedDateKey, selectedTime])

  // Human readable preview of the new appointment
  const previewSummary = useMemo(() => {
    if (!selectedDateKey) return null
    const dateText = formatDateKeyAr(selectedDateKey)
    const timeText = formatTimeArabic12Strict(selectedTime) || selectedTime
    return { dateText, timeText }
  }, [selectedDateKey, selectedTime])

  // Mutation
  const mutation = useMutation({
    mutationFn: () => {
      if (!combinedDateTime) throw new Error('يرجى تحديد الموعد البديل للحصة')
      return api.patch(`/sessions/${session._id}/reschedule`, {
        newDate: combinedDateTime,
        changeType: 'postpone',
        reason: reason.trim(),
      })
    },
    onSuccess: (res) => {
      toast.success('تم تأجيل الحصة بنجاح وإشعار الطالب بالموعد الجديد')
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      onSuccess?.(res.data?.data)
      onClose()
    },
    onError: (e) => toast.error(e?.response?.data?.message || e.message || 'حدث خطأ في تأجيل الحصة'),
  })

  if (!session) return null

  const student = session.studentId
  const studentName = student && typeof student === 'object' && student.firstNameAr
    ? `${student.firstNameAr} ${student.lastNameAr || ''}`.trim()
    : (student?.name || 'الطالب')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تأجيل موعد الحصة"
      size="md"
      panelClassName="border border-slate-200/90 shadow-2xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !combinedDateTime}
            className="px-6 py-2.5 rounded-xl text-sm font-heading font-extrabold text-white bg-violet-600 hover:bg-violet-700 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {mutation.isPending ? (
              <span>جارٍ التأجيل...</span>
            ) : (
              <>
                <Check size={16} strokeWidth={2.5} />
                <span>تأكيد تأجيل الحصة</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-start" dir="rtl">
        {/* ── Top Bar: Clean Compact Student & Current Schedule ── */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={getFileUrl(student?.avatar)}
              firstName={student?.firstNameAr}
              lastName={student?.lastNameAr}
              size="sm"
              className="ring-1 ring-slate-200 flex-none"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{studentName}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>الموعد الحالي:</span>
                <strong className="text-slate-700 font-semibold">{formatDateAr(session.scheduledAt)} • {formatTimeAr(session.scheduledAt)}</strong>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs flex-none">
            {session.durationMinutes || 60} دقيقة
          </span>
        </div>

        {/* ── Section: Quick Date Presets (2x2 Grid + Custom Toggle) ── */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            اختر اليوم البديل:
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            {presets.map((p) => {
              const isSelected = activePreset === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPreset(p.key)}
                  className={`p-3 rounded-2xl border-2 text-start transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                    isSelected
                      ? 'bg-violet-50/80 border-violet-600 text-violet-950 shadow-xs ring-1 ring-violet-200'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-sm font-heading font-extrabold ${isSelected ? 'text-violet-700' : 'text-slate-900'}`}>
                      {p.label}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center flex-none">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold mt-1 block ${isSelected ? 'text-violet-800' : 'text-slate-500'}`}>
                    {p.helper}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Custom Date Option */}
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setActivePreset('custom')}
              className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activePreset === 'custom'
                  ? 'bg-violet-50/80 border-violet-600 text-violet-900 ring-1 ring-violet-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-violet-600 flex-none" />
                <span>اختيار تاريخ آخر من التقويم</span>
              </div>
              {activePreset === 'custom' && selectedDateKey && (
                <span className="text-violet-700 font-extrabold text-xs">{formatDateKeyAr(selectedDateKey)}</span>
              )}
            </button>

            {activePreset === 'custom' && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <input
                  type="date"
                  min={academyDateKey(new Date())}
                  value={selectedDateKey}
                  onChange={(e) => setSelectedDateKey(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
                {selectedDateKey && (
                  <div className="text-xs font-bold text-violet-700">
                    اليوم المحدد: {formatDateKeyAr(selectedDateKey)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Section: Clean Time Row ── */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-violet-600 flex-none" />
            <div>
              <span className="text-xs font-bold text-slate-800 block">ساعة بدء الحصة:</span>
              <span className="text-[11px] text-slate-500">
                {!isCustomTime ? 'في نفس التوقيت المعتاد' : 'توقيت مخصص'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCustomTime ? (
              <>
                <span className="font-heading font-extrabold text-xs text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                  {formatTimeArabic12Strict(originalTimeStr)}
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomTime(true)}
                  className="text-xs font-bold text-violet-600 hover:text-violet-700 underline underline-offset-4 px-1 cursor-pointer"
                >
                  تغيير
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="h-8 bg-white border border-violet-400 rounded-xl px-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-violet-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTime(false)
                    setSelectedTime(originalTimeStr)
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 underline px-1 cursor-pointer"
                >
                  استعادة
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Section: Symmetrical Reason Chips + Clean Input ── */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5">
            سبب التأجيل (اختياري):
          </label>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {QUICK_REASONS.map((q) => {
              const isSelected = reason === q
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setReason(isSelected ? '' : q)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer truncate text-center ${
                    isSelected
                      ? 'bg-violet-100 border border-violet-400 text-violet-900 shadow-2xs font-bold'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-transparent'
                  }`}
                >
                  {q}
                </button>
              )
            })}
          </div>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="أو اكتب سبباً آخر هنا..."
            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
          />
        </div>

        {/* ── Section: Sleek Confirmation Banner ── */}
        {previewSummary && (
          <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-indigo-50/40 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-700">الموعد الجديد بعد التأجيل:</span>
              <span className="text-[11px] font-semibold text-slate-500">بتوقيت القاهرة</span>
            </div>
            <div className="text-sm sm:text-base font-heading font-extrabold text-slate-900 mt-1">
              {previewSummary.dateText} — الساعة {previewSummary.timeText}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600 flex-none" />
              <span>سيتم إشعار الطالب تلقائياً بالموعد الجديد دون خصم رصيد.</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
