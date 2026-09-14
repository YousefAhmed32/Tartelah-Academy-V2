import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Calendar, Clock, Video, Trash2,
  RotateCw, Save, Plus, Link2, ChevronDown, Info,
} from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import ConfirmDialog from '../shared/ConfirmDialog.jsx'
import { DAYS_OF_WEEK, SCHEDULE_FREQUENCY } from '../../config/constants.js'

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

function formatTime12h(timeStr) {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h)) return timeStr
  const period = h >= 12 ? 'م' : 'ص'
  const h12 = h % 12 || 12
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`
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
      <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
        <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          {Icon && <Icon size={13} className="text-violet-600 flex-none" />}
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        {badge}
      </div>
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
      <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
        <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          {Icon && <Icon size={13} className="text-violet-600 flex-none" />}
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        {badge}
      </div>
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

  const teachers = propTeachers && propTeachers.length > 0 ? propTeachers : fetchedTeachers
  const students = propStudents && propStudents.length > 0 ? propStudents : fetchedStudents

  const resolvedInitialTeacherId = initialTeacherId || rule?.teacherId?._id || rule?.teacherId || ''
  const resolvedInitialStudentId = initialStudentId || rule?.studentId?._id || rule?.studentId || ''

  const [form, setForm] = useState({
    teacherId: resolvedInitialTeacherId,
    studentId: resolvedInitialStudentId,
    status: rule?.status || 'active',
    frequency: rule?.frequency || 'weekly',
    daysOfWeek: rule?.daysOfWeek || [0, 2], // Default: Sun + Tue
    timeOfDay: rule?.timeOfDay || '18:00',
    durationMinutes: rule?.durationMinutes || 60,
    startDate: rule?.startDate ? rule.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    endDate: rule?.endDate ? rule.endDate.slice(0, 10) : '',
    sessionsTotal: rule?.sessionsTotal || 8,
    meetingProvider: rule?.meetingProvider || 'zoom',
    meetingLink: rule?.meetingLink || '',
    titleTemplate: rule?.titleTemplate || '',
    notes: rule?.notes || '',
  })

  const [confirmDelete, setConfirmDelete] = useState(false)

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
  const studentDisplayName = currentStudent
    ? `${currentStudent.firstNameAr || currentStudent.student?.firstNameAr || ''} ${currentStudent.lastNameAr || currentStudent.student?.lastNameAr || ''}`.trim()
    : ''
  const teacherDisplayName = currentTeacher
    ? `${currentTeacher.firstNameAr || ''} ${currentTeacher.lastNameAr || ''}`.trim()
    : ''

  // Create or Update mutation
  const saveMut = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        durationMinutes: Number(data.durationMinutes) || 60,
        sessionsTotal: data.sessionsTotal ? Number(data.sessionsTotal) : undefined,
        endDate: data.endDate || undefined,
        titleTemplate: data.titleTemplate || (studentDisplayName ? `حصة ${studentDisplayName}` : 'حصة قرآن كريم'),
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
      qc.invalidateQueries({ queryKey: ['admin', 'student', 'schedule-rules'] })
      if (form.studentId) {
        qc.invalidateQueries({ queryKey: ['admin', 'student', form.studentId] })
        qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics', form.studentId] })
      }
      if (form.teacherId) {
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-schedule-rules', form.teacherId] })
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-sessions', form.teacherId] })
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', form.teacherId] })
        qc.invalidateQueries({ queryKey: ['admin', 'teacher-availability', form.teacherId] })
      }
      qc.invalidateQueries({ queryKey: ['teacher', 'schedule-rules'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })

      if (onSuccess) onSuccess()
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
    if (!form.teacherId) return toast.error('يجب اختيار المعلم المسؤول')
    if (!form.studentId) return toast.error('يجب اختيار الطالب المستفيد')
    if (
      (form.frequency === 'weekly' || form.frequency === 'biweekly') &&
      form.daysOfWeek.length === 0
    ) {
      return toast.error('يرجى تحديد يوم واحد على الأقل من أيام الأسبوع')
    }
    if (!form.startDate) return toast.error('تاريخ البدء مطلوب')
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

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={isEdit ? 'تعديل الجدول الدوري للحصص' : 'إنشاء جدول دوري للحصص'}
        size="lg"
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
                  حذف الجدول
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
                  : `إنشاء الجدول وتوليد الحصص (${form.sessionsTotal || 8} حصص)`}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-right" dir="rtl">
          {/* Teacher & Student Selection Card */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Teacher Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                  <label className="text-xs font-bold text-slate-600">
                    المعلم المسؤول <span className="text-rose-500">*</span>
                  </label>
                  {lockTeacher && (
                    <span className="text-[10px] text-violet-700 font-bold bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                      محدد مسبقاً
                    </span>
                  )}
                </div>

                {lockTeacher ? (
                  <div className="flex items-center gap-3 px-3 h-11 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <Avatar
                      firstName={currentTeacher?.firstNameAr}
                      lastName={currentTeacher?.lastNameAr}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-sm truncate">
                        {teacherDisplayName || 'المعلم'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">معلم معتمد</div>
                    </div>
                  </div>
                ) : (
                  <FormSelect
                    label=""
                    value={form.teacherId}
                    onChange={(e) => set('teacherId', e.target.value)}
                    options={teacherOptions}
                    placeholder="اختر المعلم من القائمة..."
                    required
                  />
                )}
              </div>

              {/* Student Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                  <label className="text-xs font-bold text-slate-600">
                    الطالب المستفيد <span className="text-rose-500">*</span>
                  </label>
                  {lockStudent && (
                    <span className="text-[10px] text-violet-700 font-bold bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                      محدد مسبقاً
                    </span>
                  )}
                </div>

                {lockStudent ? (
                  <div className="flex items-center gap-3 px-3 h-11 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <Avatar
                      firstName={
                        currentStudent?.firstNameAr || currentStudent?.student?.firstNameAr
                      }
                      lastName={
                        currentStudent?.lastNameAr || currentStudent?.student?.lastNameAr
                      }
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-sm truncate">
                        {studentDisplayName || 'الطالب'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">طالب مسجل</div>
                    </div>
                  </div>
                ) : (
                  <FormSelect
                    label=""
                    value={form.studentId}
                    onChange={(e) => set('studentId', e.target.value)}
                    options={studentOptions}
                    placeholder="اختر الطالب من القائمة..."
                    required
                  />
                )}
              </div>
            </div>
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

          {/* Days of Week (for weekly & biweekly) */}
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

              {/* Responsive Day Buttons: 4 columns on mobile, 7 columns on desktop */}
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
              onChange={(e) => set('startDate', e.target.value)}
              required
            />
          </div>

          {/* Total Sessions & End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Number of sessions with harmonized pills and custom input */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                <label className="text-xs font-bold text-slate-600">
                  عدد الحصص المطلوب توليدها
                </label>
                <span className="text-[11px] text-slate-400 font-normal">اختيار سريع</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {[4, 8, 12, 16, 24].map((n) => {
                  const isSelected = Number(form.sessionsTotal) === n
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('sessionsTotal', n)}
                      className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-xs border border-violet-600'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
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
                placeholder="أو اكتب عدداً مخصصاً للحصص..."
              />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                يتم توليد الحصص تلقائياً فور حفظ الجدول.
              </p>
            </div>

            {/* End date */}
            <div>
              <FormInput
                label="تاريخ انتهاء الجدول (اختياري)"
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                helperText="يُترك فارغاً للاستمرار بحسب عدد الحصص المحددة."
              />
            </div>
          </div>

          {/* Meeting Platform & Link Card */}
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
                  label=""
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

          {/* Title Template & Administrative Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-1">
            <FormInput
              label="عنوان الحصة (قالب)"
              value={form.titleTemplate}
              onChange={(e) => set('titleTemplate', e.target.value)}
              placeholder={studentDisplayName ? `مثال: حصة ${studentDisplayName}` : 'حصة قرآن كريم'}
            />
            <FormInput
              label="ملاحظات إدارية"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="ملاحظات مرجعية خاصة بالحصة..."
            />
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

