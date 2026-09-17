import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, Check, Clock3, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import { formatDateAr, formatTimeAr, shiftDateKey, toAcademyDateTimeLocal } from '../../utils/date.js'
import { formatSessionTitle } from '../../utils/sessionTitle.js'
import AcademyTimezoneNotice from '../ui/AcademyTimezoneNotice.jsx'
import Spinner from '../ui/Spinner.jsx'

const FIELD = 'w-full h-11 rounded-xl border-2 border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-gray-50 disabled:text-gray-400'
const TEXTAREA = 'w-full min-h-20 rounded-xl border-2 border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none resize-y transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
const LABEL = 'mb-1.5 block text-xs font-bold text-gray-600'

function shiftDateTimeLocal(value, days) {
  const [dateKey, time = '00:00'] = String(value || '').split('T')
  const shifted = shiftDateKey(dateKey, days)
  return shifted ? `${shifted}T${time}` : ''
}

export default function AdminSessionScheduleEditor({ open, session, mode = 'edit', onClose, onSaved }) {
  const qc = useQueryClient()
  const [changeType, setChangeType] = useState('reschedule')
  const [form, setForm] = useState({})

  useEffect(() => {
    if (!session || !open) return
    setChangeType(mode === 'reschedule' ? 'reschedule' : 'edit')
    setForm({
      titleAr: session.titleAr || '',
      scheduledAt: toAcademyDateTimeLocal(session.scheduledAt),
      durationMinutes: session.durationMinutes || 60,
      meetingProvider: session.meetingProvider || 'zoom',
      meetingLink: session.meetingLink || '',
      notes: session.notes || '',
      reason: '',
    })
  }, [mode, open, session])

  const originalLocal = useMemo(() => toAcademyDateTimeLocal(session?.scheduledAt), [session?.scheduledAt])
  const appointmentChanged = !!form.scheduledAt && form.scheduledAt !== originalLocal
  const isRescheduleMode = mode === 'reschedule'

  const mutation = useMutation({
    mutationFn: () => {
      if (isRescheduleMode) {
        return api.patch(`/sessions/${session._id}/reschedule`, {
          newDate: form.scheduledAt,
          changeType,
          reason: form.reason,
        }).then((r) => r.data.data)
      }
      return api.patch(`/admin/sessions/${session._id}`, {
        titleAr: form.titleAr,
        scheduledAt: form.scheduledAt,
        durationMinutes: Number(form.durationMinutes),
        meetingProvider: form.meetingProvider,
        meetingLink: form.meetingLink,
        notes: form.notes,
      }).then((r) => r.data.data)
    },
    onSuccess: (updatedSession) => {
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin', 'operations'] })
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      toast.success(
        isRescheduleMode
          ? (changeType === 'postpone' ? 'تم تأجيل الحصة وإشعار المعلم والطالب' : 'تم تغيير الموعد وإشعار المعلم والطالب')
          : 'تم حفظ تعديلات الحصة'
      )
      const mergedSession = {
        ...session,
        ...updatedSession,
        studentId: updatedSession?.studentId && typeof updatedSession.studentId === 'object'
          ? updatedSession.studentId
          : session.studentId,
        teacherId: updatedSession?.teacherId && typeof updatedSession.teacherId === 'object'
          ? updatedSession.teacherId
          : session.teacherId,
      }
      onSaved?.(mergedSession)
      onClose()
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'تعذر حفظ التعديلات'),
  })

  if (!session || typeof document === 'undefined') return null

  const submit = (event) => {
    event.preventDefault()
    if (!form.scheduledAt) return toast.error('حدد التاريخ والوقت الجديد')
    if (isRescheduleMode && !appointmentChanged) return toast.error('اختر موعدًا مختلفًا عن الموعد الحالي')
    mutation.mutate()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4" dir="rtl">
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(8,3,20,0.72)] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${isRescheduleMode ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'}`}>
                  {isRescheduleMode ? <CalendarClock size={20} /> : <Edit2 size={19} />}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-lg font-extrabold text-gray-900">
                    {isRescheduleMode ? 'تأجيل أو تغيير موعد الحصة' : 'تعديل الحصة'}
                  </h2>
                  <p className="truncate text-xs text-gray-500">{formatSessionTitle(session)}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-xs text-gray-700">
                <Clock3 size={15} className="flex-none text-violet-600" />
                <span>الموعد الحالي: <b>{formatDateAr(session.scheduledAt)} — {formatTimeAr(session.scheduledAt)}</b></span>
              </div>
              <AcademyTimezoneNotice compact />

              {isRescheduleMode && (
                <div>
                  <span className={LABEL}>نوع التغيير</span>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="نوع تغيير الموعد">
                    {[
                      { value: 'reschedule', label: 'تغيير الموعد', hint: 'تعديل اليوم أو الساعة' },
                      { value: 'postpone', label: 'تأجيل الحصة', hint: 'تسجيلها كحصة مؤجلة' },
                    ].map((option) => {
                      const selected = changeType === option.value
                      return (
                        <button key={option.value} type="button" onClick={() => setChangeType(option.value)}
                          className={`min-h-14 rounded-xl border-2 px-3 py-2 text-start transition ${selected ? 'border-violet-500 bg-violet-50 text-violet-900' : 'border-gray-200 bg-white text-gray-600 hover:border-violet-200'}`}>
                          <span className="flex items-center gap-1.5 text-xs font-extrabold">
                            {selected && <Check size={14} />} {option.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-gray-500">{option.hint}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {!isRescheduleMode && (
                <div>
                  <label className={LABEL} htmlFor="session-title">عنوان الحصة</label>
                  <input id="session-title" className={FIELD} value={form.titleAr || ''} onChange={(e) => setForm((p) => ({ ...p, titleAr: e.target.value }))} />
                </div>
              )}

              <div className={`grid grid-cols-1 gap-3 ${isRescheduleMode ? '' : 'sm:grid-cols-2'}`}>
                <div>
                  <label className={LABEL} htmlFor="session-scheduled-at">التاريخ والوقت الجديد *</label>
                  <input id="session-scheduled-at" type="datetime-local" className={FIELD} required
                    min={toAcademyDateTimeLocal(new Date())}
                    value={form.scheduledAt || ''}
                    onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} />
                </div>
                {!isRescheduleMode && (
                  <div>
                    <label className={LABEL} htmlFor="session-duration">مدة الحصة</label>
                    <select id="session-duration" className={FIELD} value={form.durationMinutes || 60} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}>
                      {[30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} دقيقة</option>)}
                    </select>
                  </div>
                )}
              </div>

              {isRescheduleMode && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'غدًا', days: 1 },
                      { label: 'بعد يومين', days: 2 },
                      { label: 'الأسبوع القادم', days: 7 },
                    ].map((quick) => (
                      <button key={quick.days} type="button" onClick={() => setForm((p) => ({ ...p, scheduledAt: shiftDateTimeLocal(p.scheduledAt || originalLocal, quick.days) }))}
                        className="min-h-11 rounded-xl border border-violet-200 bg-violet-50 px-2 text-[11px] font-bold text-violet-700 transition hover:bg-violet-100">
                        {quick.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="session-change-reason">سبب التغيير <span className="font-normal text-gray-400">(اختياري)</span></label>
                    <textarea id="session-change-reason" className={TEXTAREA} value={form.reason || ''} maxLength={500}
                      onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                      placeholder={changeType === 'postpone' ? 'مثال: اعتذار مسبق من الطالب' : 'ملاحظة تظهر في إشعار المعلم والطالب'} />
                  </div>
                </>
              )}

              {!isRescheduleMode && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor="session-provider">منصة الاجتماع</label>
                      <select id="session-provider" className={FIELD} value={form.meetingProvider || 'zoom'} onChange={(e) => setForm((p) => ({ ...p, meetingProvider: e.target.value }))}>
                        <option value="zoom">Zoom</option>
                        <option value="meet">Google Meet</option>
                        <option value="teams">Microsoft Teams</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="session-link">رابط الاجتماع</label>
                      <input id="session-link" dir="ltr" className={FIELD} value={form.meetingLink || ''} onChange={(e) => setForm((p) => ({ ...p, meetingLink: e.target.value }))} placeholder="https://..." />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="session-notes">ملاحظات الإدارة</label>
                    <textarea id="session-notes" className={TEXTAREA} value={form.notes || ''} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="ملاحظات اختيارية" />
                  </div>
                </>
              )}

              {(appointmentChanged || isRescheduleMode) && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold leading-5 text-emerald-800" role="note">
                  بعد الحفظ سيتحدث نفس الموعد عند الأدمن والمعلم والطالب، وسيصل إشعار للمعلم والطالب بالموعد الجديد.
                </p>
              )}
            </form>

            <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-gray-100 bg-white px-4 py-3.5 sm:px-6">
              <button type="button" onClick={submit} disabled={mutation.isPending || !form.scheduledAt || (isRescheduleMode && !appointmentChanged)}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isRescheduleMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-violet-600 hover:bg-violet-700'}`}>
                {mutation.isPending ? <Spinner size="sm" color="border-white" /> : <Check size={17} />}
                {isRescheduleMode ? (changeType === 'postpone' ? 'تأكيد التأجيل' : 'حفظ الموعد الجديد') : 'حفظ التعديلات'}
              </button>
              <button type="button" onClick={onClose} className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-50">إلغاء</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
