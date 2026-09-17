import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Calendar, Clock, Video, Trash2,
  RotateCw, Save, Plus, Link2, ChevronDown, Info,
  AlertCircle, CheckCircle2, RefreshCw, Layers,
  GraduationCap, UserCheck, CalendarClock, Hash, Sparkles,
} from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import ConfirmDialog from '../shared/ConfirmDialog.jsx'
import AcademyTimezoneNotice from '../ui/AcademyTimezoneNotice.jsx'
import { DAYS_OF_WEEK, SCHEDULE_FREQUENCY } from '../../config/constants.js'
import { academyDateKey, formatDateAr } from '../../utils/date.js'

const STATUS_CONFIG = {
  active: { label: 'نشط ومستمر' },
  paused: { label: 'موقوف مؤقتاً' },
  ended: { label: 'منتهٍ' },
}

const DURATION_OPTIONS = [
  { value: 30, label: '30 دقيقة' },
  { value: 45, label: '45 دقيقة' },
  { value: 60, label: 'ساعة كاملة (60 دقيقة)' },
  { value: 90, label: 'ساعة ونصف (90 دقيقة)' },
  { value: 120, label: 'ساعتان (120 دقيقة)' },
]

const MEETING_PROVIDERS = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'meet', label: 'Google Meet' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'other', label: 'منصة أخرى' },
]

const PRESET_SESSION_COUNTS = [4, 8, 12, 16, 24]
const PRESET_DURATION_DAYS = [
  { days: 15, label: '15 يوماً' },
  { days: 30, label: '30 يوماً (شهر)' },
  { days: 60, label: '60 يوماً (شهران)' },
  { days: 90, label: '90 يوماً (3 أشهر)' },
]

