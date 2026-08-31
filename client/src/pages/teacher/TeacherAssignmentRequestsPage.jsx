import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Inbox, CheckCircle2, XCircle, CalendarClock, Clock, User, ChevronDown, ChevronUp, Copy, Check,
} from 'lucide-react'
import api from '../../utils/api.js'
import Spinner from '../../components/ui/Spinner.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import { getFileUrl } from '../../config/constants.js'
import { formatDateAr, timeFromNow } from '../../utils/date.js'
import {
  dayLabel, durationLabel, ASSIGNMENT_STATUS_LABELS, TEACHING_TYPE_OPTIONS,
} from '../../utils/assignmentSchedule.js'
import ProposeAlternativeTimeModal from '../../components/teacher/ProposeAlternativeTimeModal.jsx'
import { subjectLabel } from '../../utils/teacherProfile.js'
import { useTeachingSubjects } from '../../hooks/useTeachingSubjects.js'

function teachingTypeLabel(value) {
  return TEACHING_TYPE_OPTIONS.find((o) => o.value === value)?.label || 'حصص فردية'
}

const TABS = [
  { key: '', label: 'الكل' },
  { key: 'pending_teacher_approval', label: 'بانتظار الرد' },
  { key: 'completed', label: 'مقبولة ومفعّلة' },
  { key: 'rejected', label: 'مرفوضة' },
  { key: 'time_change_requested', label: 'تعديل موعد' },
]

// Rejection only — "propose alternative time" now has its own dedicated,
// availability-driven picker (see components/teacher/ProposeAlternativeTimeModal.jsx).
function RejectModal({ request, onClose, onSubmit, loading }) {
  const [reason, setReason] = useState('')
  const [reasonTouched, setReasonTouched] = useState(false)

  if (!request) return null
  const reasonError = reasonTouched && !reason.trim() ? 'سبب الرفض مطلوب — يرجى توضيح السبب للإدارة' : null

  function handleSubmit() {
    if (!reason.trim()) { setReasonTouched(true); return }
    onSubmit({ action: 'reject', reason: reason.trim() })
  }

  return (
    <Modal open title="رفض طلب الإسناد" size="sm" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose} className="!bg-gray-100 !text-gray-600">إلغاء</Button>
        <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={handleSubmit}>
          تأكيد الرفض
        </Button>
      </>}>
      <div dir="rtl" className="space-y-3">
        <div>
          <label htmlFor="reject-reason" className="text-xs font-bold text-gray-500 mb-1 block">سبب الرفض (مطلوب)</label>
          <textarea id="reject-reason" rows={3} aria-required="true" aria-invalid={!!reasonError}
            aria-describedby={reasonError ? 'reject-reason-error' : undefined}
            className={`w-full bg-gray-50 border rounded-xl px-3.5 py-2.5 text-sm outline-none ${reasonError ? 'border-red-400' : 'border-gray-200 focus:border-red-400'}`}
            value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => setReasonTouched(true)} />
          {reasonError && <p id="reject-reason-error" className="text-xs text-red-600 font-semibold mt-1">{reasonError}</p>}
        </div>
      </div>
    </Modal>
  )
}

// Summarizes the final recurring schedule before it goes live — the teacher
// sees exactly what they're about to commit to (days/times, duration, start
// date, teaching type) in one place, instead of activation happening
// silently on a single button tap.
function AcceptConfirmModal({ request, onClose, onConfirm, loading }) {
  const { data: subjects = [] } = useTeachingSubjects()
  if (!request) return null
  const student = request.studentId || {}
  return (
    <Modal open title="تأكيد قبول الطالب" size="sm" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose} className="!bg-gray-100 !text-gray-600">تراجع</Button>
        <Button variant="purple" loading={loading} onClick={onConfirm}>تأكيد القبول وتفعيل الجدول</Button>
      </>}>
      <div dir="rtl" className="space-y-3">
        <p className="text-sm text-gray-600">بقبولك سيتم تفعيل الجدول الدوري التالي مباشرة مع <strong className="text-gray-900">{student.firstNameAr} {student.lastNameAr}</strong>:</p>
        <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 text-sm text-gray-700">
          <div className="flex justify-between"><span className="text-gray-400">المنهج</span><span className="font-semibold">{subjectLabel(subjects, request.specialization) || '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">الأيام والمواعيد</span><span className="font-semibold">{request.schedule?.days?.map((d) => `${dayLabel(d.dayOfWeek)} ${d.time}`).join('، ')}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">مدة الحصة</span><span className="font-semibold">{durationLabel(request.lessonDurationMinutes)}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">نوع التدريس</span><span className="font-semibold">{teachingTypeLabel(request.teachingType)}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">تاريخ البداية</span><span className="font-semibold">{formatDateAr(request.schedule?.startDate)}</span></div>
        </div>
      </div>
    </Modal>
  )
}

