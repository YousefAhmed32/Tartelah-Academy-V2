import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  XCircle,
  Video,
  User,
  GraduationCap,
  Search,
  RefreshCw,
  ShieldAlert,
  BookOpen,
  CheckCircle2,
  Award,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  ExternalLink,
  Eye,
  SlidersHorizontal,
  X,
  ChevronDown,
} from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import AttendanceStatusBadge from '../../components/ui/AttendanceStatusBadge.jsx'
import {
  academyDateKey, academyMonthDateRange, formatDateAr, formatTimeAr,
  getAcademyWeekdayIndex, shiftDateKey, toAcademyDateTimeLocal,
} from '../../utils/date.js'
import { formatNumber } from '../../utils/format.js'
import { PAYROLL_STATUS, ROUTES, getFileUrl } from '../../config/constants.js'
import Can from '../../components/shared/Can.jsx'
import SessionTitleDisplay from '../../components/shared/SessionTitleDisplay.jsx'
import { formatSessionTitle } from '../../utils/sessionTitle.js'
import SessionLifecycleGuide from '../../components/shared/SessionLifecycleGuide.jsx'
import AdminSessionDetailDrawer from '../../components/admin/AdminSessionDetailDrawer.jsx'
import AcademyTimezoneNotice from '../../components/ui/AcademyTimezoneNotice.jsx'