function formatTime12h(timeStr) {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h)) return timeStr
  const period = h >= 12 ? 'م' : 'ص'
  const h12 = h % 12 || 12
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`
}

function computeEndDateStr(startDateStr, days) {
  if (!startDateStr) return ''
  const start = new Date(startDateStr)
  if (isNaN(start.getTime())) return ''
  const end = new Date(start.getTime() + (Number(days) || 30) * 24 * 60 * 60 * 1000)
  return end.toISOString().slice(0, 10)
}

function computeDiffDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 30
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 30
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 1
}

/**
 * Custom styled Select wrapper with Lucide Chevron, line-height reset,
 * and zero text-clipping in RTL Arabic.
 */
function FormSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options = [],
  placeholder,
  required,
  disabled,
  badge,
  className = '',
}) {
  return (
    <div className="flex flex-col">
      {label && (
        <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            {Icon && <Icon size={13} className="text-violet-600 flex-none" />}
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </label>
          {badge}
        </div>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full h-11 bg-white border border-slate-200 rounded-xl ps-3.5 pe-10 text-sm font-medium text-slate-800 outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
          style={{ lineHeight: 'normal' }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      </div>
    </div>
  )
}

/**
 * Custom styled Input wrapper with clear labels and consistent heights.
 */
function FormInput({
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  disabled,
  dir,
  min,
  max,
  badge,
  helperText,
  className = '',
}) {
  return (
    <div className="flex flex-col">
      {label && (
        <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            {Icon && <Icon size={13} className="text-violet-600 flex-none" />}
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </label>
          {badge}
        </div>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          dir={dir}
          className={`w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400 ${className}`}
          style={{ lineHeight: 'normal' }}
        />
      </div>
      {helperText && (
        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{helperText}</p>
      )}
    </div>
  )
}

export default function EditScheduleRuleModal({
  rule = null,
  initialTeacherId = '',
  initialStudentId = '',
  initialSubscription = null,
  student = null,
  lockTeacher = false,
  lockStudent = false,
  teachers: propTeachers,
  students: propStudents,
  onClose,
  onSuccess,
}) {
  const qc = useQueryClient()
  const isEdit = Boolean(rule && rule._id)

  // Fetch teachers if not provided
  const { data: fetchedTeachers = [] } = useQuery({
    queryKey: ['admin', 'teachers', 'combobox'],
    queryFn: () =>
      api.get('/admin/teachers', { params: { limit: 100 } }).then(
        (r) => r.data.data?.teachers || r.data.data?.rows || r.data.data || []
      ),
    enabled: !propTeachers || propTeachers.length === 0,
    staleTime: 60_000,
  })

  // Fetch students if not provided
  const { data: fetchedStudents = [] } = useQuery({
    queryKey: ['admin', 'students', 'combobox'],
    queryFn: () =>
      api.get('/admin/students', { params: { limit: 150 } }).then(
        (r) => r.data.data?.students || r.data.data?.rows || r.data.data || []
      ),
    enabled: !propStudents || propStudents.length === 0,
    staleTime: 60_000,
  })

  // Fetch active packages for subscription assignment
  const { data: activePackages = [] } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => api.get('/packages').then((r) => r.data.data || []),
    staleTime: 60_000,
  })

  const teachers = propTeachers && propTeachers.length > 0 ? propTeachers : fetchedTeachers
  const students = propStudents && propStudents.length > 0 ? propStudents : fetchedStudents

  const resolvedInitialTeacherId = initialTeacherId || rule?.teacherId?._id || rule?.teacherId || ''
  const resolvedInitialStudentId = initialStudentId || rule?.studentId?._id || rule?.studentId || ''

  const defaultStartDate = rule?.startDate ? rule.startDate.slice(0, 10) : academyDateKey(new Date())

  const [form, setForm] = useState({
    teacherId: resolvedInitialTeacherId,
    studentId: resolvedInitialStudentId,
    status: rule?.status || 'active',
    frequency: rule?.frequency || 'weekly',
    daysOfWeek: rule?.daysOfWeek || [0, 2], // Default: Sun + Tue
    timeOfDay: rule?.timeOfDay || '18:00',
    durationMinutes: rule?.durationMinutes || 60,
    startDate: defaultStartDate,
    endDate: rule?.endDate ? rule.endDate.slice(0, 10) : '',
    sessionsTotal: rule?.sessionsTotal || 8,
    meetingProvider: rule?.meetingProvider || 'zoom',
    meetingLink: rule?.meetingLink || '',
    titleTemplate: rule?.titleTemplate || '',
    notes: rule?.notes || '',

    // Subscription & Package selection fields
    packageId: '',
    subscriptionDays: 30,
    subscriptionEndDate: computeEndDateStr(defaultStartDate, 30),
    lessonsRemaining: 8,
    lessonsUsed: 0,
    overrideSubscription: false,
  })

  const [confirmDelete, setConfirmDelete] = useState(false)

  // Fetch selected student profile to check active subscription and wallet
  const selectedStudentId = form.studentId
  const { data: studentDetailRes } = useQuery({
    queryKey: ['admin', 'student-for-rule', selectedStudentId],
    queryFn: () => api.get(`/admin/students/${selectedStudentId}`).then((r) => r.data.data),
    enabled: Boolean(selectedStudentId),
    staleTime: 30_000,
  })

  // Detect active subscription
  const activeSubscription = useMemo(() => {
    if (initialSubscription && initialSubscription.status === 'active') {
      return initialSubscription
    }
    const sub = studentDetailRes?.subscription
    if (sub && sub.status === 'active') {
      return sub
    }
    return null
  }, [initialSubscription, studentDetailRes])

  const hasActiveSubscription = Boolean(activeSubscription)
  const studentWallet = studentDetailRes?.wallet || null

  // Fetch selected teacher details to get their general meeting link
  const selectedTeacherId = form.teacherId
  const { data: teacherProfileRes } = useQuery({
    queryKey: ['admin', 'teacher-profile-for-rule', selectedTeacherId],
    queryFn: () => api.get(`/admin/teachers/${selectedTeacherId}`).then((r) => r.data.data),
    enabled: Boolean(selectedTeacherId),
    staleTime: 60_000,
  })

  const teacherGeneralLink = useMemo(() => {
    const directTeacher = teachers.find((t) => String(t._id) === String(selectedTeacherId))
    const links = teacherProfileRes?.meetingLinks || directTeacher?.meetingLinks
    return links?.[0] || null
  }, [teacherProfileRes, teachers, selectedTeacherId])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  // Auto-select package for unsubscribed student once packages load
  useEffect(() => {
    if (!isEdit && !hasActiveSubscription && !form.packageId && activePackages.length > 0) {
      const preferredPkg = activePackages.find((p) => p.isPopular) || activePackages[0]
      if (preferredPkg) {
        handleSelectPackage(preferredPkg._id)
      }
    }
  }, [activePackages, hasActiveSubscription, isEdit])

  // Handle Package Selection & Pre-population
  const handleSelectPackage = (pkgId) => {
    const pkg = activePackages.find((p) => String(p._id) === String(pkgId))
    if (pkg) {
      const days = pkg.durationDays || 30
      const sessions = pkg.sessionsPerMonth || 8
      const calculatedEnd = computeEndDateStr(form.startDate, days)

      setForm((p) => ({
        ...p,
        packageId: pkg._id,
        subscriptionDays: days,
        subscriptionEndDate: calculatedEnd,
        lessonsRemaining: sessions,
        lessonsUsed: 0,
        sessionsTotal: sessions,
      }))
    } else {
      setForm((p) => ({
        ...p,
        packageId: '',
        lessonsUsed: 0,
      }))
    }
  }

  // Dual-sync handlers for used vs remaining lessons: (used + remaining = total)
  const handleLessonsUsedChange = (val) => {
    const total = Number(selectedPackage?.sessionsPerMonth || form.sessionsTotal || 8)
    const used = val === '' ? '' : Math.max(0, Math.min(total, Number(val) || 0))
    const rem = used === '' ? total : Math.max(0, total - used)
    setForm((p) => ({
      ...p,
      lessonsUsed: used,
      lessonsRemaining: rem,
      sessionsTotal: rem,
    }))
  }

  const handleLessonsRemainingChange = (val) => {
    const total = Number(selectedPackage?.sessionsPerMonth || form.sessionsTotal || 8)
    const rem = val === '' ? '' : Math.max(0, Math.min(total, Number(val) || 0))
    const used = rem === '' ? 0 : Math.max(0, total - rem)
    setForm((p) => ({
      ...p,
      lessonsRemaining: rem,
      lessonsUsed: used,
      sessionsTotal: rem,
    }))
  }

  // Handle Duration Days Change
  const handleDaysChange = (days) => {
    const numDays = Math.max(1, Number(days) || 1)
    const calculatedEnd = computeEndDateStr(form.startDate, numDays)
    setForm((p) => ({
      ...p,
      subscriptionDays: numDays,
      subscriptionEndDate: calculatedEnd,
    }))
  }

  // Handle Subscription End Date Change
  const handleSubscriptionEndDateChange = (dateStr) => {
    const diff = computeDiffDays(form.startDate, dateStr)
    setForm((p) => ({
      ...p,
      subscriptionEndDate: dateStr,
      subscriptionDays: diff,
    }))
  }

  // Handle Start Date Change
  const handleStartDateChange = (dateStr) => {
    const calculatedEnd = computeEndDateStr(dateStr, form.subscriptionDays)
    setForm((p) => ({
      ...p,
      startDate: dateStr,
      subscriptionEndDate: calculatedEnd,
    }))
  }

  const toggleDay = (d) =>
    setForm((p) => ({
      ...p,
      daysOfWeek: p.daysOfWeek.includes(d)
        ? p.daysOfWeek.filter((x) => x !== d)
        : [...p.daysOfWeek, d].sort(),
    }))

  const handleApplyGeneralLink = () => {
    if (!teacherGeneralLink?.link) {
      toast.error('لم يسجل هذا المعلم رابطاً عاماً بعد في ملفه الشخصي')
      return
    }
    setForm((p) => ({
      ...p,
      meetingLink: teacherGeneralLink.link,
      meetingProvider: teacherGeneralLink.provider || p.meetingProvider || 'zoom',
    }))
    toast.success('تم إدراج الرابط العام للمعلم بنجاح')
  }

  // Selected entities for display
  const currentTeacher = teachers.find((t) => String(t._id) === String(form.teacherId))
  const currentStudent = students.find((s) => String(s._id || s.student?._id) === String(form.studentId))
  const studentTarget = student || currentStudent?.student || currentStudent
  const studentDisplayName = studentTarget
    ? `${studentTarget.firstNameAr || ''} ${studentTarget.lastNameAr || ''}`.trim()
    : ''
  const teacherDisplayName = currentTeacher
    ? `${currentTeacher.firstNameAr || ''} ${currentTeacher.lastNameAr || ''}`.trim()
    : ''

  const selectedPackage = activePackages.find((p) => String(p._id) === String(form.packageId))

  // Create or Update mutation
  const saveMut = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        durationMinutes: Number(data.durationMinutes) || 60,
        sessionsTotal: data.sessionsTotal ? Number(data.sessionsTotal) : undefined,
        endDate: data.endDate || undefined,
        titleTemplate: data.titleTemplate || (studentDisplayName ? studentDisplayName : 'حصة'),
      }

      // Attach package & subscription details if new rule and package selected
      const shouldAttachPackage =
        (!isEdit && (!hasActiveSubscription || data.overrideSubscription) && Boolean(data.packageId))
      if (shouldAttachPackage) {
        payload.packageId = data.packageId
        payload.subscriptionDays = Number(data.subscriptionDays) || 30
        payload.subscriptionEndDate = data.subscriptionEndDate || undefined
        payload.lessonsUsed = data.lessonsUsed !== undefined && data.lessonsUsed !== '' ? Number(data.lessonsUsed) : 0
        payload.lessonsRemaining =
          data.lessonsRemaining !== undefined && data.lessonsRemaining !== '' ? Number(data.lessonsRemaining) : undefined
        payload.startingSessionNumber = Number(payload.lessonsUsed) + 1
        if (payload.lessonsRemaining !== undefined) {
          payload.sessionsTotal = payload.lessonsRemaining
        }
      }

      if (isEdit) {
        return api.patch(`/admin/schedule-rules/${rule._id}`, payload).then((r) => r.data)
      }
      return api.post('/admin/schedule-rules', payload).then((r) => r.data)
    },
    onSuccess: (res) => {
      toast.success(
        isEdit
          ? 'تم تحديث الجدول الدوري بنجاح'
          : `تم إنشاء الجدول وتوليد ${res.data?.sessionCount || form.sessionsTotal || 0} حصة بنجاح`
      )

      // Invalidate all related caches
      qc.invalidateQueries({ queryKey: ['admin', 'schedule-rules'] })
      qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'student', 'schedule-rules'] })
      if (form.studentId) {
        qc.invalidateQueries({ queryKey: ['admin', 'student', form.studentId] })
        qc.invalidateQueries({ queryKey: ['admin', 'student', form.studentId, 'wallet'] })
        qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics', form.studentId] })
        qc.invalidateQueries({ queryKey: ['admin', 'student-for-rule', form.studentId] })
      }
      if (form.teacherId) {
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-schedule-rules', form.teacherId] })
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-sessions', form.teacherId] })
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', form.teacherId] })
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-availability', form.teacherId] })
      }
      qc.invalidateQueries({ queryKey: ['teacher', 'schedule-rules'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'students'] })

      if (onSuccess) onSuccess(res.data)
      onClose()
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || 'حدث خطأ أثناء حفظ الجدول الدوري'),
  })

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/admin/schedule-rules/${rule._id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('تم حذف الجدول الدوري والحصص المستقبلية بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'schedule-rules'] })
      qc.invalidateQueries({ queryKey: ['admin', 'student', 'schedule-rules'] })
      if (form.studentId) qc.invalidateQueries({ queryKey: ['admin', 'student', form.studentId] })
      if (form.teacherId) {
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-schedule-rules', form.teacherId] })
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-sessions', form.teacherId] })
      }
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'تعذر حذف الجدول'),
  })

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!form.teacherId) return toast.error('يرجى اختيار المعلم المسؤول')
    if (!form.studentId) return toast.error('يرجى اختيار الطالب المستفيد')
    if (
      (form.frequency === 'weekly' || form.frequency === 'biweekly') &&
      form.daysOfWeek.length === 0
    ) {
      return toast.error('يرجى تحديد يوم واحد على الأقل من أيام الأسبوع')
    }
    if (!form.startDate) return toast.error('تاريخ بدء الجدول مطلوب')

    // Validate package selection when student has no active subscription
    if (!isEdit && !hasActiveSubscription && !form.packageId) {
      return toast.error('الطالب غير مسجل في باقة نشطة — يرجى اختيار الباقة لتفعيل اشتراكه ومحفظته')
    }

    saveMut.mutate(form)
  }

  // Pre-mapped options
  const teacherOptions = useMemo(
    () =>
      teachers.map((t) => ({
        value: t._id,
        label: `${t.firstNameAr || ''} ${t.lastNameAr || ''}`.trim() || t.phone || t.email,
      })),
    [teachers]
  )

  const studentOptions = useMemo(
    () =>
      students.map((s) => {
        const st = s.student || s
        const name = `${st.firstNameAr || ''} ${st.lastNameAr || ''}`.trim() || 'طالب'
        const phone = st.phone ? ` (${st.phone})` : ''
        return {
          value: st._id,
          label: `${name}${phone}`,
        }
      }),
    [students]
  )

  const packageOptions = useMemo(
    () =>
      activePackages.map((p) => ({
        value: p._id,
        label: `${p.nameAr} (${p.sessionsPerMonth} حصص شهرياً — ${p.price} ${p.currency || 'EGP'})`,
      })),
    [activePackages]
  )

  const frequencyOptions = useMemo(
    () =>
      Object.entries(SCHEDULE_FREQUENCY).map(([k, v]) => ({
        value: k,
        label: v.label,
      })),
    []
  )

  const statusOptions = useMemo(
    () =>
      Object.entries(STATUS_CONFIG).map(([k, v]) => ({
        value: k,
        label: v.label,
      })),
    []
  )

  const showPackageConfiguration = !isEdit && (!hasActiveSubscription || form.overrideSubscription)

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={isEdit ? 'تعديل الجدول الدوري للحصص' : 'إنشاء جدول دوري وتوليد الحصص'}
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between w-full gap-3">
            <div>
              {isEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Trash2 size={14} className="text-rose-600" />}
                  className="!text-rose-600 hover:!bg-rose-50 !border-rose-200 w-full sm:w-auto cursor-pointer"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saveMut.isPending || deleteMut.isPending}
                >
                  حذف الجدول الدوري
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={saveMut.isPending || deleteMut.isPending}
                className="text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                variant="purple"
                onClick={handleSubmit}
                loading={saveMut.isPending}
                icon={isEdit ? <Save size={15} /> : <Plus size={16} />}
                className="cursor-pointer shadow-sm shadow-violet-200 font-bold"
              >
                {isEdit
                  ? 'حفظ التعديلات'
                  : showPackageConfiguration
                  ? `تفعيل الباقة وتوليد ${form.sessionsTotal || 8} حصص`
                  : `إنشاء الجدول وتوليد ${form.sessionsTotal || 8} حصص`}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-right" dir="rtl">
          {/* ── CARD 1: STUDENT & SUBSCRIPTION PACKAGE ─────────────────── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-none">
                  <UserCheck size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">بيانات الطالب والاشتراك في الباقة</h4>
                  <p className="text-[11px] text-slate-400">التحقق من حالة اشتراك الطالب والباقة المعتمدة</p>
                </div>
              </div>
              {hasActiveSubscription && !form.overrideSubscription && (
                <Badge variant="success" className="text-[11px]">
                  مشترك في باقة نشطة
                </Badge>
              )}
            </div>

            {/* Student Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                <label className="text-xs font-bold text-slate-700">
                  الطالب المستفيد <span className="text-rose-500">*</span>
                </label>
                {lockStudent && (
                  <span className="text-[10px] text-violet-700 font-bold bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                    محدد مسبقاً
                  </span>
                )}
              </div>

              {lockStudent ? (
                <div className="flex items-center gap-3 px-3.5 h-12 bg-slate-50/70 rounded-xl border border-slate-200">
                  <Avatar
                    firstName={studentTarget?.firstNameAr}
                    lastName={studentTarget?.lastNameAr}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-sm truncate">
                      {studentDisplayName || 'الطالب'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {studentTarget?.phone || studentTarget?.email || 'طالب مسجل'}
                    </div>
                  </div>
                </div>
              ) : (
                <FormSelect
                  value={form.studentId}
                  onChange={(e) => set('studentId', e.target.value)}
                  options={studentOptions}
                  placeholder="اختر الطالب من القائمة..."
                  required
                />
              )}
            </div>

            {/* Subscription State Banner & Configuration */}
            {hasActiveSubscription && !form.overrideSubscription ? (
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-none">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-900 block">
                        الطالب مشترك حالياً في: {activeSubscription.packageId?.nameAr || 'باقة معتمدة'}
                      </span>
                      <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                        الاشتراك سارٍ حتى {activeSubscription.endDate ? formatDateAr(activeSubscription.endDate) : 'نهاية الباقة'}
                      </div>
                    </div>
                  </div>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, overrideSubscription: true }))}
                      className="text-xs font-bold text-violet-700 bg-white border border-violet-200 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer flex-none"
                      title="تجديد أو ربط باقة مختلفة مع هذا الجدول"
                    >
                      <RefreshCw size={12} />
                      <span>تغيير أو تجديد الباقة</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-200/50 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">رصيد الحصص المتاح:</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {studentWallet?.lessonsRemaining ?? activeSubscription.sessionsTotal ?? '—'} حصص
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">تاريخ الانتهاء:</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {activeSubscription.endDate ? formatDateAr(activeSubscription.endDate) : 'مستمر'}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block text-[11px]">المعلم المرتبط:</span>
                    <span className="font-bold text-slate-800 text-sm truncate block">
                      {activeSubscription.teacherId?.firstNameAr
                        ? `${activeSubscription.teacherId.firstNameAr} ${activeSubscription.teacherId.lastNameAr || ''}`
                        : teacherDisplayName || 'سيتم الربط بالمعلم المحدد'}
                    </span>
                  </div>
                </div>
              </div>
            ) : showPackageConfiguration ? (
              <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3.5 sm:p-4 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-none mt-0.5">
                      <AlertCircle size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-900 block">
                        {hasActiveSubscription
                          ? 'تحديد باقة جديدة وتجديد الاشتراك للطالب'
                          : 'الطالب غير مسجل في أي باقة نشطة حالياً'}
                      </span>
                      <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                        اختر الباقة وحدد الأيام المتبقية ورصيد الحصص. سيقوم النظام بتفعيل الاشتراك وشحن المحفظة وربط الطالب بالمعلم تلقائياً.
                      </p>
                    </div>
                  </div>
                  {hasActiveSubscription && form.overrideSubscription && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, overrideSubscription: false, packageId: '' }))}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer flex-none"
                    >
                      إلغاء التغيير
                    </button>
                  )}
                </div>

                {/* Package Selection */}
                <div className="space-y-2">
                  <FormSelect
                    label="باقة الاشتراك المطلوب تفعيلها"
                    icon={Layers}
                    value={form.packageId}
                    onChange={(e) => handleSelectPackage(e.target.value)}
                    options={packageOptions}
                    placeholder="-- اختر الباقة المناسبة للطالب --"
                    required
                  />

                  {/* Selected Package Highlight Card */}
                  {selectedPackage && (
                    <div className="bg-white rounded-xl border border-violet-100 p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">{selectedPackage.nameAr}</span>
                        <span className="text-slate-500 text-[11px]">
                          {selectedPackage.sessionsPerMonth} حصص شهرياً • المدة الافتراضية: {selectedPackage.durationDays || 30} يوماً
                        </span>
                      </div>
                      <div className="text-left" dir="ltr">
                        <span className="font-extrabold text-violet-700 text-sm">
                          {selectedPackage.price} {selectedPackage.currency || 'EGP'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Remaining Days & Duration of Package */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock size={13} className="text-violet-600 flex-none" />
                      <span>الأيام المتبقية أو مدة الباقة</span>
                    </label>
                    <span className="text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-0.5 rounded-full">
                      {form.subscriptionDays} يوماً متبقياً
                    </span>
                  </div>

                  {/* Preset Duration Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {PRESET_DURATION_DAYS.map((preset) => {
                      const isSelected = Number(form.subscriptionDays) === preset.days
                      return (
                        <button
                          key={preset.days}
                          type="button"
                          onClick={() => handleDaysChange(preset.days)}
                          className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'bg-violet-600 text-white shadow-xs border border-violet-600'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                          }`}
                        >
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom Days Input & Computed Expiration Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <FormInput
                      label="عدد الأيام المتبقية (مخصص)"
                      type="number"
                      min={1}
                      max={365}
                      value={form.subscriptionDays || ''}
                      onChange={(e) => handleDaysChange(e.target.value)}
                      placeholder="30"
                    />
                    <FormInput
                      label="تاريخ انتهاء الاشتراك المحسوب"
                      type="date"
                      value={form.subscriptionEndDate || ''}
                      onChange={(e) => handleSubscriptionEndDateChange(e.target.value)}
                      helperText={`ينتهي في: ${form.subscriptionEndDate ? formatDateAr(form.subscriptionEndDate) : '—'}`}
                    />
                  </div>
                </div>

                {/* Opening Balance Lessons & Teacher Credit Sync */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        توزيع رصيد الباقة وتوريد استحقاق المعلم المالي
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        حدد الحصص المستهلكة سابقاً مع المعلم والرصيد المتبقي للطالب (يسمع عند الاثنين تلقائياً)
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-lg">
                      إجمالي الباقة: {selectedPackage?.sessionsPerMonth || form.sessionsTotal || 8} حصص
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 1. Consumed Lessons (Credited to Teacher) */}
                    <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <span>حصص مستهلكة سابقاً مع المعلم</span>
                        </label>
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                          لحساب المعلم
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-800/80 leading-relaxed">
                        لو الطالب قديم وأتمّ حصصاً خارج المنصة، حددها هنا لتُسجل كحصص مكتملة وتُحسب في راتب المعلم.
                      </p>

                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {[0, 2, 4, 6, 8].map((n) => {
                          const isSelected = Number(form.lessonsUsed) === n
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => handleLessonsUsedChange(n)}
                              className={`h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-600 text-white shadow-2xs border border-amber-600'
                                  : 'bg-white text-slate-700 hover:bg-amber-100/60 border border-amber-200/60'
                              }`}
                            >
                              {n}
                            </button>
                          )
                        })}
                      </div>

                      <input
                        type="number"
                        min={0}
                        max={selectedPackage?.sessionsPerMonth || form.sessionsTotal || 100}
                        value={form.lessonsUsed === '' ? '' : form.lessonsUsed}
                        onChange={(e) => handleLessonsUsedChange(e.target.value)}
                        className="w-full h-9 bg-white border border-amber-200 rounded-lg px-3 text-xs font-bold text-amber-950 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                        placeholder="أدخل عدد الحصص المستهلكة..."
                      />
                    </div>

                    {/* 2. Remaining Lessons (Credited to Student Wallet) */}
                    <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <span>رصيد الحصص المتبقي للطالب</span>
                        </label>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          في محفظة الطالب
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-800/80 leading-relaxed">
                        الرصيد الفعلي الذي سيتم شحنه في محفظة الطالب لحضور الحصص القادمة عبر المنصة.
                      </p>

                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {[2, 4, 6, 8, 12].map((n) => {
                          const isSelected = Number(form.lessonsRemaining) === n
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => handleLessonsRemainingChange(n)}
                              className={`h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-2xs border border-emerald-600'
                                  : 'bg-white text-slate-700 hover:bg-emerald-100/60 border border-emerald-200/60'
                              }`}
                            >
                              {n}
                            </button>
                          )
                        })}
                      </div>

                      <input
                        type="number"
                        min={0}
                        max={selectedPackage?.sessionsPerMonth || form.sessionsTotal || 100}
                        value={form.lessonsRemaining === '' ? '' : form.lessonsRemaining}
                        onChange={(e) => handleLessonsRemainingChange(e.target.value)}
                        className="w-full h-9 bg-white border border-emerald-200 rounded-lg px-3 text-xs font-bold text-emerald-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        placeholder="أدخل الحصص المتبقية..."
                      />
                    </div>
                  </div>

                  {/* Dual Sync Confirmation Pill */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs space-y-1 text-slate-700">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-none" />
                      <span>
                        سيتم شحن محفظة الطالب برصيد: <b>{form.lessonsRemaining || 0} حصص متبقية</b>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={`w-2 h-2 rounded-full ${Number(form.lessonsUsed) > 0 ? 'bg-amber-500' : 'bg-slate-300'} flex-none`} />
                      <span>
                        {Number(form.lessonsUsed) > 0 ? (
                          <>
                            سيتم احتساب <b>{form.lessonsUsed} حصص كمكتملة</b> وإضافتها لاستحقاق مسير رواتب المعلم (<b>{teacherDisplayName || 'المعلم'}</b>) تلقائياً
                          </>
                        ) : (
                          'لا توجد حصص سابقة مخصومة (الباقة جديدة بالكامل للمعلم والطالب)'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Smart Sequence Preview Card */}
                  {(() => {
                    const totalPkgSessions = Number(selectedPackage?.sessionsPerMonth || form.sessionsTotal || 16)
                    const usedLessons = Number(form.lessonsUsed) || 0
                    const remLessons = form.lessonsRemaining !== undefined && form.lessonsRemaining !== '' ? Number(form.lessonsRemaining) : Math.max(0, totalPkgSessions - usedLessons)
                    const firstSessionNum = usedLessons + 1
                    const lastSessionNum = Math.min(totalPkgSessions, usedLessons + remLessons)

                    return (
                      <div className="bg-gradient-to-br from-violet-50/70 via-white to-purple-50/50 border border-violet-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs" dir="rtl">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xs shadow-xs">
                              <Sparkles size={14} />
                            </span>
                            <div>
                              <h5 className="text-xs font-bold text-gray-900">
                                احتساب ترقيم الحصص الذكي المرتبط بالرصيد
                              </h5>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                تتطابق أرقام الحصص على المنصة مباشرة مع استهلاك الطالب الفعلي
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-violet-100/80 text-violet-800 border border-violet-200/60">
                            <Hash size={11} className="text-violet-600" />
                            أول حصة: {firstSessionNum} من {totalPkgSessions}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                          {/* 1. Past Consumed */}
                          <div className="bg-white/90 border border-amber-200/70 rounded-xl p-2.5 space-y-1">
                            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                              حصص مستهلكة مسبقاً
                            </div>
                            <div className="font-extrabold text-amber-950 text-sm">
                              {usedLessons > 0 ? `${usedLessons} حصص` : 'لا يوجد (0)'}
                            </div>
                            <div className="text-[11px] text-amber-700/90 leading-tight">
                              {usedLessons > 0
                                ? `أُنجزت من 1 إلى ${usedLessons} (محسوبة في الراتب)`
                                : 'الباقة تبدأ جديدة من الحصة 1'}
                            </div>
                          </div>

                          {/* 2. First Upcoming on Platform */}
                          <div className="bg-white/90 border border-violet-200 rounded-xl p-2.5 space-y-1 shadow-xs ring-1 ring-violet-500/20">
                            <div className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">
                              أول حصة على المنصة
                            </div>
                            <div className="font-extrabold text-violet-900 text-sm flex items-center gap-1">
                              <span>حصة رقم ({firstSessionNum} من {totalPkgSessions})</span>
                            </div>
                            <div className="text-[11px] text-violet-600/90 leading-tight">
                              {usedLessons > 0
                                ? `تبدأ مباشرة من رقم ${firstSessionNum} لا من 1`
                                : `تبدأ كأول حصة من إجمالي ${totalPkgSessions}`}
                            </div>
                          </div>

                          {/* 3. Total Scheduled on Platform */}
                          <div className="bg-white/90 border border-emerald-200/70 rounded-xl p-2.5 space-y-1">
                            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                              الحصص المتبقية المجدولة
                            </div>
                            <div className="font-extrabold text-emerald-950 text-sm">
                              {remLessons} حصص مجدولة
                            </div>
                            <div className="text-[11px] text-emerald-700/90 leading-tight">
                              {remLessons > 0
                                ? `تسلسلها من ${firstSessionNum} إلى ${lastSessionNum}`
                                : 'تم استهلاك رصيد الباقة بالكامل'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ) : null}
          </div>

          {/* ── CARD 2: TEACHER & WEEKLY SCHEDULE ──────────────────────── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-none">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">المعلم المسؤول والمواعيد الأسبوعية</h4>
                  <p className="text-[11px] text-slate-400">تحديد المعلم، نمط التكرار، وأيام وتوقيت الحصص</p>
                </div>
              </div>
            </div>

            {/* Teacher Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                <label className="text-xs font-bold text-slate-700">
                  المعلم المسؤول <span className="text-rose-500">*</span>
                </label>
                {lockTeacher && (
                  <span className="text-[10px] text-violet-700 font-bold bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                    محدد مسبقاً
                  </span>
                )}
              </div>

              {lockTeacher ? (
                <div className="flex items-center gap-3 px-3.5 h-12 bg-slate-50/70 rounded-xl border border-slate-200">
                  <Avatar
                    firstName={currentTeacher?.firstNameAr}
                    lastName={currentTeacher?.lastNameAr}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-sm truncate">
                      {teacherDisplayName || 'المعلم'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">معلم معتمد في الأكاديمية</div>
                  </div>
                </div>
              ) : (
                <FormSelect
                  value={form.teacherId}
                  onChange={(e) => set('teacherId', e.target.value)}
                  options={teacherOptions}
                  placeholder="اختر المعلم من القائمة..."
                  required
                />
              )}
            </div>

            {/* Recurrence & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormSelect
                label="نمط تكرار الجدول"
                icon={RotateCw}
                value={form.frequency}
                onChange={(e) => set('frequency', e.target.value)}
                options={frequencyOptions}
              />
              <FormSelect
                label="مدة الحصة"
                icon={Clock}
                value={form.durationMinutes}
                onChange={(e) => set('durationMinutes', Number(e.target.value))}
                options={DURATION_OPTIONS}
              />
            </div>
            <AcademyTimezoneNotice compact />

            {/* Days of Week (Weekly & Biweekly) */}
            {(form.frequency === 'weekly' || form.frequency === 'biweekly') && (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={13} className="text-violet-600 flex-none" />
                    <span>أيام الحصص في الأسبوع</span>
                  </label>
                  <span className="text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-0.5 rounded-full">
                    {form.daysOfWeek.length}{' '}
                    {form.daysOfWeek.length === 1
                      ? 'يوم محدد'
                      : form.daysOfWeek.length === 2
                      ? 'يومان محددان'
                      : 'أيام محددة'}
                  </span>
                </div>

                {/* Responsive Day Buttons: 4 cols on mobile, 7 on desktop */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
                  {DAYS_OF_WEEK.map((d) => {
                    const active = form.daysOfWeek.includes(d.value)
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`min-h-[44px] h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center cursor-pointer select-none ${
                          active
                            ? 'bg-violet-600 text-white shadow-xs shadow-violet-200 scale-[1.02] border border-violet-600'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-violet-50/40 hover:border-violet-300'
                        }`}
                        title={d.label}
                      >
                        <span className="hidden sm:inline">{d.label}</span>
                        <span className="sm:hidden">{d.short}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="text-[11px] font-medium text-slate-500 pt-0.5">
                  {form.daysOfWeek.length > 0
                    ? `الأيام المختارة: ${form.daysOfWeek
                        .map((d) => DAYS_OF_WEEK.find((x) => x.value === d)?.label)
                        .join(' • ')}`
                    : 'يرجى اختيار يوم واحد على الأقل للمتابعة'}
                </div>
              </div>
            )}

            {/* Time & Start Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormInput
                label="وقت الحصة"
                icon={Clock}
                type="time"
                value={form.timeOfDay}
                onChange={(e) => set('timeOfDay', e.target.value)}
                required
                badge={
                  <span
                    className="text-violet-700 font-bold text-[11px] bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100"
                    dir="ltr"
                  >
                    {formatTime12h(form.timeOfDay)}
                  </span>
                }
              />

              <FormInput
                label="تاريخ بدء الجدول"
                icon={Calendar}
                type="date"
                value={form.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
              />
            </div>

            {/* Status (Edit Mode Only) */}
            {isEdit && (
              <FormSelect
                label="حالة الجدول الدوري"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                options={statusOptions}
              />
            )}
          </div>

          {/* ── CARD 3: SESSION GENERATION & MEETING LINK ──────────────── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-none">
                  <CalendarClock size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">توليد الحصص ورابط قاعة التدريس</h4>
                  <p className="text-[11px] text-slate-400">تحديد عدد الحصص المطلوب جدولتها ومنصة البث المباشر</p>
                </div>
              </div>
            </div>

            {/* Total Sessions & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Number of sessions */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                  <label className="text-xs font-bold text-slate-700">
                    عدد الحصص المطلوب توليدها
                  </label>
                  <span className="text-[11px] text-slate-400 font-normal">اختيار سريع</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {PRESET_SESSION_COUNTS.map((n) => {
                    const isSelected = Number(form.sessionsTotal) === n
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set('sessionsTotal', n)}
                        className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600 text-white shadow-xs border border-violet-600'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>

                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.sessionsTotal || ''}
                  onChange={(e) => set('sessionsTotal', e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-sm font-semibold text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-400"
                  placeholder="أو اكتب عدداً مخصصاً..."
                  style={{ lineHeight: 'normal' }}
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  يتم توليد الحصص تلقائياً وفقاً للمواعيد المحددة فور الحفظ.
                </p>
              </div>

              {/* End date */}
              <div>
                <FormInput
                  label="تاريخ انتهاء الجدول (اختياري)"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  helperText="يُترك فارغاً للاستمرار تلقائياً بحسب عدد الحصص المحددة."
                />
              </div>
            </div>

            {/* Meeting Platform & Link */}
            <div className="p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Video size={15} className="text-violet-600 flex-none" />
                  منصة التدريس ورابط الاجتماع
                </span>
                <button
                  type="button"
                  onClick={handleApplyGeneralLink}
                  className="text-xs font-bold text-violet-700 hover:text-violet-800 bg-white border border-violet-200 hover:border-violet-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="استخدام الرابط المسجل في ملف المعلم"
                >
                  <Link2 size={13} className="text-violet-600" />
                  <span>استخدام الرابط العام للمعلم</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <FormSelect
                    value={form.meetingProvider}
                    onChange={(e) => set('meetingProvider', e.target.value)}
                    options={MEETING_PROVIDERS}
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="url"
                    value={form.meetingLink}
                    onChange={(e) => set('meetingLink', e.target.value)}
                    className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-400"
                    placeholder="https://zoom.us/j/... أو https://meet.google.com/..."
                    dir="ltr"
                    style={{ lineHeight: 'normal' }}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200/60">
                <Info size={14} className="text-violet-600 mt-0.5 flex-none" />
                <span>
                  إذا تُرك الرابط فارغاً، سيقوم النظام تلقائياً بتطبيق الرابط العام المعتمد للمعلم على جميع الحصص.
                </span>
              </div>
            </div>
          </div>

          {/* ── CARD 4: ADDITIONAL TEMPLATES & NOTES ──────────────────── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormInput
                label="عنوان الحصة (قالب)"
                value={form.titleTemplate}
                onChange={(e) => set('titleTemplate', e.target.value)}
                placeholder={studentDisplayName ? `مثال: ${studentDisplayName}` : 'حصة'}
              />
              <FormInput
                label="ملاحظات إدارية (مرجعية)"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="ملاحظات مرجعية خاصة بالحصة والجدول..."
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => deleteMut.mutate()}
          title="تأكيد حذف الجدول الدوري"
          message="هل أنت متأكد من حذف هذا الجدول الدوري؟ سيتم حذف جميع الحصص المستقبلية المجدولة التي لم تُعقد بعد ولن تتأثر الحصص المكتملة السابقة."
          confirmText="نعم، احذف الجدول"
          cancelText="تراجع"
          variant="danger"
          loading={deleteMut.isPending}
        />
      )}
    </>
  )
}
