import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ClipboardList, Check, CalendarClock, CalendarDays, CheckCircle2,
  UserCheck, MessageSquare, Copy, Sparkles, Send, ShieldAlert,
  ChevronDown, ChevronUp, AlertCircle, Clock,
} from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'
import PrivateImage from '../../components/ui/PrivateImage.jsx'
import StudentScheduleSection, { emptySchedule } from '../../components/ui/StudentScheduleSection.jsx'
import {
  deriveScheduleDays, validateScheduleForSubmit, buildAssignmentMessagePreview,
  formatScheduleDays, formatScheduleTimes,
} from '../../utils/assignmentSchedule.js'
import { useTeachingSubjects } from '../../hooks/useTeachingSubjects.js'

const STATUS_CONFIG = {
  pending: { label: 'قيد الانتظار', variant: 'warning' },
  under_review: { label: 'قيد المراجعة', variant: 'info' },
  approved: { label: 'تمت الموافقة', variant: 'success' },
  rejected: { label: 'مرفوض', variant: 'danger' },
}

const PAYMENT_METHOD_LABELS = {
  bank_transfer: 'حوالة بنكية',
  cash: 'نقداً',
  card: 'بطاقة ائتمانية',
  other: 'أخرى',
}

const STATUS_FILTER_TABS = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'approved', label: 'تمت الموافقة' },
  { value: 'rejected', label: 'مرفوض' },
]

