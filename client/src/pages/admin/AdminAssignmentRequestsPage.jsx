import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ClipboardCheck, ChevronDown, ChevronUp, UserCog, Ban, Send,
} from 'lucide-react'
import api from '../../utils/api.js'
import Spinner from '../../components/ui/Spinner.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import StudentScheduleSection from '../../components/ui/StudentScheduleSection.jsx'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import { formatDateAr } from '../../utils/date.js'
import {
  dayLabel, durationLabel, ASSIGNMENT_STATUS_LABELS, conflictLabel,
  deriveScheduleDays, hydrateScheduleSelection, validateScheduleForSubmit,
} from '../../utils/assignmentSchedule.js'
import { subjectLabel } from '../../utils/teacherProfile.js'
import { useTeachingSubjects } from '../../hooks/useTeachingSubjects.js'
import { useAuthStore } from '../../store/authStore.js'

const TABS = [
  { key: '', label: 'الكل' },
  { key: 'pending_teacher_approval', label: 'بانتظار موافقة المعلم' },
  { key: 'rejected,time_change_requested', label: 'تحتاج متابعة' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'reassigned', label: 'أُعيد إسنادها' },
  { key: 'cancelled', label: 'ملغاة' },
]

function CancelModal({ open, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="إلغاء طلب الإسناد" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose} className="!bg-gray-100 !text-gray-600">تراجع</Button>
        <Button variant="danger" loading={loading} onClick={() => onConfirm(reason)}>تأكيد الإلغاء</Button>
      </>}>
      <label className="text-xs font-bold text-gray-500 mb-1 block">سبب الإلغاء (مطلوب)</label>
      <textarea rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400"
        value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  )
}

