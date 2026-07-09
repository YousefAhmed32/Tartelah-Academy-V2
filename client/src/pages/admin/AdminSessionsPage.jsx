import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Calendar, Clock, Plus, Edit2, XCircle, Video, User, GraduationCap, Search, ChevronDown, RefreshCw, ShieldAlert } from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import AttendanceStatusBadge from '../../components/ui/AttendanceStatusBadge.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { PAYROLL_STATUS, getFileUrl } from '../../config/constants.js'

const STATUS_CONFIG = {
  scheduled:    { label: 'مجدولة',   bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
  ongoing:      { label: 'جارية',    bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  completed:    { label: 'مكتملة',   bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelled:    { label: 'ملغاة',    bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
  rescheduled:  { label: 'معادة',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  missed:       { label: 'بحاجة متابعة', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  no_show:      { label: 'غياب',     bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400' },
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

// ── Create / Edit Session Modal ───────────────────────────────────────────────

function SessionModal({ session, onClose, teachers, students }) {
  const qc = useQueryClient()
  const isEditing = !!session

  const toDateTimeLocal = (d) => {
    if (!d) return ''
    const dt = new Date(d)
    const pad = n => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  }

  const [form, setForm] = useState({
    teacherId: session?.teacherId?._id || session?.teacherId || '',
    studentId: session?.studentId?._id || session?.studentId || '',
    titleAr: session?.titleAr || 'حصة تلاوة',
    scheduledAt: toDateTimeLocal(session?.scheduledAt),
    durationMinutes: session?.durationMinutes || 60,
    meetingLink: session?.meetingLink || '',
    meetingProvider: session?.meetingProvider || 'zoom',
    notes: session?.notes || '',
    status: session?.status || 'scheduled',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const mutFn = isEditing
    ? (data) => api.patch(`/admin/sessions/${session._id}`, data).then(r => r.data)
    : (data) => api.post('/admin/sessions', data).then(r => r.data)

  const mut = useMutation({
    mutationFn: mutFn,
    onSuccess: () => {
      toast.success(isEditing ? 'تم تحديث الحصة' : 'تم إنشاء الحصة بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
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
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      durationMinutes: Number(form.durationMinutes),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
          <Field label="المعلم *">
            <select className={selectCls} value={form.teacherId} onChange={e => set('teacherId', e.target.value)} required>
              <option value="">اختر المعلم</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr}</option>
              ))}
            </select>
          </Field>

          <Field label="الطالب *">
            <select className={selectCls} value={form.studentId} onChange={e => set('studentId', e.target.value)} required>
              <option value="">اختر الطالب</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>{s.firstNameAr} {s.lastNameAr}</option>
              ))}
            </select>
          </Field>

          <Field label="عنوان الحصة">
            <input className={inputCls} value={form.titleAr} onChange={e => set('titleAr', e.target.value)} placeholder="حصة تلاوة" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="تاريخ ووقت الحصة *">
              <input type="datetime-local" className={inputCls} value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} required />
            </Field>
            <Field label="المدة (دقيقة)">
              <select className={selectCls} value={form.durationMinutes} onChange={e => set('durationMinutes', e.target.value)}>
                {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} دقيقة</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="منصة الاجتماع">
              <select className={selectCls} value={form.meetingProvider} onChange={e => set('meetingProvider', e.target.value)}>
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="teams">Microsoft Teams</option>
                <option value="other">أخرى</option>
              </select>
            </Field>
            {isEditing && (
              <Field label="الحالة">
                <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value)}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
            )}
          </div>

          <Field label="رابط الاجتماع">
            <input className={inputCls} value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)} placeholder="https://zoom.us/j/..." dir="ltr" />
          </Field>

          <Field label="ملاحظات">
            <textarea className={`${inputCls} h-20 resize-none py-2.5`} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات اختيارية..." />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mut.isPending}
              className="flex-1 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {mut.isPending && <Spinner size="sm" color="border-white" />}
              {isEditing ? 'حفظ التعديلات' : 'إنشاء الحصة'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors">
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

  const toDateTimeLocal = (d) => {
    if (!d) return ''
    const dt = new Date(d)
    const pad = n => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  }

  const mut = useMutation({
    mutationFn: () => api.patch(`/sessions/${session._id}/reschedule`, { newDate: new Date(newDate).toISOString() }).then(r => r.data),
    onSuccess: () => {
      toast.success('تم تحديث موعد الحصة')
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
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
        <p className="text-sm text-gray-500 mb-4">الحصة الحالية: <span className="font-semibold text-gray-700">{formatDateAr(session.scheduledAt)} {formatTimeAr(session.scheduledAt)}</span></p>
        <Field label="الموعد الجديد *">
          <input type="datetime-local" className={inputCls} value={newDate} onChange={e => setNewDate(e.target.value)} required min={toDateTimeLocal(new Date())} />
        </Field>
        <div className="flex gap-3 mt-4">
          <button onClick={() => mut.mutate()} disabled={!newDate || mut.isPending}
            className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {mut.isPending && <Spinner size="sm" color="border-white" />}
            تأكيد الموعد الجديد
          </button>
          <button onClick={onClose} className="px-4 h-10 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">إلغاء</button>
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
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${cfg.color}18`, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ── Attendance Correction Modal ───────────────────────────────────────────────
// Lets an admin correct a specific session's teacher-attendance / payroll
// status directly from the sessions table — previously this was only
// reachable via a teacher's profile page.

function CorrectionModal({ session, onClose }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState(session.teacherAttendanceStatus || 'pending')
  const [payrollStatus, setPayrollStatus] = useState(session.payrollStatus || 'pending')
  const [notes, setNotes] = useState('')

  const mut = useMutation({
    mutationFn: () => api.patch(`/teacher-performance/admin/session/${session._id}/attendance`, {
      status, payrollStatus, payrollStatusReason: notes || undefined, notes: notes || undefined,
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('تم تحديث سجل الحضور والراتب')
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
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
            <select className={selectCls} value={status} onChange={e => setStatus(e.target.value)}>
              {['pending', 'on_time', 'late', 'absent', 'excused'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="حالة الاستحقاق للراتب">
            <select className={selectCls} value={payrollStatus} onChange={e => setPayrollStatus(e.target.value)}>
              {Object.entries(PAYROLL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="سبب التصحيح (سيظهر للمعلم)">
            <textarea className={`${inputCls} h-16 resize-none py-2`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري..." />
          </Field>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="flex-1 h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {mut.isPending && <Spinner size="sm" color="border-white" />}
            حفظ التصحيح
          </button>
          <button onClick={onClose} className="px-4 h-10 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">إلغاء</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Session Row ───────────────────────────────────────────────────────────────

function SessionRow({ session, onEdit, onReschedule, onCancel, onCorrect }) {
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.scheduled
  const canCancel = ['scheduled', 'ongoing'].includes(session.status)

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
      <td className="px-5 py-3.5">
        <div className="font-semibold text-gray-900 text-sm">{session.titleAr}</div>
        {session.meetingLink && (
          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
            className="text-xs text-violet-500 hover:text-violet-700 flex items-center gap-1 mt-0.5">
            <Video size={11} /> رابط الاجتماع
          </a>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          {session.teacherAttendanceStatus && session.teacherAttendanceStatus !== 'pending' && (
            <AttendanceStatusBadge status={session.teacherAttendanceStatus} size="sm" />
          )}
          <PayrollBadge status={session.payrollStatus} />
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Avatar src={getFileUrl(session.studentId?.avatar)} firstName={session.studentId?.firstNameAr} lastName={session.studentId?.lastNameAr} size="xs" />
          <span className="text-sm text-gray-600">{session.studentId?.firstNameAr} {session.studentId?.lastNameAr}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Avatar src={getFileUrl(session.teacherId?.avatar)} firstName={session.teacherId?.firstNameAr} lastName={session.teacherId?.lastNameAr} size="xs" />
          <span className="text-sm text-gray-600">{session.teacherId?.firstNameAr} {session.teacherId?.lastNameAr}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="text-sm text-gray-700 font-medium">{formatDateAr(session.scheduledAt)}</div>
        <div className="text-xs text-gray-400">{formatTimeAr(session.scheduledAt)} · {session.durationMinutes}د</div>
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(session)}
            className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-600 transition-colors" title="تعديل">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onCorrect(session)}
            className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors" title="تصحيح الحضور والراتب">
            <ShieldAlert size={14} />
          </button>
          {canCancel && (
            <button onClick={() => onReschedule(session)}
              className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors" title="إعادة جدولة">
              <RefreshCw size={14} />
            </button>
          )}
          {canCancel && (
            <button onClick={() => onCancel(session)}
              className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors" title="إلغاء">
              <XCircle size={14} />
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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [payrollStatus, setPayrollStatus] = useState('')
  const [createModal, setCreateModal] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [rescheduleSession, setRescheduleSession] = useState(null)
  const [correctSession, setCorrectSession] = useState(null)
  const qc = useQueryClient()

  const buildQuery = () => {
    const p = new URLSearchParams({ page, limit: 20 })
    if (status) p.set('status', status)
    if (teacherId) p.set('teacherId', teacherId)
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    if (payrollStatus) p.set('payrollStatus', payrollStatus)
    return p.toString()
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sessions', page, status, teacherId, dateFrom, dateTo, payrollStatus],
    queryFn: () => api.get(`/admin/sessions?${buildQuery()}`).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  const { data: teachersData } = useQuery({
    queryKey: ['admin', 'teachers', 'all'],
    queryFn: () => api.get('/admin/teachers?limit=100').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: studentsData } = useQuery({
    queryKey: ['admin', 'students', 'all'],
    queryFn: () => api.get('/admin/students?limit=200').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const cancelMut = useMutation({
    mutationFn: (id) => api.patch(`/sessions/${id}/cancel`).then(r => r.data),
    onSuccess: () => {
      toast.success('تم إلغاء الحصة')
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const handleCancel = (session) => {
    if (window.confirm(`هل أنت متأكد من إلغاء حصة "${session.titleAr}"؟`)) {
      cancelMut.mutate(session._id)
    }
  }

  const sessions = data?.data || []
  const teachers = teachersData?.data || []
  const students = studentsData?.data || []

  const statusOptions = [
    { key: '', label: 'الكل' },
    { key: 'scheduled', label: 'مجدولة' },
    { key: 'ongoing', label: 'جارية' },
    { key: 'completed', label: 'مكتملة' },
    { key: 'cancelled', label: 'ملغاة' },
    { key: 'missed', label: 'بحاجة متابعة' },
    { key: 'no_show', label: 'غياب' },
  ]

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">إدارة الحصص</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || 0} حصة — صلاحيات كاملة على جميع الحصص</p>
        </div>
        <button onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 h-10 px-5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm">
          <Plus size={16} /> حصة جديدة
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
        {/* Status Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {statusOptions.map(s => (
            <button key={s.key} onClick={() => { setStatus(s.key); setPage(1) }}
              className={`px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-all ${status === s.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-violet-400 cursor-pointer min-w-[160px]"
            value={teacherId} onChange={e => { setTeacherId(e.target.value); setPage(1) }}>
            <option value="">جميع المعلمين</option>
            {teachers.map(t => <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr}</option>)}
          </select>
          <input type="date" className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-violet-400"
            value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} placeholder="من تاريخ" />
          <input type="date" className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-violet-400"
            value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} placeholder="إلى تاريخ" />
          <select className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-violet-400 cursor-pointer min-w-[150px]"
            value={payrollStatus} onChange={e => { setPayrollStatus(e.target.value); setPage(1) }}>
            <option value="">كل حالات الاستحقاق</option>
            {Object.entries(PAYROLL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(teacherId || dateFrom || dateTo || payrollStatus) && (
            <button onClick={() => { setTeacherId(''); setDateFrom(''); setDateTo(''); setPayrollStatus(''); setPage(1) }}
              className="h-9 px-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['الحصة', 'الطالب', 'المعلم', 'التاريخ', 'الحالة', 'إجراءات'].map(h => (
                  <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <SessionRow key={s._id} session={s}
                  onEdit={setEditSession}
                  onReschedule={setRescheduleSession}
                  onCancel={handleCancel}
                  onCorrect={setCorrectSession}
                />
              ))}
            </tbody>
          </table>
          {!sessions.length && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <Calendar size={24} />
              </div>
              <p className="font-semibold text-gray-500">لا توجد حصص</p>
              <p className="text-sm text-gray-400 mt-1">جرب تغيير الفلاتر أو أنشئ حصة جديدة</p>
            </div>
          )}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination current={page} total={data.totalPages} onChange={setPage} />
        </div>
      )}

      {/* Modals */}
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
    </div>
  )
}