export default function AdminEnrollmentsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showProof, setShowProof] = useState(false)
  const [reviewForm, setReviewForm] = useState({ action: 'approved', teacherId: '', levelId: '', groupName: '', adminNotes: '', startDate: '' })
  const [studentType, setStudentType] = useState('new')
  const [scheduleMode, setScheduleMode] = useState('none') // 'none' | 'direct' | 'request'
  const [schedule, setSchedule] = useState(emptySchedule)
  const [customMessage, setCustomMessage] = useState('')
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)

  const qc = useQueryClient()
  const { data: subjects = [] } = useTeachingSubjects()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'enrollments', page, statusFilter],
    queryFn: () => api.get(`/enrollments?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`).then(r => r.data),
    placeholderData: { data: [], totalPages: 1 },
  })

  const { data: pendingCount } = useQuery({
    queryKey: ['admin', 'enrollments', 'pending-count'],
    queryFn: () => api.get('/enrollments/pending-count').then(r => r.data.data?.count || 0),
    refetchInterval: 30000,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin', 'teachers', 'all'],
    queryFn: () => api.get('/admin/teachers?limit=100').then(r => r.data.data || []),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/enrollments/${id}/review`, body),
    onSuccess: (res, vars) => {
      const msg = res?.data?.message || (vars.action === 'approved' ? 'تمت الموافقة وتفعيل الاشتراك' : 'تم رفض الطلب')
      toast.success(msg)
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'assignments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      setSelectedRequest(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function openReview(req) {
    setSelectedRequest(req)
    setReviewForm({
      action: 'approved',
      teacherId: req.teacherId?._id || req.teacherId || '',
      levelId: req.levelId || '',
      groupName: req.groupName || '',
      adminNotes: req.adminNotes || '',
      startDate: '',
    })

    const reqStudentType = req.studentId?.studentType || 'new'
    setStudentType(reqStudentType)
    setScheduleMode('none')

    const initSched = emptySchedule()
    initSched.enabled = false
    initSched.specialization = 'quran'
    initSched.lessonDurationMinutes = 45
    initSched.startDate = new Date().toISOString().slice(0, 10)
    setSchedule(initSched)

    setCustomMessage('')
    setIsEditingMessage(false)
    setCopiedMessage(false)
  }

  function handleModeChange(mode) {
    setScheduleMode(mode)
    if (mode === 'none') {
      setSchedule(p => ({ ...p, enabled: false }))
    } else if (mode === 'direct') {
      setSchedule(p => ({
        ...p,
        enabled: true,
        immediateOverride: true,
        overrideReason: 'جدولة مباشرة من مراجعة طلب التسجيل (معلم كبير في السن أو اتفاق مسبق)',
      }))
    } else if (mode === 'request') {
      setStudentType('new')
      setSchedule(p => ({
        ...p,
        enabled: true,
        immediateOverride: false,
        overrideReason: '',
      }))
    }
  }

  function handleStudentTypeChange(type) {
    setStudentType(type)
    if (type === 'existing' && scheduleMode === 'request') {
      setScheduleMode('direct')
      setSchedule(p => ({
        ...p,
        immediateOverride: true,
        overrideReason: 'إسناد مباشر لطالب قديم',
      }))
    }
  }

  const selectedTeacher = teachers.find(t => t._id === reviewForm.teacherId)
  const teacherName = selectedTeacher ? `${selectedTeacher.firstNameAr} ${selectedTeacher.lastNameAr}` : ''
  const student = selectedRequest?.studentId || {}
  const studentName = student.firstNameAr ? `${student.firstNameAr} ${student.lastNameAr || ''}`.trim() : (student.name || '')
  const derivedDays = useMemo(() => deriveScheduleDays(schedule), [schedule.frequency, schedule.selectedDayOfWeeks, schedule.dayTimes, schedule.singleTime, schedule.startDate])

  const liveMessage = useMemo(() => {
    if (!selectedTeacher || !derivedDays.length) return ''
    const curriculumObj = subjects.find(s => s.key === schedule.specialization)
    const curriculumLabelOverride = curriculumObj ? curriculumObj.nameAr : undefined
    return buildAssignmentMessagePreview({
      teacherName,
      studentName,
      studentGender: student.gender,
      studentAge: student.birthDate
        ? Math.floor((new Date() - new Date(student.birthDate)) / (365.25 * 24 * 3600 * 1000))
        : (student.age || undefined),
      curriculum: schedule.specialization,
      curriculumLabelOverride,
      scheduleDays: derivedDays,
      scheduleTimes: derivedDays,
      lessonDurationMinutes: schedule.lessonDurationMinutes,
      teachingType: schedule.teachingType,
      startDate: schedule.startDate,
    })
  }, [selectedTeacher, teacherName, studentName, student.gender, student.birthDate, student.age, derivedDays, subjects, schedule.specialization, schedule.lessonDurationMinutes, schedule.teachingType, schedule.startDate])

  async function copyMessage() {
    const textToCopy = customMessage.trim() || liveMessage
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedMessage(true)
      toast.success('تم نسخ صيغة الرسالة بنجاح')
      setTimeout(() => setCopiedMessage(false), 2000)
    } catch {
      toast.error('تعذّر نسخ الرسالة')
    }
  }

  function submitReview() {
    if (reviewForm.action === 'approved' && !reviewForm.teacherId) {
      return toast.error('يجب تحديد المعلم عند الموافقة')
    }

    const payload = {
      action: reviewForm.action,
      teacherId: reviewForm.teacherId,
      levelId: reviewForm.levelId,
      groupName: reviewForm.groupName,
      startDate: reviewForm.startDate || undefined,
      adminNotes: reviewForm.adminNotes,
      studentType,
    }

    if (reviewForm.action === 'approved' && schedule.enabled) {
      const scheduleError = validateScheduleForSubmit(schedule, studentType)
      if (scheduleError) {
        return toast.error(scheduleError)
      }

      payload.scheduleConfig = {
        enabled: true,
        mode: scheduleMode,
        studentType,
        specialization: schedule.specialization,
        lessonDurationMinutes: schedule.lessonDurationMinutes,
        days: deriveScheduleDays(schedule),
        frequency: schedule.frequency,
        startDate: schedule.startDate,
        endDate: schedule.noEndDate ? null : (schedule.endDate || null),
        noEndDate: schedule.noEndDate,
        teachingType: schedule.teachingType,
        notes: schedule.notes,
        customMessage: customMessage.trim() || undefined,
        immediateOverride: scheduleMode === 'direct' || !!schedule.immediateOverride,
        overrideReason: scheduleMode === 'direct'
          ? (schedule.overrideReason || 'جدولة مباشرة من مراجعة طلب التسجيل (معلم كبير في السن أو اتفاق مسبق)')
          : schedule.overrideReason,
      }
    }

    reviewMutation.mutate({ id: selectedRequest._id, ...payload })
  }


  const requests = data?.data || []

  return (
    <div dir="rtl">
      <PageHeader
        title="طلبات التسجيل"
        subtitle="مراجعة وإقرار طلبات تسجيل الطلاب"
        actions={
          pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-600 font-bold text-sm">{pendingCount} طلب جديد</span>
            </div>
          )
        }
      />

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === tab.value
                ? 'bg-brand-purple text-white shadow-md'
                : 'bg-white text-[#7c6aaa] border border-[#e8e0f5] hover:bg-[#f5f0ff]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !requests.length ? (
        <div className="card-light p-12 text-center">
          <ClipboardList size={52} strokeWidth={1.3} color="#7c6aaa" className="mb-4 mx-auto" />
          <h3 className="font-heading font-bold text-lg text-brand-textBody mb-2">لا توجد طلبات</h3>
          <p className="text-[#7c6aaa] text-sm">لم يتم إيجاد أي طلبات تسجيل بهذه الحالة</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req._id} className="card-light p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Student info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={getFileUrl(req.studentId?.avatar)} firstName={req.studentId?.firstNameAr} lastName={req.studentId?.lastNameAr} size="md" />
                    <div className="min-w-0">
                      <div className="font-bold text-brand-textBody truncate">{req.studentId?.firstNameAr} {req.studentId?.lastNameAr}</div>
                      <div className="text-xs text-[#7c6aaa] truncate">{req.studentId?.email}</div>
                      {req.studentId?.phone && <div className="text-xs text-[#7c6aaa]">{req.studentId.phone}</div>}
                    </div>
                  </div>

                  {/* Package info */}
                  <div className="flex-none sm:w-44">
                    <div className="font-semibold text-sm text-brand-textBody">{req.packageId?.nameAr}</div>
                    <div className="text-xs text-[#7c6aaa]">{req.amount} — {PAYMENT_METHOD_LABELS[req.paymentMethod] || req.paymentMethod}</div>
                    {req.paymentReference && <div className="text-xs text-[#7c6aaa]">Ref: {req.paymentReference}</div>}
                  </div>

                  {/* Date */}
                  <div className="flex-none text-xs text-[#7c6aaa] sm:w-24 text-center">{formatDateAr(req.createdAt)}</div>

                  {/* Status */}
                  <div className="flex-none sm:w-32 text-center">
                    <Badge variant={STATUS_CONFIG[req.status]?.variant || 'gray'}>{STATUS_CONFIG[req.status]?.label || req.status}</Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex-none flex items-center gap-2">
                    {req.paymentProofId && (
                      <button
                        onClick={() => { setSelectedRequest(req); setShowProof(true) }}
                        className="text-xs text-brand-purple hover:underline font-semibold flex items-center gap-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                        إثبات
                      </button>
                    )}
                    {['pending', 'under_review'].includes(req.status) && (
                      <Button size="sm" variant="purple" onClick={() => openReview(req)}>مراجعة</Button>
                    )}
                    {req.status === 'approved' && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        مُعتمد <Check size={13} strokeWidth={2.5} /> {req.teacherId && `• ${req.teacherId.firstNameAr}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Student notes */}
                {req.studentNotes && (
                  <div className="mt-3 pt-3 border-t border-[#f0ecf8]">
                    <span className="text-xs font-bold text-[#7c6aaa]">ملاحظة الطالب: </span>
                    <span className="text-xs text-brand-textBody">{req.studentNotes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {data?.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination current={page} total={data.totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Payment proof modal */}
      <Modal
        open={showProof && !!selectedRequest?.paymentProofId}
        onClose={() => { setShowProof(false); setSelectedRequest(null) }}
        title="إثبات الدفع"
        size="md"
        footer={<Button variant="ghost" onClick={() => { setShowProof(false); setSelectedRequest(null) }}>إغلاق</Button>}
      >
        <div className="text-center">
          <PrivateImage src={selectedRequest?.paymentProofId} alt="إثبات الدفع" className="max-w-full max-h-[70vh] object-contain rounded-xl mx-auto border border-[#e8e0f5]" />
          <div className="mt-3 text-sm text-[#7c6aaa]">
            رُفع بواسطة: {selectedRequest?.studentId?.firstNameAr} — {formatDateAr(selectedRequest?.updatedAt)}
          </div>
        </div>
      </Modal>

      {/* Review modal */}
      <Modal
        open={!!selectedRequest && !showProof}
        onClose={() => setSelectedRequest(null)}
        title="مراجعة طلب التسجيل"
        size={reviewForm.action === 'approved' && schedule.enabled ? 'xl' : 'lg'}
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="ghost" onClick={() => setSelectedRequest(null)}>إلغاء</Button>
            <Button
              variant={reviewForm.action === 'approved' ? 'purple' : 'danger'}
              onClick={submitReview}
              loading={reviewMutation.isPending}
            >
              {reviewForm.action === 'approved'
                ? (schedule.enabled
                    ? (scheduleMode === 'direct'
                        ? 'موافقة وتفعيل الاشتراك والجدولة الفورية'
                        : 'موافقة وتفعيل وإرسال طلب الإسناد')
                    : 'موافقة وتفعيل الاشتراك')
                : 'رفض الطلب'}
            </Button>
          </div>
        }
      >
        {selectedRequest && (
          <div className="space-y-5">
            {/* Student summary */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f8f5ff] border border-[#ece3ff]">
              <Avatar src={getFileUrl(selectedRequest.studentId?.avatar)} firstName={selectedRequest.studentId?.firstNameAr} lastName={selectedRequest.studentId?.lastNameAr} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-textBody truncate">{selectedRequest.studentId?.firstNameAr} {selectedRequest.studentId?.lastNameAr}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (selectedRequest.studentId?.studentType || studentType) === 'existing'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-violet-100 text-brand-purple'
                  }`}>
                    {(selectedRequest.studentId?.studentType || studentType) === 'existing' ? 'طالب قديم' : 'طالب جديد'}
                  </span>
                </div>
                <div className="text-xs text-[#7c6aaa] mt-0.5 truncate">{selectedRequest.studentId?.email} {selectedRequest.studentId?.phone && `| ${selectedRequest.studentId.phone}`}</div>
                <div className="text-xs text-[#7c6aaa] mt-0.5">الباقة: <span className="font-semibold text-brand-textBody">{selectedRequest.packageId?.nameAr}</span> — {selectedRequest.amount}</div>
              </div>
              {selectedRequest.paymentProofId && (
                <button type="button" onClick={() => setShowProof(true)} className="text-xs text-brand-purple hover:underline font-semibold flex-none px-2 py-1 bg-white rounded-lg border border-[#e0d8f5]">
                  عرض إثبات الدفع
                </button>
              )}
            </div>

            {/* Action choice */}
            <div>
              <label className="block text-xs font-bold text-brand-textBody mb-2">الإجراء</label>
              <div className="flex gap-3">
                {[
                  { value: 'approved', label: 'موافقة وتفعيل', color: 'bg-emerald-50 border-emerald-400 text-emerald-800' },
                  { value: 'rejected', label: 'رفض الطلب', color: 'bg-red-50 border-red-400 text-red-700' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReviewForm(p => ({ ...p, action: opt.value }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                      reviewForm.action === opt.value ? opt.color + ' shadow-sm' : 'border-[#e0d8f5] bg-white text-[#7c6aaa]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Approval fields */}
            {reviewForm.action === 'approved' && (
              <>
                {/* Teacher selection */}
                <div>
                  <label className="block text-xs font-bold text-brand-textBody mb-1.5">تعيين المعلم <span className="text-red-500">*</span></label>
                  <select
                    value={reviewForm.teacherId}
                    onChange={e => setReviewForm(p => ({ ...p, teacherId: e.target.value }))}
                    className="field-light w-full"
                  >
                    <option value="">اختر معلماً للطلب...</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr} ({t.email})</option>
                    ))}
                  </select>
                </div>

                {/* Student Type Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-brand-textBody">
                      نوع الطالب <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-gray-500">
                      {studentType === 'existing' ? 'طالب مستمر: جدولة فورية مباشرة' : 'طالب جديد: إشعار للمعلم مع إمكانية الاعتماد الفوري'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleStudentTypeChange('new')}
                      className={`p-3 rounded-xl border-2 text-right transition-all flex items-start gap-2.5 ${
                        studentType === 'new'
                          ? 'border-brand-purple bg-[#f9f6ff] shadow-sm'
                          : 'border-[#e8e0f5] bg-white hover:border-brand-purple/40 text-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center flex-none ${
                        studentType === 'new' ? 'border-brand-purple bg-brand-purple' : 'border-gray-300'
                      }`}>
                        {studentType === 'new' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-brand-textBody">طالب جديد</div>
                        <div className="text-[11px] text-[#7c6aaa] mt-0.5">يسجل لأول مرة في الأكاديمية</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStudentTypeChange('existing')}
                      className={`p-3 rounded-xl border-2 text-right transition-all flex items-start gap-2.5 ${
                        studentType === 'existing'
                          ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                          : 'border-[#e8e0f5] bg-white hover:border-emerald-300 text-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center flex-none ${
                        studentType === 'existing' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                      }`}>
                        {studentType === 'existing' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-brand-textBody">طالب قديم (مستمر)</div>
                        <div className="text-[11px] text-[#7c6aaa] mt-0.5">طالب قائم ينتقل لمعلم أو يجدد باقته</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Scheduling Mode Cards */}
                <div className="pt-2 border-t border-[#f0ebfa]">
                  <label className="block text-xs font-bold text-brand-textBody mb-2 flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-brand-purple" />
                    خيارات الجدولة والإسناد للمعلم
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Mode 1: None */}
                    <button
                      type="button"
                      onClick={() => handleModeChange('none')}
                      className={`p-3 rounded-xl border-2 text-right transition-all flex flex-col justify-between ${
                        scheduleMode === 'none'
                          ? 'border-gray-700 bg-gray-50/80 shadow-sm'
                          : 'border-[#e8e0f5] bg-white hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-brand-textBody flex items-center gap-1.5">
                          <UserCheck size={14} className="text-gray-600" /> تعيين فقط
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          scheduleMode === 'none' ? 'border-gray-700 bg-gray-700' : 'border-gray-300'
                        }`}>
                          {scheduleMode === 'none' && <div className="w-1 h-1 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500">تفعيل الاشتراك وتعيين المعلم، وترتيب المواعيد لاحقاً.</p>
                    </button>

                    {/* Mode 2: Direct Scheduling */}
                    <button
                      type="button"
                      onClick={() => handleModeChange('direct')}
                      className={`p-3 rounded-xl border-2 text-right transition-all flex flex-col justify-between relative overflow-hidden ${
                        scheduleMode === 'direct'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-400'
                          : 'border-[#e8e0f5] bg-white hover:border-emerald-300 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-emerald-600" /> جدولة مباشرة فورية
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          scheduleMode === 'direct' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                        }`}>
                          {scheduleMode === 'direct' && <div className="w-1 h-1 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-600">إنشاء الحصص باسم الطالب فوراً (مناسب للمعلمين كبار السن).</p>
                      <span className="mt-1.5 inline-block text-[9.5px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded w-fit">
                        اعتماد فوري
                      </span>
                    </button>

                    {/* Mode 3: Send Assignment Request */}
                    <button
                      type="button"
                      onClick={() => handleModeChange('request')}
                      className={`p-3 rounded-xl border-2 text-right transition-all flex flex-col justify-between ${
                        scheduleMode === 'request'
                          ? 'border-brand-purple bg-[#f8f4ff] shadow-sm ring-1 ring-brand-purple'
                          : 'border-[#e8e0f5] bg-white hover:border-brand-purple/40 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-brand-textBody flex items-center gap-1.5">
                          <Send size={14} className="text-brand-purple" /> إرسال طلب للموافقة
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          scheduleMode === 'request' ? 'border-brand-purple bg-brand-purple' : 'border-gray-300'
                        }`}>
                          {scheduleMode === 'request' && <div className="w-1 h-1 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-[#7c6aaa]">إرسال المواعيد للمعلم لإقرارها أو اقتراح موعد بديل.</p>
                      <span className="mt-1.5 inline-block text-[9.5px] font-bold text-brand-purple bg-brand-purple/10 px-1.5 py-0.5 rounded w-fit">
                        إشعار ورسالة للمعلم
                      </span>
                    </button>
                  </div>
                </div>

                {/* Mode Explanation Badges */}
                {scheduleMode === 'direct' && (
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-none mt-0.5" />
                    <div>
                      <div className="font-bold">نظام الاعتماد والجدولة المباشرة:</div>
                      <div className="text-[11.5px] text-emerald-700 mt-0.5">
                        سيتولى النظام حجز المواعيد وتوليد الحصص الدورية باسم الطالب مباشرة، وإرسال إشعار رسمي للمعلم بجدوله الجديد. مناسب جداً في حال كان المعلم كبيراً في السن أو تم التنسيق معه مسبقاً.
                      </div>
                    </div>
                  </div>
                )}

                {scheduleMode === 'request' && (
                  <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 text-xs text-violet-800 flex items-start gap-2">
                    <Clock size={16} className="text-brand-purple flex-none mt-0.5" />
                    <div>
                      <div className="font-bold">نظام طلب الإسناد والموافقة:</div>
                      <div className="text-[11.5px] text-violet-700 mt-0.5">
                        سيتم حجز الموعد مؤقتاً وإرسال إشعار فوري للمعلم مع رسالة مفصلة في قائمة "طلبات الطلاب"، ليتمكن من مراجعة الموعد وقبوله أو اقتراح موعد بديل يناسبه.
                      </div>
                    </div>
                  </div>
                )}

                {/* Embedded Interactive Schedule Builder when enabled */}
                {schedule.enabled && (
                  <div className="space-y-4 pt-1">
                    {!reviewForm.teacherId && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-700 flex items-center gap-2">
                        <AlertCircle size={15} className="flex-none" />
                        <span>يرجى اختيار المعلم أعلاه لعرض المواعيد المتاحة والتحقق التلقائي من التعارضات.</span>
                      </div>
                    )}

                    <StudentScheduleSection
                      value={schedule}
                      onChange={setSchedule}
                      teacherId={reviewForm.teacherId}
                      studentId={selectedRequest?.studentId?._id}
                      studentType={studentType}
                      overrideAllowed={true}
                    />

                    {/* Teacher Notification Message Preview & Customization */}
                    {selectedTeacher && derivedDays.length > 0 && (
                      <div className="rounded-xl border border-brand-purple/20 bg-gradient-to-b from-[#faf7ff] to-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-brand-purple/10 text-brand-purple flex items-center justify-center">
                              <MessageSquare size={14} />
                            </span>
                            <div>
                              <div className="text-xs font-bold text-brand-textBody flex items-center gap-1.5">
                                صيغة الرسالة وإشعار المعلم
                                <span className="text-[10px] text-brand-purple bg-brand-purple/10 px-1.5 py-0.2 rounded font-semibold">
                                  {scheduleMode === 'direct' ? 'إشعار إسناد مباشر' : 'طلب إسناد جديد'}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500">
                                الصيغة الرسمية التي ستصل للمعلم في النظام وتطبيق الأكاديمية
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={copyMessage}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                copiedMessage
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-white border border-gray-200 text-gray-700 hover:border-brand-purple hover:text-brand-purple shadow-sm'
                              }`}
                              title="نسخ الرسالة لإرسالها عبر واتساب"
                            >
                              {copiedMessage ? (
                                <>
                                  <Check size={13} /> تم النسخ!
                                </>
                              ) : (
                                <>
                                  <Copy size={13} /> نسخ لواتساب
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsEditingMessage(!isEditingMessage)}
                              className="text-xs font-bold text-brand-purple hover:underline px-2 py-1"
                            >
                              {isEditingMessage ? 'إغلاق التعديل' : 'تخصيص النص'}
                            </button>
                          </div>
                        </div>

                        {isEditingMessage ? (
                          <div className="space-y-1.5">
                            <textarea
                              rows={8}
                              value={customMessage || liveMessage}
                              onChange={e => setCustomMessage(e.target.value)}
                              className="field-light w-full font-sans text-xs leading-relaxed text-gray-800 bg-white"
                              placeholder="اكتب صيغة الرسالة المخصصة للمعلم..."
                            />
                            <div className="flex items-center justify-between text-[10.5px] text-gray-500">
                              <span>يمكنك إضافة أي توجيهات إضافية للمعلم أو تعديل التحية.</span>
                              <button
                                type="button"
                                onClick={() => setCustomMessage('')}
                                className="text-brand-purple font-semibold hover:underline"
                              >
                                استعادة الصيغة الافتراضية
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-white border border-gray-100 p-3.5 text-xs text-gray-700 whitespace-pre-line leading-relaxed font-sans shadow-sm select-text border-r-4 border-r-brand-purple">
                            {customMessage.trim() || liveMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Level and Group Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-textBody mb-1.5">المستوى الأكاديمي (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: مبتدئ، متوسط"
                      value={reviewForm.levelId}
                      onChange={e => setReviewForm(p => ({ ...p, levelId: e.target.value }))}
                      className="field-light w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-textBody mb-1.5">اسم المجموعة / الحلقة</label>
                    <input
                      type="text"
                      placeholder="مثال: حلقة النور، مجموعة أ"
                      value={reviewForm.groupName}
                      onChange={e => setReviewForm(p => ({ ...p, groupName: e.target.value }))}
                      className="field-light w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-textBody mb-1.5">تاريخ بدء الاشتراك</label>
                  <input
                    type="date"
                    value={reviewForm.startDate}
                    onChange={e => setReviewForm(p => ({ ...p, startDate: e.target.value }))}
                    className="field-light w-full"
                  />
                  <p className="text-xs text-[#7c6aaa] mt-1">اتركه فارغاً لتفعيل الاشتراك من اليوم</p>
                </div>
              </>
            )}

            {/* Admin notes */}
            <div>
              <label className="block text-xs font-bold text-brand-textBody mb-1.5">
                {reviewForm.action === 'approved' ? 'ملاحظات إدارية (اختياري)' : 'سبب الرفض (مطلوب)'}
              </label>
              <textarea
                rows={3}
                placeholder={reviewForm.action === 'approved' ? 'أي ملاحظات للطالب أو للمعلم...' : 'اذكر السبب حتى يتمكن الطالب من التصحيح...'}
                value={reviewForm.adminNotes}
                onChange={e => setReviewForm(p => ({ ...p, adminNotes: e.target.value }))}
                className="field-light w-full resize-none"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