function RequestCard({ request, onOpenAccept, onOpenReject, onOpenTimeChange, isSubmitting }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const { data: subjects = [] } = useTeachingSubjects()
  const student = request.studentId || {}
  const statusCfg = ASSIGNMENT_STATUS_LABELS[request.status] || {}
  const message = request.editedMessage || request.generatedMessage

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('تعذّر نسخ الرسالة')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={getFileUrl(student.avatar)} firstName={student.firstNameAr} lastName={student.lastNameAr} size="sm" />
          <div className="min-w-0">
            <div className="font-bold text-gray-900 truncate">{student.firstNameAr} {student.lastNameAr}</div>
            <div className="text-xs text-gray-400 truncate">{student.email}</div>
          </div>
        </div>
        {/* Status shown as visible text, never color alone. */}
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-none" style={{ color: statusCfg.color, background: `${statusCfg.color}18` }}>
          {statusCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div><span className="text-gray-400">المنهج:</span> {subjectLabel(subjects, request.specialization) || '—'}</div>
        <div><span className="text-gray-400">مدة الحصة:</span> {durationLabel(request.lessonDurationMinutes)}</div>
        <div className="col-span-2"><span className="text-gray-400">الأيام والمواعيد:</span> {request.schedule?.days?.map((d) => `${dayLabel(d.dayOfWeek)} ${d.time}`).join('، ')}</div>
        <div><span className="text-gray-400">تاريخ البداية:</span> {formatDateAr(request.schedule?.startDate)}</div>
        {!!request.studentAge && <div><span className="text-gray-400">العمر:</span> {request.studentAge}</div>}
        <div><span className="text-gray-400">نوع التدريس:</span> {teachingTypeLabel(request.teachingType)}</div>
        {request.createdAt && <div className="col-span-2 text-gray-400">تاريخ الطلب: {timeFromNow(request.createdAt)}</div>}
      </div>

      {request.teacherResponse?.type === 'time_change' && (
        <div className="text-xs bg-amber-50 text-amber-700 rounded-lg px-3 py-2 font-semibold space-y-1">
          <div>
            جدولك المقترح: {(request.teacherResponse.proposedSchedule?.days?.length
              ? request.teacherResponse.proposedSchedule.days
              : (request.teacherResponse.proposedTime ? [request.teacherResponse.proposedTime] : []))
              .map((d) => `${dayLabel(d.dayOfWeek)} ${d.time}`).join('، ') || 'بدون جدول محدد'}
          </div>
          {request.teacherResponse.note && <div className="text-amber-600">ملاحظتك: {request.teacherResponse.note}</div>}
        </div>
      )}
      {request.teacherResponse?.type === 'reject' && (
        <div className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-2 font-semibold">سبب الرفض: {request.teacherResponse.reason}</div>
      )}

      {/* Message preview — always visible (never fully hidden by default),
          two lines collapsed with a clear expand toggle for the full text.
          Avoids both extremes the brief called out: a hidden message the
          teacher might miss, and a huge unstructured wall of text taking
          over the card. */}
      {message && (
        <div className="rounded-lg bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-between gap-2 px-3 pt-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">رسالة الإسناد</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={handleCopy} aria-label="نسخ رسالة الإسناد"
                className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-violet-600 min-h-[36px] sm:min-h-0 px-1.5 py-1">
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />} {copied ? 'تم النسخ' : 'نسخ'}
              </button>
              <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
                className="flex items-center gap-1 text-[11px] font-bold text-violet-600 min-h-[36px] sm:min-h-0 px-1.5 py-1">
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {expanded ? 'إخفاء' : 'عرض الكل'}
              </button>
            </div>
          </div>
          <p
            dir="rtl"
            className={`text-xs text-gray-600 leading-relaxed px-3 pb-2.5 pt-1 whitespace-pre-wrap font-sans ${expanded ? '' : 'line-clamp-2'}`}
          >
            {message}
          </p>
        </div>
      )}

      {request.status === 'pending_teacher_approval' && (
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button type="button" onClick={() => onOpenAccept(request)} disabled={isSubmitting}
            aria-label="قبول الطالب"
            className="flex-1 min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
            <CheckCircle2 size={14} /> قبول الطالب
          </button>
          <button type="button" onClick={() => onOpenTimeChange(request)} disabled={isSubmitting}
            aria-label="اقتراح موعد آخر"
            className="flex-1 min-h-[44px] rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
            <CalendarClock size={14} /> اقتراح موعد آخر
          </button>
          <button type="button" onClick={() => onOpenReject(request)} disabled={isSubmitting}
            aria-label="رفض الطلب"
            className="flex-1 min-h-[44px] rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
            <XCircle size={14} /> رفض الطلب
          </button>
        </div>
      )}
    </div>
  )
}