const STATUS_CONFIG = {
  scheduled:    { label: 'مجدولة',       bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  border: 'border-violet-100' },
  ongoing:      { label: 'جارية الآن',    bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-100' },
  completed:    { label: 'مكتملة',       bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-100' },
  cancelled:    { label: 'ملغاة',        bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     border: 'border-red-100' },
  rescheduled:  { label: 'معادة',        bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-100' },
  missed:       { label: 'بحاجة متابعة', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-100' },
  no_show:      { label: 'غياب',         bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400',    border: 'border-gray-200' },
}

// ── Reusable form field ───────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const selectCls = `${inputCls} cursor-pointer`

// ── KPI Stats Card ────────────────────────────────────────────────────────────

function SessionKPICard({ title, value, sub, icon, color = '#7c3aed', active, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white relative overflow-hidden ${
        active
          ? 'ring-2 ring-violet-500 border-violet-200 shadow-md'
          : 'border-gray-100 hover:border-gray-200 shadow-xs hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold text-gray-500">{title}</span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
          style={{ background: `${color}14`, color }}
        >
          {icon}
        </div>
      </div>
      <div className="font-heading font-extrabold text-2xl text-gray-900 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-gray-400 font-medium mt-1 truncate">{sub}</div>}
      {active && (
        <div className="absolute top-0 start-0 w-1.5 h-full bg-violet-600" />
      )}
    </motion.div>
  )
}

// ── Create / Edit Session Modal ───────────────────────────────────────────────

function SessionModal({ session, onClose, teachers, students }) {
  const qc = useQueryClient()
  const isEditing = !!session

  const [form, setForm] = useState({
    teacherId: session?.teacherId?._id || session?.teacherId || '',
    studentId: session?.studentId?._id || session?.studentId || '',
    titleAr: session?.titleAr || 'حصة تلاوة',
    scheduledAt: toAcademyDateTimeLocal(session?.scheduledAt),
    durationMinutes: session?.durationMinutes || 60,
    meetingLink: session?.meetingLink || '',
    meetingProvider: session?.meetingProvider || 'zoom',
    notes: session?.notes || '',
    status: session?.status || 'scheduled',
  })

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const mutFn = isEditing
    ? (data) => api.patch(`/admin/sessions/${session._id}`, data).then((r) => r.data)
    : (data) => api.post('/admin/sessions', data).then((r) => r.data)

  const mut = useMutation({
    mutationFn: mutFn,
    onSuccess: () => {
      toast.success(isEditing ? 'تم تحديث الحصة' : 'تم إنشاء الحصة بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'sessions', 'stats'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.teacherId || !form.studentId || !form.scheduledAt) {
      return toast.error('يرجى ملء جميع الحقول المطلوبة')
    }
    mut.mutate({
      ...form,
      scheduledAt: form.scheduledAt,
      durationMinutes: Number(form.durationMinutes),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Calendar size={18} className="text-violet-600" />
            </div>
            <h2 className="font-heading font-bold text-gray-900">{isEditing ? 'تعديل الحصة' : 'إنشاء حصة جديدة'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <XCircle size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <AcademyTimezoneNotice compact />
          <Field label="المعلم *">
            <select className={selectCls} value={form.teacherId} onChange={(e) => set('teacherId', e.target.value)} required>
              <option value="">اختر المعلم</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.firstNameAr} {t.lastNameAr}
                </option>
              ))}
            </select>
          </Field>

          <Field label="الطالب *">
            <select
              className={selectCls}
              value={form.studentId}
              onChange={(e) => {
                const sId = e.target.value
                const selectedStudent = students.find((s) => s._id === sId)
                const shouldAutoName = !form.titleAr || form.titleAr === 'حصة تلاوة' || form.titleAr.startsWith('حصة ')
                setForm((prev) => ({
                  ...prev,
                  studentId: sId,
                  titleAr:
                    shouldAutoName && selectedStudent
                      ? `${selectedStudent.firstNameAr} ${selectedStudent.lastNameAr || ''}`.trim()
                      : prev.titleAr,
                }))
              }}
              required
            >
              <option value="">اختر الطالب</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstNameAr} {s.lastNameAr}
                </option>
              ))}
            </select>
          </Field>

          <Field label="عنوان الحصة">
            <input
              className={inputCls}
              value={form.titleAr}
              onChange={(e) => set('titleAr', e.target.value)}
              placeholder="مثال: حصة محمد أحمد"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="تاريخ ووقت الحصة *">
              <input
                type="datetime-local"
                className={inputCls}
                value={form.scheduledAt}
                onChange={(e) => set('scheduledAt', e.target.value)}
                required
              />
            </Field>
            <Field label="المدة (دقيقة)">
              <select
                className={selectCls}
                value={form.durationMinutes}
                onChange={(e) => set('durationMinutes', e.target.value)}
              >
                {[30, 45, 60, 90, 120].map((d) => (
                  <option key={d} value={d}>
                    {d} دقيقة
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="منصة الاجتماع">
              <select
                className={selectCls}
                value={form.meetingProvider}
                onChange={(e) => set('meetingProvider', e.target.value)}
              >
                <option value="zoom">Zoom</option>
                <option value="meet">Google Meet</option>
                <option value="teams">Microsoft Teams</option>
                <option value="other">أخرى</option>
              </select>
            </Field>
            {isEditing && (
              <Field label="الحالة">
                <select className={selectCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <Field label="رابط الاجتماع">
            <input
              className={inputCls}
              value={form.meetingLink}
              onChange={(e) => set('meetingLink', e.target.value)}
              placeholder="https://zoom.us/j/..."
              dir="ltr"
            />
          </Field>

          <Field label="ملاحظات">
            <textarea
              className={`${inputCls} h-20 resize-none py-2.5`}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="ملاحظات اختيارية..."
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex-1 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {mut.isPending && <Spinner size="sm" color="border-white" />}
              {isEditing ? 'حفظ التعديلات' : 'إنشاء الحصة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────

function RescheduleModal({ session, onClose }) {
  const qc = useQueryClient()
  const [newDate, setNewDate] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      api.patch(`/sessions/${session._id}/reschedule`, { newDate }).then((r) => r.data),
    onSuccess: () => {
      toast.success('تم تحديث موعد الحصة')
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'sessions', 'stats'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <h2 className="font-heading font-bold text-gray-900 mb-4 flex items-center gap-2">
          <RefreshCw size={18} className="text-amber-500" /> إعادة جدولة الحصة
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          الحصة الحالية:{' '}
          <span className="font-semibold text-gray-700">
            {formatDateAr(session.scheduledAt)} {formatTimeAr(session.scheduledAt)}
          </span>
        </p>
        <Field label="الموعد الجديد *">
          <input
            type="datetime-local"
            className={inputCls}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            min={toAcademyDateTimeLocal(new Date())}
          />
        </Field>
        <div className="mt-3">
          <AcademyTimezoneNotice compact />
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => mut.mutate()}
            disabled={!newDate || mut.isPending}
            className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {mut.isPending && <Spinner size="sm" color="border-white" />}
            تأكيد الموعد الجديد
          </button>
          <button onClick={onClose} className="px-4 h-10 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm cursor-pointer">
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Payroll status badge ──────────────────────────────────────────────────────

function PayrollBadge({ status }) {
  if (!status) return null
  const cfg = PAYROLL_STATUS[status] || PAYROLL_STATUS.pending
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${cfg.color}18`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

// ── Attendance Correction Modal ───────────────────────────────────────────────

function CorrectionModal({ session, onClose }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState(session.teacherAttendanceStatus || 'pending')
  const [payrollStatus, setPayrollStatus] = useState(session.payrollStatus || 'pending')
  const [notes, setNotes] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      api
        .patch(`/teacher-performance/admin/session/${session._id}/attendance`, {
          status,
          payrollStatus,
          payrollStatusReason: notes || undefined,
          notes: notes || undefined,
        })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success('تم تحديث سجل الحضور والراتب')
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'sessions', 'stats'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <h2 className="font-heading font-bold text-gray-900 mb-1 flex items-center gap-2">
          <ShieldAlert size={18} className="text-violet-600" /> تصحيح الحضور والراتب
        </h2>
        <p className="text-xs text-gray-500 mb-4">هذا التصحيح مُوثَّق في سجل التدقيق (Audit Log) ولن يُستبدل تلقائياً بعد الآن.</p>
        <div className="space-y-3">
          <Field label="حالة حضور المعلم">
            <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              {['pending', 'on_time', 'late', 'absent', 'excused'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="حالة الاستحقاق للراتب">
            <select className={selectCls} value={payrollStatus} onChange={(e) => setPayrollStatus(e.target.value)}>
              {Object.entries(PAYROLL_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="سبب التصحيح (سيظهر للمعلم)">
            <textarea
              className={`${inputCls} h-16 resize-none py-2`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اختياري..."
            />
          </Field>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="flex-1 h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {mut.isPending && <Spinner size="sm" color="border-white" />}
            حفظ التصحيح
          </button>
          <button onClick={onClose} className="px-4 h-10 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm cursor-pointer">
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Session Card View (Grid Mode) ─────────────────────────────────────────────

function SessionCardItem({ session, onSelect, onEdit, onReschedule, onCancel, onCorrect }) {
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.scheduled
  const student = session.studentId
  const teacher = session.teacherId
  const canCancel = ['scheduled', 'ongoing'].includes(session.status)

  const studentUrl = student?._id ? ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', student._id) : null
  const teacherUrl = teacher?._id ? ROUTES.ADMIN_TEACHER_PROFILE.replace(':id', teacher._id) : null

  return (
    <div
      onClick={() => onSelect(session)}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs hover:shadow-md hover:border-violet-200 transition-all cursor-pointer flex flex-col justify-between group"
    >
      <div>
        {/* Top bar: Status & Provider */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text} border ${sc.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
            {(session.isPostponed || Boolean(session.rescheduledFrom)) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                ⏱️ حصة مؤجلة
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 uppercase">
            {session.meetingProvider || 'Zoom'}
          </span>
        </div>

        {/* Title */}
        <div className="mb-1">
          <SessionTitleDisplay session={session} size="lg" />
        </div>

        {/* Time and Duration */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Clock size={13} className="text-gray-400" />
          <span>{formatDateAr(session.scheduledAt)}</span>
          <span>·</span>
          <span>{formatTimeAr(session.scheduledAt)}</span>
          <span>({session.durationMinutes} دقيقة)</span>
        </div>

        {/* Parties: Student & Teacher */}
        <div className="space-y-2.5 pt-3 border-t border-gray-50">
          {/* Student */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                src={getFileUrl(student?.avatar)}
                firstName={student?.firstNameAr}
                lastName={student?.lastNameAr}
                size="xs"
                className="ring-1 ring-violet-200"
              />
              {studentUrl ? (
                <Link
                  to={studentUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-semibold text-gray-800 hover:text-violet-700 hover:underline truncate"
                >
                  {student?.firstNameAr} {student?.lastNameAr || ''}
                </Link>
              ) : (
                <span className="text-xs font-semibold text-gray-800 truncate">{student?.firstNameAr || 'طالب'}</span>
              )}
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-violet-50 text-violet-700">طالب</span>
          </div>

          {/* Teacher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                src={getFileUrl(teacher?.avatar)}
                firstName={teacher?.firstNameAr}
                lastName={teacher?.lastNameAr}
                size="xs"
                className="ring-1 ring-amber-200"
              />
              {teacherUrl ? (
                <Link
                  to={teacherUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-semibold text-gray-800 hover:text-amber-700 hover:underline truncate"
                >
                  {teacher?.firstNameAr} {teacher?.lastNameAr || ''}
                </Link>
              ) : (
                <span className="text-xs font-semibold text-gray-800 truncate">{teacher?.firstNameAr || 'معلم'}</span>
              )}
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700">معلم</span>
          </div>
        </div>
      </div>

      {/* Bottom Badges & Actions */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {session.teacherAttendanceStatus && session.teacherAttendanceStatus !== 'pending' && (
            <AttendanceStatusBadge status={session.teacherAttendanceStatus} size="sm" />
          )}
          <PayrollBadge status={session.payrollStatus} />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(session)
            }}
            className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600 transition-colors"
            title="تعديل"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(session)
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="التفاصيل"
          >
            <Eye size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Session Table Row ─────────────────────────────────────────────────────────

function SessionTableRow({ session, onSelect, onEdit, onReschedule, onCancel, onCorrect }) {
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.scheduled
  const student = session.studentId
  const teacher = session.teacherId
  const canCancel = ['scheduled', 'ongoing'].includes(session.status)

  const studentUrl = student?._id ? ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', student._id) : null
  const teacherUrl = teacher?._id ? ROUTES.ADMIN_TEACHER_PROFILE.replace(':id', teacher._id) : null

  return (
    <tr
      onClick={() => onSelect(session)}
      className="border-b border-gray-50 hover:bg-violet-50/20 transition-colors cursor-pointer group"
    >
      {/* Session Title & Link */}
      <td className="px-5 py-3.5">
        <SessionTitleDisplay session={session} />
        {session.meetingLink ? (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 mt-1 font-medium"
          >
            <Video size={12} />
            <span>رابط الاجتماع</span>
            <ExternalLink size={10} />
          </a>
        ) : (
          <span className="text-[11px] text-gray-400 mt-1 block">بلا رابط</span>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          {session.teacherAttendanceStatus && session.teacherAttendanceStatus !== 'pending' && (
            <AttendanceStatusBadge status={session.teacherAttendanceStatus} size="sm" />
          )}
          <PayrollBadge status={session.payrollStatus} />
        </div>
      </td>

      {/* Student */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Avatar
            src={getFileUrl(student?.avatar)}
            firstName={student?.firstNameAr}
            lastName={student?.lastNameAr}
            size="xs"
            className="ring-1 ring-violet-200"
          />
          {studentUrl ? (
            <Link
              to={studentUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-gray-800 hover:text-violet-700 hover:underline"
            >
              {student?.firstNameAr} {student?.lastNameAr || ''}
            </Link>
          ) : (
            <span className="text-sm text-gray-700">{student?.firstNameAr || 'طالب'}</span>
          )}
        </div>
      </td>

      {/* Teacher */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Avatar
            src={getFileUrl(teacher?.avatar)}
            firstName={teacher?.firstNameAr}
            lastName={teacher?.lastNameAr}
            size="xs"
            className="ring-1 ring-amber-200"
          />
          {teacherUrl ? (
            <Link
              to={teacherUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-gray-800 hover:text-amber-700 hover:underline"
            >
              {teacher?.firstNameAr} {teacher?.lastNameAr || ''}
            </Link>
          ) : (
            <span className="text-sm text-gray-700">{teacher?.firstNameAr || 'معلم'}</span>
          )}
        </div>
      </td>

      {/* Date & Time */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <div className="text-sm text-gray-900 font-bold">{formatDateAr(session.scheduledAt)}</div>
        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
          <Clock size={11} />
          <span>{formatTimeAr(session.scheduledAt)}</span>
          <span>·</span>
          <span>{session.durationMinutes}د</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text} border ${sc.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
          {(session.isPostponed || Boolean(session.rescheduledFrom)) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ⏱️ مؤجلة
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5 whitespace-nowrap text-end" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onSelect(session)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="عرض التفاصيل"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => onEdit(session)}
            className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-600 transition-colors"
            title="تعديل الحصة"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onCorrect(session)}
            className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
            title="تصحيح الحضور والراتب"
          >
            <ShieldAlert size={15} />
          </button>
          {canCancel && (
            <button
              onClick={() => onReschedule(session)}
              className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
              title="إعادة جدولة"
            >
              <RefreshCw size={15} />
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(session)}
              className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
              title="إلغاء الحصة"
            >
              <XCircle size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSessionsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [search, setSearch] = useState('')
  const [payrollStatus, setPayrollStatus] = useState('')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const [datePreset, setDatePreset] = useState('all') // 'all' | 'today' | 'this_week' | 'this_month' | 'custom'
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')

  // Modals & Drawer states
  const [detailSession, setDetailSession] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [rescheduleSession, setRescheduleSession] = useState(null)
  const [correctSession, setCorrectSession] = useState(null)
  const [showGuide, setShowGuide] = useState(false)

  const qc = useQueryClient()

  // Calculate dates based on preset
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date()
    const todayStr = academyDateKey(now)

    if (datePreset === 'today') {
      return { dateFrom: todayStr, dateTo: todayStr }
    }
    if (datePreset === 'this_week') {
      const day = getAcademyWeekdayIndex(now)
      const diff = (day + 1) % 7
      const startOfWeek = shiftDateKey(todayStr, -diff)
      return {
        dateFrom: startOfWeek,
        dateTo: shiftDateKey(startOfWeek, 6),
      }
    }
    if (datePreset === 'this_month') {
      const { start, end } = academyMonthDateRange(now)
      return {
        dateFrom: start,
        dateTo: end,
      }
    }
    if (datePreset === 'custom') {
      return { dateFrom: customDateFrom, dateTo: customDateTo }
    }
    return { dateFrom: '', dateTo: '' }
  }, [datePreset, customDateFrom, customDateTo])

  // Sessions Stats Query
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'sessions', 'stats'],
    queryFn: () => api.get('/admin/sessions/stats').then((r) => r.data.data),
    staleTime: 30_000,
  })

  // Query Params Builder
  const buildQuery = () => {
    const p = new URLSearchParams({ page, limit: 18 })
    if (status) p.set('status', status)
    if (teacherId) p.set('teacherId', teacherId)
    if (studentId) p.set('studentId', studentId)
    if (search.trim()) p.set('search', search.trim())
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    if (payrollStatus) p.set('payrollStatus', payrollStatus)
    return p.toString()
  }

  // Sessions List Query
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'sessions', page, status, teacherId, studentId, search, dateFrom, dateTo, payrollStatus],
    queryFn: () => api.get(`/admin/sessions?${buildQuery()}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  // Teachers List Query
  const { data: teachers = [] } = useQuery({
    queryKey: ['admin', 'teachers', 'all'],
    queryFn: () => api.get('/admin/teachers?limit=100').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  // Students List Query
  const { data: students = [] } = useQuery({
    queryKey: ['admin', 'students', 'all'],
    queryFn: () => api.get('/admin/students?limit=200').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  // Cancel Mutation
  const cancelMut = useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/sessions/${id}/cancel`, { reason }).then((r) => r.data),
    onSuccess: () => {
      toast.success('تم إلغاء الحصة بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'sessions', 'stats'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ أثناء الإلغاء'),
  })

  const handleCancel = (session) => {
    const reason = window.prompt(`سبب إلغاء حصة "${session.titleAr}"؟`)
    if (reason && reason.trim()) {
      cancelMut.mutate({ id: session._id, reason: reason.trim() })
    }
  }

  const sessions = data?.data || []

  const statusOptions = [
    { key: '', label: 'الكل' },
    { key: 'scheduled', label: 'مجدولة' },
    { key: 'ongoing', label: 'جارية' },
    { key: 'completed', label: 'مكتملة' },
    { key: 'cancelled', label: 'ملغاة' },
    { key: 'missed', label: 'بحاجة متابعة' },
    { key: 'no_show', label: 'غياب' },
  ]

  const hasActiveFilters = !!(status || teacherId || studentId || search || datePreset !== 'all' || payrollStatus)

  const clearAllFilters = () => {
    setStatus('')
    setTeacherId('')
    setStudentId('')
    setSearch('')
    setDatePreset('all')
    setCustomDateFrom('')
    setCustomDateTo('')
    setPayrollStatus('')
    setPage(1)
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">إدارة الحصص والجلسات</h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatNumber(data?.total || 0)} حصة مطابقة للبحث — تحكم كامل في الجدولة، الحضور، وتصحيح الجلسات
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              refetch()
              refetchStats()
            }}
            disabled={isFetching}
            className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 transition-colors shadow-2xs cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin text-violet-600' : ''} />
          </button>

          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-2 h-10 px-4 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/80 rounded-xl font-bold text-sm transition-all shadow-xs cursor-pointer"
          >
            <BookOpen size={16} />
            <span>كيف تعمل الحصة؟</span>
          </button>

          <Can permission="sessions.manage">
            <button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 h-10 px-5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>حصة جديدة</span>
            </button>
          </Can>
        </div>
      </div>

      {/* ── KPI Stats Cards Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Today's Sessions */}
        <SessionKPICard
          title="حصص اليوم"
          value={formatNumber(statsData?.todayTotal ?? 0)}
          sub={`${statsData?.todayScheduled ?? 0} مجدولة · ${statsData?.todayCompleted ?? 0} مكتملة`}
          icon={<Calendar size={18} />}
          color="#7c3aed"
          active={datePreset === 'today' && !status}
          onClick={() => {
            setDatePreset('today')
            setStatus('')
            setPage(1)
          }}
        />

        {/* Card 2: Completed Today */}
        <SessionKPICard
          title="أُنجزت اليوم"
          value={formatNumber(statsData?.todayCompleted ?? 0)}
          sub={`من أصل ${statsData?.todayTotal ?? 0} حصة اليوم`}
          icon={<CheckCircle2 size={18} />}
          color="#10b981"
          active={datePreset === 'today' && status === 'completed'}
          onClick={() => {
            setDatePreset('today')
            setStatus('completed')
            setPage(1)
          }}
        />

        {/* Card 3: Lifetime Completed */}
        <SessionKPICard
          title="إجمالي المكتملة بالمنصة"
          value={formatNumber(statsData?.totalCompleted ?? 0)}
          sub={`من أصل ${formatNumber(statsData?.totalSessions ?? 0)} حصة مسجلة`}
          icon={<Award size={18} />}
          color="#2563EB"
          active={datePreset === 'all' && status === 'completed'}
          onClick={() => {
            setDatePreset('all')
            setStatus('completed')
            setPage(1)
          }}
        />

        {/* Card 4: Needs Action */}
        <SessionKPICard
          title="بحاجة متابعة وتنبيهات"
          value={formatNumber(statsData?.needsAction ?? 0)}
          sub="تأخر معلمين أو حصص معلقة"
          icon={<ShieldAlert size={18} />}
          color="#f59e0b"
          active={status === 'missed'}
          onClick={() => {
            setStatus('missed')
            setDatePreset('all')
            setPage(1)
          }}
        />
      </div>

      {/* ── Advanced Control Bar (Search, Presets, Filters, Views) ── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
        {/* Upper row: Search & Date Presets & View Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="ابحث باسم الطالب، المعلم، أو عنوان الحصة..."
              className="w-full h-10 ps-10 pe-9 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Presets Strip */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 flex-wrap">
            {[
              { key: 'all', label: 'كل الفترات' },
              { key: 'today', label: 'اليوم' },
              { key: 'this_week', label: 'هذا الأسبوع' },
              { key: 'this_month', label: 'هذا الشهر' },
              { key: 'custom', label: 'تاريخ مخصص' },
            ].map((dp) => (
              <button
                key={dp.key}
                type="button"
                onClick={() => {
                  setDatePreset(dp.key)
                  setPage(1)
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  datePreset === dp.key
                    ? 'bg-white text-violet-800 shadow-xs border border-violet-100'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {dp.label}
              </button>
            ))}
          </div>

          {/* View Switcher (Table vs Grid) */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-none self-end lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <TableIcon size={14} />
              <span>جدول</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LayoutGrid size={14} />
              <span>بطاقات</span>
            </button>
          </div>
        </div>

        {/* Lower row: Status Tabs & Dropdowns */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-gray-100">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            {statusOptions.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setStatus(s.key)
                  setPage(1)
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  status === s.key
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Teacher Select */}
            <select
              className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs font-semibold text-gray-700 outline-none focus:border-violet-400 cursor-pointer min-w-[150px]"
              value={teacherId}
              onChange={(e) => {
                setTeacherId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">جميع المعلمين</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.firstNameAr} {t.lastNameAr}
                </option>
              ))}
            </select>

            {/* Payroll Status */}
            <select
              className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs font-semibold text-gray-700 outline-none focus:border-violet-400 cursor-pointer min-w-[140px]"
              value={payrollStatus}
              onChange={(e) => {
                setPayrollStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">كل حالات الاستحقاق</option>
              {Object.entries(PAYROLL_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>

            {/* Custom Date Inputs if Custom is selected */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-2.5 text-xs text-gray-700 outline-none focus:border-violet-400"
                  value={customDateFrom}
                  onChange={(e) => {
                    setCustomDateFrom(e.target.value)
                    setPage(1)
                  }}
                  placeholder="من"
                />
                <span className="text-gray-400 text-xs">إلى</span>
                <input
                  type="date"
                  className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-2.5 text-xs text-gray-700 outline-none focus:border-violet-400"
                  value={customDateTo}
                  onChange={(e) => {
                    setCustomDateTo(e.target.value)
                    setPage(1)
                  }}
                  placeholder="إلى"
                />
              </div>
            )}

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="h-9 px-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X size={12} />
                <span>مسح التصفية</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content Area (Table vs Grid View) ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Spinner color="border-violet-600" />
          <span className="text-xs font-semibold text-gray-400 mt-3">جاري تحميل جدول الحصص...</span>
        </div>
      ) : !sessions.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-3 text-violet-600">
            <Calendar size={28} />
          </div>
          <p className="font-heading font-bold text-base text-gray-700">لا توجد حصص مطابقة</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm text-center">
            لم نجد أي حصص تطابق معايير التصفية الحالية. جرب تغيير التاريخ، اختيار معلم آخر، أو إنشاء حصة جديدة.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-violet-50 text-violet-700 font-bold text-xs hover:bg-violet-100 transition-colors"
            >
              إلغاء جميع الفلاتر
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <SessionCardItem
              key={s._id}
              session={s}
              onSelect={setDetailSession}
              onEdit={setEditSession}
              onReschedule={setRescheduleSession}
              onCancel={handleCancel}
              onCorrect={setCorrectSession}
            />
          ))}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    الحصة والقاعة
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    الطالب
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    المعلم
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    الموعد والمدة
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    الحالة
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    إجراءات سريعة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <SessionTableRow
                    key={s._id}
                    session={s}
                    onSelect={setDetailSession}
                    onEdit={setEditSession}
                    onReschedule={setRescheduleSession}
                    onCancel={handleCancel}
                    onCorrect={setCorrectSession}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <div className="text-xs text-gray-500 font-medium">
            صفحة <span className="font-bold text-gray-800">{page}</span> من{' '}
            <span className="font-bold text-gray-800">{data.totalPages}</span> (إجمالي{' '}
            <span className="font-bold text-gray-800">{formatNumber(data.total)}</span> حصة)
          </div>
          <Pagination current={page} total={data.totalPages} onChange={setPage} />
        </div>
      )}

      {/* ── Slide-Over Detail Drawer ── */}
      <AnimatePresence>
        {detailSession && (
          <AdminSessionDetailDrawer
            session={detailSession}
            open={!!detailSession}
            onClose={() => setDetailSession(null)}
            onEdit={setEditSession}
            onReschedule={setRescheduleSession}
            onCorrect={setCorrectSession}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {createModal && (
          <SessionModal onClose={() => setCreateModal(false)} teachers={teachers} students={students} />
        )}
        {editSession && (
          <SessionModal session={editSession} onClose={() => setEditSession(null)} teachers={teachers} students={students} />
        )}
        {rescheduleSession && (
          <RescheduleModal session={rescheduleSession} onClose={() => setRescheduleSession(null)} />
        )}
        {correctSession && (
          <CorrectionModal session={correctSession} onClose={() => setCorrectSession(null)} />
        )}
      </AnimatePresence>

      {/* ── Guide Modal ── */}
      {showGuide && (
        <SessionLifecycleGuide role="admin" onClose={() => setShowGuide(false)} />
      )}
    </div>
  )
}
