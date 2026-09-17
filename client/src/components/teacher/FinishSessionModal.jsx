import { useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  UserX,
} from 'lucide-react'
import api from '../../utils/api.js'
import { quranReportService } from '../../services/quranReport.service.js'
import Avatar from '../ui/Avatar.jsx'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import QuranReportInlineForm from './QuranReportInlineForm.jsx'
import AcademyTimezoneNotice from '../ui/AcademyTimezoneNotice.jsx'
import { EMPTY_QURAN_REPORT_FIELDS, isQuranReportReady } from './quranReportFormState.js'
import { getFileUrl } from '../../config/constants.js'
import { academyDateKey, formatDateKeyAr, formatTimeAr, toAcademyDateTimeLocal } from '../../utils/date.js'
import { formatTimeArabic12Strict } from '../../utils/assignmentSchedule.js'

const FIELD = 'w-full min-h-[44px] bg-white border border-indigo-200 rounded-xl px-3.5 py-2.5 leading-normal text-sm font-semibold text-slate-800 outline-none transition-all hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400'
const LABEL = 'block text-xs font-bold text-slate-700 mb-1.5'

const ATTENDANCE_OPTIONS = [
  {
    value: 'present', label: 'حاضر', description: 'حضر الطالب الحصة بالكامل', icon: CheckCircle2,
    activeClass: 'bg-emerald-50 border-emerald-500 text-emerald-900', iconClass: 'bg-emerald-100 text-emerald-700', dotClass: 'bg-emerald-500',
  },
  {
    value: 'late', label: 'متأخر', description: 'حضر الطالب بعد بدء الموعد', icon: Clock,
    activeClass: 'bg-amber-50 border-amber-500 text-amber-900', iconClass: 'bg-amber-100 text-amber-700', dotClass: 'bg-amber-500',
  },
  {
    value: 'absent', label: 'غائب', description: 'لم يحضر الطالب للحصة', icon: UserX,
    activeClass: 'bg-rose-50 border-rose-500 text-rose-900', iconClass: 'bg-rose-100 text-rose-700', dotClass: 'bg-rose-500',
  },
  {
    value: 'postponed', label: 'تأجيل الحصة', description: 'نقل الحصة لموعد لاحق', icon: CalendarClock,
    activeClass: 'bg-indigo-50 border-indigo-500 text-indigo-900', iconClass: 'bg-indigo-100 text-indigo-700', dotClass: 'bg-indigo-500',
  },
]

function shiftDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export default function FinishSessionModal({ session, onClose, qc, onFinished }) {
  const [attendanceStatus, setAttendanceStatus] = useState('present')
  const [reportFields, setReportFields] = useState(() => ({ ...EMPTY_QURAN_REPORT_FIELDS }))
  const completedResponseRef = useRef(null)

  const originalDate = useMemo(() => new Date(session?.scheduledAt || Date.now()), [session?.scheduledAt])
  const originalAcademyDateTime = useMemo(() => toAcademyDateTimeLocal(originalDate), [originalDate])
  const [postponeDate, setPostponeDate] = useState(() => shiftDateKey(academyDateKey(originalDate), 1))
  const [postponeTime, setPostponeTime] = useState(() => originalAcademyDateTime.slice(11, 16))
  const [postponeReason, setPostponeReason] = useState('')
  const [activePreset, setActivePreset] = useState('tomorrow')

  const combinedPostponeDateTime = useMemo(() => {
    if (!postponeDate || !postponeTime) return null
    return `${postponeDate}T${postponeTime}`
  }, [postponeDate, postponeTime])

  const formattedNewSchedule = combinedPostponeDateTime
    ? `${formatDateKeyAr(postponeDate)} الساعة ${formatTimeArabic12Strict(postponeTime)}`
    : ''

  const selectPreset = (key) => {
    setActivePreset(key)
    if (key === 'custom') return
    setPostponeDate(shiftDateKey(academyDateKey(originalDate), key === 'tomorrow' ? 1 : key === 'plus2' ? 2 : 7))
  }

  const isPostponed = attendanceStatus === 'postponed'
  const requiresReport = ['present', 'late'].includes(attendanceStatus)
  const reportReady = isQuranReportReady(reportFields)

  const mutation = useMutation({
    mutationFn: async () => {
      if (isPostponed) {
        if (!combinedPostponeDateTime || combinedPostponeDateTime <= toAcademyDateTimeLocal(new Date())) {
          throw new Error('يرجى تحديد موعد مستقبلي صالح لتأجيل الحصة')
        }
        return api.patch(`/sessions/${session._id}/finish`, {
          attendanceStatus: 'postponed',
          newScheduledAt: combinedPostponeDateTime,
          postponeReason,
          attendanceNotes: postponeReason,
        })
      }

      if (requiresReport && !reportReady) {
        throw new Error('يرجى كتابة ما تم تسميعه أو مراجعته قبل إنهاء الحصة')
      }

      // A successful finish is retained locally. If only the report request
      // fails, retrying this button cannot deduct or credit the same session twice.
      if (!completedResponseRef.current) {
        completedResponseRef.current = await api.patch(`/sessions/${session._id}/finish`, { attendanceStatus })
      }

      let reportResponse = null
      if (requiresReport) {
        reportResponse = await quranReportService.submitReport(session._id, reportFields)
      }
      return { finishResponse: completedResponseRef.current, reportResponse }
    },
    onSuccess: (result) => {
      ;[
        ['teacher', 'sessions'],
        ['teacher', 'sessions', 'month'],
        ['teacher', 'sessions', 'history'],
        ['teacher', 'students'],
        ['teacher', 'dashboard'],
        ['teacher', 'schedule-rules'],
        ['teacher', 'quran-reports'],
        ['teacher', 'quran-reports', 'overdue'],
        ['teacher', 'quran-reports', 'daily-progress'],
      ].forEach((queryKey) => qc.invalidateQueries({ queryKey }))

      if (isPostponed) {
        toast.success(`تم تأجيل الحصة بنجاح إلى: ${formattedNewSchedule}`, { duration: 5000 })
        onFinished?.(result.data?.data)
      } else {
        toast.success(requiresReport ? 'تم إنهاء الحصة وإرسال التقرير القرآني بنجاح' : 'تم إنهاء الحصة وتسجيل الغياب بنجاح')
        onFinished?.(result.finishResponse?.data?.data)
      }
      onClose()
    },
    onError: (error) => {
      const baseMessage = error.response?.data?.message || error.message || 'حدث خطأ أثناء الحفظ'
      toast.error(
        completedResponseRef.current
          ? `تم إنهاء الحصة، لكن تعذر إرسال التقرير: ${baseMessage}. اضغط مرة أخرى لإعادة إرساله فقط.`
          : baseMessage,
        { duration: 6000 }
      )
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="إنهاء الحصة وتوثيق الحضور"
      size="xl"
      footer={
        <div className="w-full flex flex-col-reverse sm:flex-row gap-2.5">
          <Button variant="ghost" className="w-full sm:w-auto min-h-[44px] text-slate-600" onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
          <Button
            variant={isPostponed ? 'primary' : 'purple'}
            className="w-full sm:flex-1 min-h-[44px] !text-sm font-bold flex items-center justify-center gap-2"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!attendanceStatus || (requiresReport && !reportReady)}
          >
            {isPostponed ? (
              <><CalendarCheck size={16} /><span>تأكيد تأجيل الحصة للموعد الجديد</span></>
            ) : (
              <><BookOpenCheck size={16} /><span>{requiresReport ? 'إنهاء الحصة وإرسال التقرير' : 'تسجيل الغياب وإنهاء الحصة'}</span></>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={getFileUrl(session.studentId?.avatar)} firstName={session.studentId?.firstNameAr} lastName={session.studentId?.lastNameAr} size="md" />
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-800 truncate">{session.studentId?.firstNameAr} {session.studentId?.lastNameAr}</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{session.titleAr}</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200" dir="ltr">
            <Clock size={12} className="text-violet-600" /><span>{formatTimeAr(session.scheduledAt)}</span>
          </span>
        </div>

        <section>
          <label className={LABEL}>حالة الحضور والإنجاز <span className="text-rose-500">*</span></label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ATTENDANCE_OPTIONS.map((option) => {
              const Icon = option.icon
              const selected = attendanceStatus === option.value
              return (
                <button key={option.value} type="button" onClick={() => setAttendanceStatus(option.value)} className={`min-h-[100px] rounded-2xl border p-3 text-start transition-colors flex flex-col justify-between ${selected ? option.activeClass : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`} aria-pressed={selected}>
                  <div className="flex items-center justify-between w-full">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${selected ? option.iconClass : 'bg-slate-100 text-slate-500'}`}><Icon size={17} aria-hidden="true" /></span>
                    {selected && <span className={`w-2 h-2 rounded-full ${option.dotClass}`} />}
                  </div>
                  <span><span className="font-extrabold text-xs block">{option.label}</span><span className="text-[10px] text-slate-500 block mt-1 leading-snug">{option.description}</span></span>
                </button>
              )
            })}
          </div>
        </section>

        {isPostponed && (
          <section className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-start gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-none"><CalendarClock size={18} /></span>
              <div>
                <h4 className="text-sm font-extrabold text-indigo-950">تحديد الموعد القادم للحصة المؤجلة</h4>
                <p className="text-[11px] text-indigo-900/80 mt-0.5 leading-relaxed">لن يُخصم رصيد من الطالب أو يُحتسب راتب المعلم حتى إتمام الحصة في موعدها الجديد.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ['tomorrow', 'غدًا نفس الموعد'], ['plus2', 'بعد يومين'], ['nextWeek', 'الأسبوع القادم'], ['custom', 'موعد مخصص'],
              ].map(([key, label]) => (
                <button key={key} type="button" onClick={() => selectPreset(key)} className={`min-h-[44px] rounded-xl border px-2.5 text-xs font-bold ${activePreset === key ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-100/60'}`}>{label}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={LABEL}>تاريخ الحصة القادمة</label><input type="date" min={academyDateKey(new Date())} value={postponeDate} onChange={(e) => { setPostponeDate(e.target.value); setActivePreset('custom') }} className={FIELD} /></div>
              <div><label className={LABEL}>ساعة البدء</label><input type="time" value={postponeTime} onChange={(e) => { setPostponeTime(e.target.value); setActivePreset('custom') }} className={FIELD} /></div>
            </div>

            <AcademyTimezoneNotice compact />

            {formattedNewSchedule && <div className="rounded-xl border border-indigo-200 bg-white p-3 text-xs font-semibold text-indigo-950">الموعد الجديد: <strong className="text-indigo-700">{formattedNewSchedule}</strong></div>}

            <div><label className={LABEL}>سبب التأجيل (اختياري)</label><input value={postponeReason} onChange={(e) => setPostponeReason(e.target.value)} className={FIELD} placeholder="مثال: طلب الطالب تغيير الموعد..." /></div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex items-start gap-2.5 text-xs text-amber-950">
              <AlertCircle size={16} className="text-amber-600 flex-none mt-0.5" />
              <span>لن يطلب النظام تقريرًا قرآنيًا للحصة المؤجلة؛ سيظهر التقرير عند إنهاء الموعد البديل بالفعل.</span>
            </div>
          </section>
        )}

        {requiresReport && <QuranReportInlineForm fields={reportFields} onChange={setReportFields} />}

        {attendanceStatus === 'absent' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 flex items-start gap-3 text-rose-950">
            <UserX size={19} className="text-rose-600 flex-none mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-extrabold block">سيتم تسجيل الطالب غائبًا</span>
              <span>لا يُطلب تقرير قرآني لحصة لم تُقدّم، وسيُطبق النظام قواعد الرصيد واستحقاق المعلم آليًا.</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