export default function TeacherAssignmentRequestsPage() {
  const qc = useQueryClient()
  const { id: linkedId } = useParams() // set when opened directly from a notification link
  const [tab, setTab] = useState('')
  const [modalRequest, setModalRequest] = useState(null)
  const [modalMode, setModalMode] = useState(null) // 'accept' | 'reject' | 'time_change'
  // Which single request is currently being submitted — so responding to one
  // card only disables that card's own buttons, not every card in the list.
  const [submittingId, setSubmittingId] = useState(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher', 'assignment-requests', tab],
    queryFn: () => api.get('/teachers/me/assignment-requests', { params: tab ? { status: tab } : {} }).then((r) => r.data.data),
  })

  // Deep-link support: a notification links straight to one request. Fetched
  // separately so it's shown even if it falls outside the current tab/filter.
  const { data: linkedRequest } = useQuery({
    queryKey: ['teacher', 'assignment-request', linkedId],
    queryFn: () => api.get(`/teachers/me/assignment-requests/${linkedId}`).then((r) => r.data.data),
    enabled: !!linkedId,
  })

  const respondMut = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/teachers/me/assignment-requests/${id}/respond`, body).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['teacher', 'assignment-requests'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'assignment-request'] })
      setModalRequest(null); setModalMode(null); setSubmittingId(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'حدث خطأ')
      // A stale proposed time (409, conflict became real between the picker
      // loading and submit) — refetch fresh availability so the still-open
      // picker immediately reflects real, current alternatives instead of
      // the now-outdated slot map it showed a moment ago.
      if (err?.response?.status === 409 && modalMode === 'time_change') {
        qc.invalidateQueries({ queryKey: ['teacher', 'assignment-request-availability', modalRequest?._id] })
      }
      setSubmittingId(null)
    },
  })

  function openAccept(req) { setModalRequest(req); setModalMode('accept') }
  function openReject(req) { setModalRequest(req); setModalMode('reject') }
  function openTimeChange(req) { setModalRequest(req); setModalMode('time_change') }
  function closeModal() { setModalRequest(null); setModalMode(null) }

  function submitResponse(body) {
    setSubmittingId(modalRequest._id)
    respondMut.mutate({ id: modalRequest._id, ...body })
  }

  const items = data?.items || []

  return (
    <div dir="rtl" className="space-y-5">
      <div>
        <h1 className="font-heading font-extrabold text-2xl text-gray-900 flex items-center gap-2"><Inbox size={22} className="text-violet-600" /> طلبات الطلاب</h1>
        <p className="text-sm text-gray-500 mt-0.5">طلبات إسناد الطلاب الجدد بانتظار مراجعتكم وردكم</p>
      </div>

      {linkedRequest && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-violet-600">الطلب المفتوح من الإشعار</p>
          <RequestCard
            request={linkedRequest} isSubmitting={submittingId === linkedRequest._id}
            onOpenAccept={openAccept} onOpenReject={openReject} onOpenTimeChange={openTimeChange}
          />
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${tab === t.key ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-violet-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !items.length ? (
        <EmptyState icon={<Inbox size={28} />} title="لا توجد طلبات" description="لا توجد طلبات إسناد طلاب في هذه الحالة حاليًا" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((r) => (
            <RequestCard
              key={r._id} request={r} isSubmitting={submittingId === r._id}
              onOpenAccept={openAccept} onOpenReject={openReject} onOpenTimeChange={openTimeChange}
            />
          ))}
        </div>
      )}

      <AcceptConfirmModal
        request={modalMode === 'accept' ? modalRequest : null}
        loading={respondMut.isPending && submittingId === modalRequest?._id}
        onClose={closeModal}
        onConfirm={() => submitResponse({ action: 'accept' })}
      />
      <RejectModal
        request={modalMode === 'reject' ? modalRequest : null}
        loading={respondMut.isPending && submittingId === modalRequest?._id}
        onClose={closeModal}
        onSubmit={submitResponse}
      />
      {modalMode === 'time_change' && (
        <ProposeAlternativeTimeModal
          request={modalRequest}
          loading={respondMut.isPending && submittingId === modalRequest?._id}
          onClose={closeModal}
          onSubmit={submitResponse}
        />
      )}
    </div>
  )
}
