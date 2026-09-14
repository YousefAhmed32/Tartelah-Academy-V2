import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Calendar, Clock, Video, Trash2, Sparkles, ExternalLink,
  Layers, CheckCircle2, User, HelpCircle,
} from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import ConfirmDialog from '../shared/ConfirmDialog.jsx'
import { DAYS_OF_WEEK, SCHEDULE_FREQUENCY, getFileUrl } from '../../config/constants.js'

const STATUS_CONFIG = {
  active: { label: 'نشط ومستمر', badge: 'success' },
  paused: { label: 'موقوف مؤقتاً', badge: 'warning' },
  ended: { label: 'منتهٍ', badge: 'gray' },
}

const FIELD = 'field-light w-full'
const LABEL_CLS = 'text-xs font-bold text-gray-500 mb-1.5 flex items-center justify-between'

function formatTime12h(timeStr) {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h)) return timeStr
  const period = h >= 12 ? 'م' : 'ص'
  const h12 = h % 12 || 12
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`
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
    queryFn: () => api.get('/admin/teachers', { params: { limit: 100 } }).then((r) => r.data.data?.teachers || r.data.data?.rows || r.data.data || []),
    enabled: !propTeachers || propTeachers.length === 0,
    staleTime: 60_000,
  })

  // Fetch students if not provided
  const { data: fetchedStudents = [] } = useQuery({
    queryKey: ['admin', 'students', 'combobox'],
    queryFn: () => api.get('/admin/students', { params: { limit: 150 } }).then((r) => r.data.data?.students || r.data.data?.rows || r.data.data || []),
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
    daysOfWeek: rule?.daysOfWeek || [0, 2], // Default: Sun + Tue if new
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

  const toggleDay = (d) => setForm((p) => ({
    ...p,
    daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter((x) => x !== d) : [...p.daysOfWeek, d].sort(),
  }))

  const handleApplyGeneralLink = () => {
    if (!teacherGeneralLink?.link) {
      toast.error('لم يسجل هذا المعلم رابطاً عمومياً بعد في ملفه')
      return
    }
    setForm((p) => ({
      ...p,
      meetingLink: teacherGeneralLink.link,
      meetingProvider: teacherGeneralLink.provider || p.meetingProvider || 'zoom',
    }))
    toast.success('تم إدراج الرابط العمومي للمعلم بنجاح')
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
        titleTemplate: data.titleTemplate || (studentDisplayName ? `حصة ${studentDisplayName}` : 'حصة'),
      }

      if (isEdit) {
        return api.patch(`/admin/schedule-rules/${rule._id}`, payload).then((r) => r.data)
      }
      return api.post('/admin/schedule-rules', payload).then((r) => r.data)
    },
    onSuccess: (res) => {
      toast.success(isEdit ? 'تم تحديث الجدول الدوري بنجاح' : `تم إنشاء الجدول وتوليد ${res.data?.sessionCount || 0} حصة بنجاح`)

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
    onError: (e) => toast.error(e?.response?.data?.message || 'حدث خطأ أثناء حفظ الجدول الدوري'),
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
    if (!form.teacherId) return toast.error('يجب اختيار المعلم')
    if (!form.studentId) return toast.error('يجب اختيار الطالب')
    if ((form.frequency === 'weekly' || form.frequency === 'biweekly') && form.daysOfWeek.length === 0) {
      return toast.error('يرجى تحديد يوم واحد على الأقل من أيام الأسبوع')
    }
    if (!form.startDate) return toast.error('تاريخ البدء مطلوب')
    saveMut.mutate(form)
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={isEdit ? 'تعديل الجدول الدوري للحصص' : 'إنشاء جدول دوري للحصص'}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <div>
              {isEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Trash2 size={14} className="text-rose-600" />}
                  className="!text-rose-600 hover:!bg-rose-50 !border-rose-200"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saveMut.isPending || deleteMut.isPending}
                >
                  حذف الجدول
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose} disabled={saveMut.isPending || deleteMut.isPending}>
                إلغاء
              </Button>
              <Button
                variant="purple"
                onClick={handleSubmit}
                loading={saveMut.isPending}
                icon={isEdit ? undefined : <Sparkles size={14} />}
              >
                {isEdit ? 'حفظ التعديلات' : `إنشاء الجدول وتوليد الحصص (${form.sessionsTotal || 8} حصة)`}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-right" dir="rtl">
          {/* Teacher & Student Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100">
            {/* Teacher */}
            <div>
              <label className={LABEL_CLS}>
                <span>المعلم المسؤول</span>
                {lockTeacher && <span className="text-[10px] text-violet-600 font-semibold bg-violet-50 px-1.5 py-0.5 rounded">محدد مسبقاً</span>}
              </label>
              {lockTeacher ? (
                <div className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-gray-200 text-sm">
                  <Avatar firstName={currentTeacher?.firstNameAr} lastName={currentTeacher?.lastNameAr} size="sm" />
                  <span className="font-bold text-gray-800 truncate">{teacherDisplayName || 'المعلم'}</span>
                </div>
              ) : (
                <select value={form.teacherId} onChange={(e) => set('teacherId', e.target.value)} className={FIELD}>
                  <option value="">اختر المعلم...</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.firstNameAr} {t.lastNameAr}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Student */}
            <div>
              <label className={LABEL_CLS}>
                <span>الطالب المستفيد</span>
                {lockStudent && <span className="text-[10px] text-violet-600 font-semibold bg-violet-50 px-1.5 py-0.5 rounded">محدد مسبقاً</span>}
              </label>
              {lockStudent ? (
                <div className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-gray-200 text-sm">
                  <Avatar firstName={currentStudent?.firstNameAr || currentStudent?.student?.firstNameAr} lastName={currentStudent?.lastNameAr || currentStudent?.student?.lastNameAr} size="sm" />
                  <span className="font-bold text-gray-800 truncate">{studentDisplayName || 'الطالب'}</span>
                </div>
              ) : (
                <select value={form.studentId} onChange={(e) => set('studentId', e.target.value)} className={FIELD}>
                  <option value="">اختر الطالب...</option>
                  {students.map((s) => {
                    const st = s.student || s
                    return (
                      <option key={st._id} value={st._id}>
                        {st.firstNameAr} {st.lastNameAr} {st.phone ? `(${st.phone})` : ''}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>
          </div>

          {/* Status (edit mode only) */}
          {isEdit && (
            <div>
              <label className={LABEL_CLS}>حالة الجدول الدوري</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={FIELD}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Frequency & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>نمط تكرار الجدول</label>
              <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)} className={FIELD}>
                {Object.entries(SCHEDULE_FREQUENCY).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>مدة الحصة</label>
              <select
                value={form.durationMinutes}
                onChange={(e) => set('durationMinutes', Number(e.target.value))}
                className={FIELD}
              >
                <option value={30}>٣٠ دقيقة</option>
                <option value={45}>٤٥ دقيقة</option>
                <option value={60}>ساعة كاملة (٦٠ دقيقة)</option>
                <option value={90}>ساعة ونصف (٩٠ دقيقة)</option>
                <option value={120}>ساعتان (١٢٠ دقيقة)</option>
              </select>
            </div>
          </div>

          {/* Days of Week (for weekly & biweekly) */}
          {(form.frequency === 'weekly' || form.frequency === 'biweekly') && (
            <div>
              <label className={LABEL_CLS}>
                <span>أيام الحصص في الأسبوع</span>
                <span className="text-violet-600 font-mono text-[11px]">
                  {form.daysOfWeek.length} أيام محددة
                </span>
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const active = form.daysOfWeek.includes(d.value)
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        active
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-violet-300'
                      }`}
                      title={d.label}
                    >
                      <span>{d.short}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {form.daysOfWeek.map((d) => DAYS_OF_WEEK.find((x) => x.value === d)?.label).join(' • ') || 'اختر يوماً واحداً على الأقل'}
              </p>
            </div>
          )}

          {/* Time & Start Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>
                <span>وقت الحصة</span>
                <span className="text-violet-600 font-semibold text-[11px]" dir="ltr">
                  {formatTime12h(form.timeOfDay)}
                </span>
              </label>
              <input
                type="time"
                value={form.timeOfDay}
                onChange={(e) => set('timeOfDay', e.target.value)}
                className={FIELD}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLS}>تاريخ بدء الجدول</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className={FIELD}
                required
              />
            </div>
          </div>

          {/* Total Sessions to Generate OR End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>
                <span>عدد الحصص المطلوب توليدها</span>
              </label>
              <div className="flex items-center gap-1.5 mb-1.5">
                {[4, 8, 12, 16, 24].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set('sessionsTotal', n)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      Number(form.sessionsTotal) === n
                        ? 'bg-violet-100 text-violet-700 border border-violet-300 font-bold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={100}
                value={form.sessionsTotal || ''}
                onChange={(e) => set('sessionsTotal', e.target.value ? Number(e.target.value) : '')}
                className={FIELD}
                placeholder="أو اكتب عدداً مخصصاً..."
              />
            </div>
            <div>
              <label className={LABEL_CLS}>
                <span>تاريخ انتهاء الجدول (اختياري)</span>
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className={FIELD}
              />
              <p className="text-[10px] text-gray-400 mt-1">يُترك فارغاً للاستمرار بحسب عدد الحصص</p>
            </div>
          </div>

          {/* Meeting Link & General Link Helper */}
          <div className="p-3.5 bg-violet-50/40 border border-violet-100 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Video size={14} className="text-violet-600" />
                رابط الاجتماع ومنصة التدريس
              </span>
              <button
                type="button"
                onClick={handleApplyGeneralLink}
                className="text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-white border border-violet-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                title="استخدام الرابط المسجل في ملف المعلم"
              >
                <Sparkles size={11} className="text-violet-500" />
                استخدام الرابط العمومي للمعلم
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <select
                  value={form.meetingProvider}
                  onChange={(e) => set('meetingProvider', e.target.value)}
                  className="field-light w-full text-xs"
                >
                  <option value="zoom">Zoom</option>
                  <option value="meet">Google Meet</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="url"
                  value={form.meetingLink}
                  onChange={(e) => set('meetingLink', e.target.value)}
                  className="field-light w-full text-xs"
                  placeholder="https://zoom.us/j/... أو https://meet.google.com/..."
                  dir="ltr"
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              💡 <span className="font-semibold">ملاحظة:</span> إذا تُرك الرابط فارغاً، سيقوم النظام تلقائياً بتطبيق الرابط العمومي المعتمد للمعلم على جميع الحصص.
            </p>
          </div>

          {/* Title Template & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>عنوان الحصة (قالب)</label>
              <input
                type="text"
                value={form.titleTemplate}
                onChange={(e) => set('titleTemplate', e.target.value)}
                className={FIELD}
                placeholder={studentDisplayName ? `مثال: حصة ${studentDisplayName}` : 'حصة'}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>ملاحظات إدارية</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className={FIELD}
                placeholder="ملاحظات مرجعية..."
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
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