function ReassignModal({ request, onClose, onConfirm, loading, overrideAllowed }) {
  const [newTeacherId, setNewTeacherId] = useState('')
  const [reason, setReason] = useState('')
  const [immediateOverride, setImmediateOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  const { data: teachersData } = useQuery({
    queryKey: ['admin', 'teachers', 'for-reassign'],
    queryFn: () => api.get('/admin/teachers?limit=200').then((r) => r.data),
    enabled: !!request,
  })
  const teachers = (teachersData?.data || []).filter((t) => t._id !== request?.teacherId?._id)

  if (!request) return null

  return (
    <Modal open title="إعادة إسناد لمعلم آخر" size="sm" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose} className="!bg-gray-100 !text-gray-600">إلغاء</Button>
        <Button variant="purple" loading={loading} disabled={!newTeacherId || !reason.trim()}
          onClick={() => onConfirm({ newTeacherId, reason, immediateOverride, overrideReason })}>
          إعادة الإسناد
        </Button>
      </>}>
      <div dir="rtl" className="space-y-3">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">المعلم الجديد</label>
          <select className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm" value={newTeacherId} onChange={(e) => setNewTeacherId(e.target.value)}>
            <option value="">— اختر معلمًا —</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">سبب إعادة الإسناد (مطلوب)</label>
          <textarea rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-violet-400"
            value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {overrideAllowed && (
          <>
            <label className="flex items-center gap-2 text-xs text-gray-600 font-semibold cursor-pointer select-none">
              <input type="checkbox" checked={immediateOverride} onChange={(e) => setImmediateOverride(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-red-600" />
              اعتماد فوري بدون انتظار موافقة المعلم الجديد
            </label>
            {immediateOverride && (
              <textarea rows={2} placeholder="سبب الاعتماد الفوري (مطلوب)" className="w-full bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

function EditResendModal({ request, onClose, onConfirm, loading }) {
  // Pre-fills from the teacher's own proposed schedule when this request is
  // in `time_change_requested` (the common case for opening this modal) —
  // the admin is reviewing exactly that proposal, so starting from it
  // instead of the now-superseded original schedule matches the real workflow.
  const proposedDays = request.teacherResponse?.proposedSchedule?.days?.length
    ? request.teacherResponse.proposedSchedule.days
    : (request.teacherResponse?.proposedTime?.time ? [request.teacherResponse.proposedTime] : null)
  const [usedProposal] = useState(!!proposedDays)
  const [schedule, setSchedule] = useState(() => ({
    enabled: true,
    specialization: request.specialization, lessonDurationMinutes: request.lessonDurationMinutes,
    frequency: request.schedule.frequency || 'weekly',
    ...hydrateScheduleSelection(proposedDays || request.schedule.days, request.schedule.frequency || 'weekly'),
    startDate: request.schedule.startDate?.slice(0, 10),
    endDate: request.schedule.endDate?.slice(0, 10) || '', noEndDate: !request.schedule.endDate,
    teachingType: request.teachingType || 'individual', notes: request.adminNotes || '',
    immediateOverride: false, overrideReason: '',
  }))

  function handleConfirm() {
    const error = validateScheduleForSubmit(schedule, request.studentType)
    if (error) return toast.error(error)
    onConfirm({
      specialization: schedule.specialization, lessonDurationMinutes: schedule.lessonDurationMinutes,
      schedule: {
        days: deriveScheduleDays(schedule), startDate: schedule.startDate,
        endDate: schedule.noEndDate ? undefined : (schedule.endDate || undefined), frequency: schedule.frequency,
      },
      adminNotes: schedule.notes,
    })
  }

  return (
    <Modal open title="تعديل الجدول وإعادة الإرسال" size="lg" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose} className="!bg-gray-100 !text-gray-600">إلغاء</Button>
        <Button variant="purple" loading={loading} onClick={handleConfirm}>
          حفظ وإعادة الإرسال للمعلم
        </Button>
      </>}>
      {usedProposal && (
        <div className="mb-3 rounded-xl bg-violet-50 border border-violet-100 px-3.5 py-2.5 text-xs font-semibold text-violet-700">
          تم تعبئة الجدول تلقائيًا من اقتراح المعلم — يمكنك تعديله قبل إعادة الإرسال.
        </div>
      )}
      <StudentScheduleSection
        value={schedule} onChange={setSchedule}
        teacherId={request.teacherId?._id || request.teacherId} studentId={request.studentId?._id || request.studentId}
        studentType={request.studentType} overrideAllowed={false}
      />
    </Modal>
  )
}

function RequestRow({ request, onReassign, onEditResend, onCancel }) {
  const [expanded, setExpanded] = useState(false)
  const { data: subjects = [] } = useTeachingSubjects()
  const student = request.studentId || {}
  const teacher = request.teacherId || {}
  const statusCfg = ASSIGNMENT_STATUS_LABELS[request.status] || {}
  const canFollowUp = ['rejected', 'time_change_requested'].includes(request.status)
  const canCancel = ['draft', 'pending_teacher_approval', 'rejected', 'time_change_requested'].includes(request.status)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link to={student._id ? ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', student._id) : '#'} onClick={(e) => e.stopPropagation()}
            className="flex-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 rounded-full">
            <Avatar src={getFileUrl(student.avatar)} firstName={student.firstNameAr} lastName={student.lastNameAr} size="sm" />
          </Link>
          <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2 min-w-0 flex-1 text-right">
            <div className="min-w-0">
              <div className="font-bold text-gray-900 truncate">
                <Link to={student._id ? ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', student._id) : '#'} onClick={(e) => e.stopPropagation()} className="hover:text-violet-600 hover:underline">
                  {student.firstNameAr} {student.lastNameAr}
                </Link>
              </div>
              <div className="text-xs text-gray-400 truncate">
                مع{' '}
                <Link to={teacher._id ? ROUTES.ADMIN_TEACHER_PROFILE.replace(':id', teacher._id) : '#'} onClick={(e) => e.stopPropagation()} className="hover:text-violet-600 hover:underline">
                  {teacher.firstNameAr} {teacher.lastNameAr}
                </Link>
                {' '}— {subjectLabel(subjects, request.specialization)}
              </div>
            </div>
            {expanded ? <ChevronUp size={15} className="text-gray-400 flex-none" /> : <ChevronDown size={15} className="text-gray-400 flex-none" />}
          </button>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-none" style={{ color: statusCfg.color, background: `${statusCfg.color}18` }}>
          {statusCfg.label}
        </span>
      </div>

      {expanded && (
        <div className="space-y-2 text-xs text-gray-600 border-t border-gray-50 pt-3">
          <div>الأيام والمواعيد: {request.schedule?.days?.map((d) => `${dayLabel(d.dayOfWeek)} ${d.time}`).join('، ')} — {durationLabel(request.lessonDurationMinutes)}</div>
          <div>تاريخ البداية: {formatDateAr(request.schedule?.startDate)}</div>
          {request.teacherResponse?.type === 'reject' && (
            <div className="bg-red-50 text-red-600 rounded-lg px-3 py-2 font-semibold">سبب الرفض: {request.teacherResponse.reason}</div>
          )}
          {request.teacherResponse?.type === 'time_change' && (
            <div className="bg-amber-50 text-amber-700 rounded-lg px-3 py-2 font-semibold">
              اقترح المعلم الجدول التالي: {(request.teacherResponse.proposedSchedule?.days?.length
                ? request.teacherResponse.proposedSchedule.days
                : (request.teacherResponse.proposedTime ? [request.teacherResponse.proposedTime] : []))
                .map((d) => `${dayLabel(d.dayOfWeek)} ${d.time}`).join('، ') || 'بدون جدول محدد'}
              {request.teacherResponse.note && ` — ${request.teacherResponse.note}`}
            </div>
          )}
          {request.previousRequestId && <div className="text-gray-400">أُعيد إسناده من طلب سابق</div>}
          {request.replacementRequestId && <div className="text-gray-400">تم استبداله بطلب جديد</div>}
        </div>
      )}

      {(canFollowUp || canCancel) && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
          {canFollowUp && (
            <button onClick={() => onEditResend(request)} className="h-8 px-3 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold flex items-center gap-1.5">
              <Send size={13} /> تعديل وإعادة الإرسال لنفس المعلم
            </button>
          )}
          {canFollowUp && (
            <button onClick={() => onReassign(request)} className="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5">
              <UserCog size={13} /> إسناد لمعلم آخر
            </button>
          )}
          {canCancel && (
            <button onClick={() => onCancel(request)} className="h-8 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1.5">
              <Ban size={13} /> إلغاء الطلب
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminAssignmentRequestsPage() {
  const qc = useQueryClient()
  const { id: linkedId } = useParams() // set when opened directly from a notification link
  // Optional deep-link filter — e.g. a teacher profile's "عرض الكل" pending-
  // requests link. Purely a client-side list filter; the backend already
  // supports `teacherId` on GET /admin/assignments.
  const [searchParams] = useSearchParams()
  const teacherIdFilter = searchParams.get('teacherId') || undefined
  const studentIdFilter = searchParams.get('studentId') || undefined
  const { hasPermission } = useAuthStore()
  const overrideAllowed = hasPermission('assignments.override')
  // Defaults to the newly-pending-approval queue, not "تحتاج متابعة" — that
  // tab is rejected/time_change_requested only, so a freshly created request
  // (the common case right after onboarding a new student) was invisible on
  // first load, reading as "nothing happened" even though the teacher had
  // already been notified. See FEATURE_TRACKER.md for the fix note.
  const [tab, setTab] = useState('pending_teacher_approval')
  const [reassignTarget, setReassignTarget] = useState(null)
  const [editResendTarget, setEditResendTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'assignment-requests', tab, teacherIdFilter, studentIdFilter],
    queryFn: () => api.get('/admin/assignments', {
      params: {
        ...(tab ? { status: tab } : {}),
        ...(teacherIdFilter ? { teacherId: teacherIdFilter } : {}),
        ...(studentIdFilter ? { studentId: studentIdFilter } : {}),
      },
    }).then((r) => r.data.data),
    refetchInterval: 30000, // safe polling fallback so a newly created request appears without a manual refresh
  })

  // Accurate per-tab count badges — a single bounded aggregate, not one
  // extra list request per tab.
  const { data: statusCounts = {} } = useQuery({
    queryKey: ['admin', 'assignment-requests', 'status-counts'],
    queryFn: () => api.get('/admin/assignments/status-counts').then((r) => r.data.data),
    refetchInterval: 30000,
  })

  function tabCount(key) {
    if (!key) return Object.values(statusCounts).reduce((sum, n) => sum + (n || 0), 0)
    return key.split(',').reduce((sum, s) => sum + (statusCounts[s.trim()] || 0), 0)
  }

  const { data: linkedRequest } = useQuery({
    queryKey: ['admin', 'assignment-request', linkedId],
    queryFn: () => api.get(`/admin/assignments/${linkedId}`).then((r) => r.data.data),
    enabled: !!linkedId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'assignment-requests'] })
    qc.invalidateQueries({ queryKey: ['admin', 'teacher-availability'] })
  }
  // invalidateQueries({ queryKey: ['admin', 'assignment-requests'] }) above
  // already matches the ['admin','assignment-requests','status-counts'] key
  // too (React Query prefix matching), so the tab badges refresh alongside
  // the list — no separate call needed.

  const reassignMut = useMutation({
    mutationFn: ({ id, ...body }) => api.post(`/admin/assignments/${id}/reassign`, body).then((r) => r.data),
    onSuccess: () => { toast.success('تم إعادة الإسناد'); invalidate(); setReassignTarget(null) },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })
  const editResendMut = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/admin/assignments/${id}/edit-resend`, body).then((r) => r.data),
    onSuccess: () => { toast.success('تم التعديل وإعادة الإرسال للمعلم'); invalidate(); setEditResendTarget(null) },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'حدث خطأ')
      const conflicts = err?.response?.data?.conflicts
      if (conflicts?.length) toast.error(conflicts.map(conflictLabel).join('، '))
    },
  })
  const cancelMut = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/admin/assignments/${id}/cancel`, { reason }).then((r) => r.data),
    onSuccess: () => { toast.success('تم إلغاء الطلب'); invalidate(); setCancelTarget(null) },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const items = data?.items || []

  return (
    <div dir="rtl" className="space-y-5">
      <div>
        <h1 className="font-heading font-extrabold text-2xl text-gray-900 flex items-center gap-2"><ClipboardCheck size={22} className="text-violet-600" /> متابعة طلبات إسناد الطلاب</h1>
        <p className="text-sm text-gray-500 mt-0.5">قائمة موحدة لكل طلبات إسناد الطلاب — المعلقة والمرفوضة والمكتملة</p>
      </div>

      {linkedRequest && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-violet-600">الطلب المفتوح من الإشعار</p>
          <RequestRow request={linkedRequest} onReassign={setReassignTarget} onEditResend={setEditResendTarget} onCancel={setCancelTarget} />
        </div>
      )}

      {(teacherIdFilter || studentIdFilter) && (
        <div className="flex items-center justify-between rounded-xl bg-violet-50 border border-violet-100 px-3.5 py-2 text-xs font-semibold text-violet-700">
          <span>{teacherIdFilter ? 'مصفّاة على معلم واحد فقط' : 'مصفّاة على طالب واحد فقط'}</span>
          <Link to={ROUTES.ADMIN_ASSIGNMENT_REQUESTS} className="underline hover:no-underline">إزالة التصفية</Link>
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => {
          const count = tabCount(t.key)
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${active ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-violet-300'}`}>
              {t.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-violet-50 text-violet-700'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !items.length ? (
        <EmptyState icon={<ClipboardCheck size={28} />} title="لا توجد طلبات" description="لا توجد طلبات إسناد في هذه الحالة حاليًا" />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <RequestRow
              key={r._id} request={r}
              onReassign={setReassignTarget} onEditResend={setEditResendTarget} onCancel={setCancelTarget}
            />
          ))}
        </div>
      )}

      <ReassignModal
        request={reassignTarget} onClose={() => setReassignTarget(null)} loading={reassignMut.isPending}
        overrideAllowed={overrideAllowed}
        onConfirm={(body) => reassignMut.mutate({ id: reassignTarget._id, ...body })}
      />
      {editResendTarget && (
        <EditResendModal
          request={editResendTarget} onClose={() => setEditResendTarget(null)} loading={editResendMut.isPending}
          onConfirm={(body) => editResendMut.mutate({ id: editResendTarget._id, ...body })}
        />
      )}
      <CancelModal
        open={!!cancelTarget} onClose={() => setCancelTarget(null)} loading={cancelMut.isPending}
        onConfirm={(reason) => reason.trim() ? cancelMut.mutate({ id: cancelTarget._id, reason }) : toast.error('سبب الإلغاء مطلوب')}
      />
    </div>
  )
}
