import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Edit2, Phone, Mail, MessageCircle, KeyRound, Plus, GraduationCap, Users, Calendar,
  TrendingUp, Wallet, FileText, CheckCircle2,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../../utils/api.js'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import AttendanceStatusBadge from '../../components/ui/AttendanceStatusBadge.jsx'
import GenderSegmentedControl from '../../components/ui/GenderSegmentedControl.jsx'
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import { exportReportToPDF } from '../../utils/exportUtils.js'
import { resolveTeacherIdentity } from '../../utils/teacherIdentity.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

// ── Teacher CRM Panel ─────────────────────────────────────────────────────────

function InfoRow({ label, value, icon }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-none text-gray-400">{icon}</div>
      <div>
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        <div className="text-sm font-semibold text-gray-800">{value}</div>
      </div>
    </div>
  )
}

function EditTeacherForm({ teacher, onSave, isSaving }) {
  const [form, setForm] = useState({
    firstNameAr: teacher.firstNameAr || '',
    lastNameAr: teacher.lastNameAr || '',
    email: teacher.email || '',
    phone: teacher.phone || '',
    specialization: teacher.specialization || '',
    bioAr: teacher.bioAr || '',
    salaryPerSession: teacher.salaryPerSession || '',
    gender: teacher.gender || '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const handleSubmit = (e) => { e.preventDefault(); onSave(form) }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 py-4">
      <GenderSegmentedControl value={form.gender} onChange={v => set('gender', v)} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-400 mb-1 block">الاسم الأول</label>
          <input className={inputCls} value={form.firstNameAr} onChange={e => set('firstNameAr', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 mb-1 block">الاسم الأخير</label>
          <input className={inputCls} value={form.lastNameAr} onChange={e => set('lastNameAr', e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-400 mb-1 block">البريد الإلكتروني</label>
        <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} dir="ltr" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-400 mb-1 block">رقم الهاتف</label>
          <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} dir="ltr" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 mb-1 block">الراتب / الحصة (SAR)</label>
          <input type="number" className={inputCls} value={form.salaryPerSession} onChange={e => set('salaryPerSession', e.target.value)} placeholder="0" />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-400 mb-1 block">التخصص</label>
        <input className={inputCls} value={form.specialization} onChange={e => set('specialization', e.target.value)} placeholder="تجويد القرآن الكريم" />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-400 mb-1 block">نبذة</label>
        <textarea className={`${inputCls} h-20 resize-none py-2.5`} value={form.bioAr} onChange={e => set('bioAr', e.target.value)} />
      </div>
      <button type="submit" disabled={isSaving}
        className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
        {isSaving && <Spinner size="sm" color="border-white" />}
        حفظ التعديلات
      </button>
    </form>
  )
}

function ResetPasswordForm({ teacherId, onDone }) {
  const [pw, setPw] = useState('')
  const mut = useMutation({
    mutationFn: () => api.post(`/admin/teachers/${teacherId}/reset-password`, { newPassword: pw }).then(r => r.data),
    onSuccess: () => { toast.success('تم إعادة تعيين كلمة المرور'); onDone() },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })
  return (
    <div className="py-4 space-y-3">
      <p className="text-sm text-gray-500">أدخل كلمة المرور الجديدة للمعلم</p>
      <input type="password" className={inputCls} value={pw} onChange={e => setPw(e.target.value)} placeholder="كلمة مرور جديدة (8 أحرف على الأقل)" dir="ltr" />
      <button onClick={() => mut.mutate()} disabled={pw.length < 8 || mut.isPending}
        className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
        {mut.isPending && <Spinner size="sm" color="border-white" />}
        تعيين كلمة المرور
      </button>
    </div>
  )
}

// ── Teacher Performance Tab (attendance, salary, correction) ──────────────────

function getPeriodRange(preset) {
  const now = new Date()
  if (preset === 'week') {
    const from = new Date(now); from.setDate(now.getDate() - now.getDay()); from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: now.toISOString(), label: 'هذا الأسبوع' }
  }
  if (preset === 'quarter') {
    const from = new Date(now); from.setMonth(now.getMonth() - 3)
    return { from: from.toISOString(), to: now.toISOString(), label: 'آخر 3 أشهر' }
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: from.toISOString(), to: now.toISOString(), label: 'هذا الشهر' }
}

const CORRECTION_OPTIONS = [
  { value: 'on_time', label: 'في الموعد' },
  { value: 'late', label: 'متأخر' },
  { value: 'absent', label: 'غائب' },
  { value: 'excused', label: 'معذور' },
]

function AttendanceCorrectionMenu({ session, onDone }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const mut = useMutation({
    mutationFn: (status) => api.patch(`/teacher-performance/admin/session/${session._id}/attendance`, { status }),
    onSuccess: () => {
      toast.success('تم تحديث الحضور')
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-performance'] })
      setOpen(false)
      onDone?.()
    },
    onError: () => toast.error('حدث خطأ'),
  })
  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)} className="text-[10px] font-semibold text-violet-500 hover:text-violet-700 transition-colors">
        تصحيح
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-32">
          {CORRECTION_OPTIONS.map(o => (
            <button key={o.value} onClick={() => mut.mutate(o.value)} disabled={mut.isPending}
              className="w-full text-right px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TeacherPerformanceTab({ teacherId }) {
  const [period, setPeriod] = useState('month')
  const periodRange = useMemo(() => getPeriodRange(period), [period])

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'teacher-performance', 'summary', teacherId, periodRange.from, periodRange.to],
    queryFn: () => api.get(`/teacher-performance/admin/${teacherId}/summary`, { params: { from: periodRange.from, to: periodRange.to } }).then(r => r.data.data),
  })

  const { data: trend } = useQuery({
    queryKey: ['admin', 'teacher-performance', 'trend', teacherId],
    queryFn: () => api.get(`/teacher-performance/admin/${teacherId}/trend`, { params: { range: 'weekly' } }).then(r => r.data.data),
  })

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['admin', 'teacher-performance', 'attendance', teacherId, periodRange.from, periodRange.to],
    queryFn: () => api.get(`/teacher-performance/admin/${teacherId}/attendance`, { params: { from: periodRange.from, to: periodRange.to, limit: 8 } }).then(r => r.data.data),
  })

  async function handleExport() {
    if (!summary?.salary) return toast.error('لا توجد بيانات')
    await exportReportToPDF({
      title: 'تقرير أداء المعلم',
      subtitle: `${summary.salary.teacherName} — الفترة: ${periodRange.label}`,
      meta: `تم إنشاء التقرير في ${formatDateAr(new Date())}`,
      columns: [{ key: 'label', label: 'البند' }, { key: 'value', label: 'القيمة' }],
      rows: [
        { label: 'إجمالي الحصص', value: summary.attendance.totalSessions },
        { label: 'نسبة الالتزام بالمواعيد', value: `${summary.attendance.punctualityRate}%` },
        { label: 'نسبة الإكمال', value: `${summary.attendance.completionRate}%` },
        { label: 'حصص مستحقة الدفع', value: summary.salary.payableSessions },
        { label: 'غياب بدون أجر', value: summary.salary.unpaidAbsences },
        { label: 'سعر الحصة', value: formatCurrency(summary.salary.salaryPerSession, 'SAR') },
      ],
      summary: `الإجمالي المستحق: ${formatCurrency(summary.salary.totalAmount, 'SAR')}`,
      filename: 'تقرير-أداء-المعلم',
    })
    toast.success('تم إنشاء ملف PDF')
  }

  return (
    <div className="py-4 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
          {[['week', 'أسبوع'], ['month', 'شهر'], ['quarter', '3 أشهر']].map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${period === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 hover:text-violet-800 transition-colors">
          <FileText size={12} /> تصدير PDF
        </button>
      </div>

      {summaryLoading ? <div className="flex justify-center py-8"><Spinner color="border-violet-600" /></div> : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-50">
              <div className="font-heading font-extrabold text-lg text-emerald-700">{summary?.attendance?.punctualityRate ?? 0}%</div>
              <div className="text-[10px] text-emerald-500 mt-0.5">الالتزام</div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-violet-50">
              <div className="font-heading font-extrabold text-lg text-violet-700">{summary?.attendance?.completionRate ?? 0}%</div>
              <div className="text-[10px] text-violet-500 mt-0.5">الإكمال</div>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-blue-50 min-w-0 w-full">
              <div className="font-heading font-extrabold text-base text-blue-700 whitespace-nowrap" dir="ltr">{formatCurrency(summary?.salary?.totalAmount || 0, 'SAR')}</div>
              <div className="text-[10px] text-blue-500 mt-0.5">الراتب المستحق</div>
            </div>
          </div>

          {trend?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">اتجاه الحضور (أسبوعي)</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={trend} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f0fc" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="onTime" name="في الموعد" stackId="a" fill="#22c55e" />
                  <Bar dataKey="late" name="متأخر" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="absent" name="غياب" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">آخر السجلات</h4>
            {historyLoading ? <Spinner size="sm" color="border-violet-600" /> : !history?.sessions?.length ? (
              <p className="text-xs text-gray-400 py-3">لا توجد سجلات لهذه الفترة</p>
            ) : (
              <div className="space-y-1.5">
                {history.sessions.map(s => (
                  <div key={s._id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-700 truncate">{s.titleAr}</div>
                      <div className="text-[10px] text-gray-400">{formatDateAr(s.scheduledAt)} • {formatTimeAr(s.scheduledAt)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <AttendanceStatusBadge status={s.teacherAttendanceStatus} size="sm" />
                      <AttendanceCorrectionMenu session={s} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function TeacherCRMPanel({ teacher, onClose, onUpdate, initialTab = 'info' }) {
  const [tab, setTab] = useState(initialTab)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const qc = useQueryClient()

  const updateMut = useMutation({
    mutationFn: (data) => api.patch(`/admin/teachers/${teacher._id}`, data).then(r => r.data),
    onSuccess: (res) => {
      toast.success('تم تحديث بيانات المعلم')
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      onUpdate(res.data)
      setTab('info')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const toggleMut = useMutation({
    mutationFn: (isActive) => api.patch(`/admin/teachers/${teacher._id}`, { isActive }).then(r => r.data),
    onSuccess: (res) => {
      toast.success(res.data?.isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      onUpdate(res.data)
    },
    onError: () => toast.error('حدث خطأ'),
  })

  // Deactivating a teacher immediately blocks their access and effectively
  // pauses every one of their assigned students, so it gets a confirm step;
  // reactivating is safe/reversible and stays a single click.
  function requestToggle() {
    if (teacher.isActive) setConfirmDeactivate(true)
    else toggleMut.mutate(true)
  }

  const sc = teacher.isActive ? '#10b981' : '#ef4444'

  const tabs = [
    { key: 'info', label: 'الملف' },
    { key: 'performance', label: 'الأداء' },
    { key: 'edit', label: 'تعديل' },
    { key: 'reset', label: 'كلمة المرور' },
  ]

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <motion.aside
        initial={{ x: -480 }} animate={{ x: 0 }} exit={{ x: -480 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="fixed left-0 top-0 bottom-0 z-50 w-[460px] max-w-full bg-white overflow-y-auto"
        style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.12)', direction: 'rtl' }}>

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar src={resolveTeacherIdentity(teacher).displayAvatar} firstName={teacher.firstNameAr} lastName={teacher.lastNameAr} size="lg" />
              <div>
                <div className="font-heading font-bold text-gray-900 text-base">{teacher.firstNameAr} {teacher.lastNameAr}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
                  <span className="text-xs font-semibold" style={{ color: sc }}>{teacher.isActive ? 'معلم نشط' : 'حساب موقوف'}</span>
                  {!teacher.gender && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">التصنيف غير محدد</span>
                  )}
                </div>
                {teacher.specialization && <div className="text-xs text-gray-400 mt-0.5">{teacher.specialization}</div>}
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="flex gap-1 mt-3 p-1 bg-gray-100 rounded-xl">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 py-1.5 rounded-[10px] text-xs font-bold transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-6">
          {tab === 'info' && (
            <>
              {/* Stats */}
              <div className="py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">الإحصائيات</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center p-3 rounded-xl bg-violet-50">
                    <div className="font-heading font-extrabold text-xl text-violet-700">{teacher.studentCount || 0}</div>
                    <div className="text-xs text-violet-500 mt-0.5">الطلاب</div>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-xl bg-amber-50">
                    <div className="font-heading font-extrabold text-xl text-amber-600">{teacher.sessionCount || 0}</div>
                    <div className="text-xs text-amber-500 mt-0.5">الحصص</div>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-xl" style={{ background: teacher.salaryPerSession ? '#f0fdf4' : '#f9fafb' }}>
                    <div className="font-heading font-extrabold text-xl" style={{ color: teacher.salaryPerSession ? '#16a34a' : '#9ca3af' }}>
                      {teacher.salaryPerSession ? `${teacher.salaryPerSession}` : '—'}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: teacher.salaryPerSession ? '#16a34a' : '#9ca3af' }}>SAR/حصة</div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">معلومات التواصل</h3>
                <InfoRow label="البريد الإلكتروني" value={teacher.email} icon={<Mail size={14} />} />
                <InfoRow label="رقم الهاتف" value={teacher.phone} icon={<Phone size={14} />} />
                <InfoRow label="التخصص" value={teacher.specialization} icon={<GraduationCap size={14} />} />
                <InfoRow label="نبذة" value={teacher.bioAr} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h16M4 14h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>} />
              </div>

              {/* Account */}
              <div className="py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">بيانات الحساب</h3>
                <InfoRow label="تاريخ الانضمام" value={formatDateAr(teacher.createdAt)} icon={<Calendar size={14} />} />
              </div>

              {/* Quick Actions */}
              <div className="py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">إجراءات</h3>
                <div className="flex gap-2">
                  {teacher.email && (
                    <button onClick={() => window.open(`mailto:${teacher.email}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors">
                      <Mail size={15} /> مراسلة
                    </button>
                  )}
                  {teacher.phone && (
                    <button onClick={() => window.open(`https://wa.me/${teacher.phone}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                      <MessageCircle size={15} /> واتساب
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button onClick={requestToggle} disabled={toggleMut.isPending}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${teacher.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                  {toggleMut.isPending && <Spinner size="sm" color={teacher.isActive ? 'border-red-500' : 'border-emerald-600'} />}
                  {teacher.isActive ? 'إيقاف حساب المعلم' : 'تفعيل حساب المعلم'}
                </button>
              </div>
            </>
          )}

          {tab === 'performance' && (
            <TeacherPerformanceTab teacherId={teacher._id} />
          )}

          {tab === 'edit' && (
            <EditTeacherForm teacher={teacher} onSave={(data) => updateMut.mutate(data)} isSaving={updateMut.isPending} />
          )}

          {tab === 'reset' && (
            <ResetPasswordForm teacherId={teacher._id} onDone={() => setTab('info')} />
          )}
        </div>
      </motion.aside>

      <ConfirmDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => { toggleMut.mutate(false); setConfirmDeactivate(false) }}
        title="إيقاف حساب المعلم"
        message={`سيتم إيقاف حساب "${teacher.firstNameAr} ${teacher.lastNameAr}" فوراً، ولن يتمكن من الدخول أو إدارة حصصه حتى يُعاد تفعيله. هل تريد المتابعة؟`}
        confirmLabel="إيقاف الحساب"
        variant="danger"
      />
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const initialForm = { firstNameAr: '', lastNameAr: '', email: '', password: '', phone: '', specialization: '', gender: '' }

export default function AdminTeachersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [panelInitialTab, setPanelInitialTab] = useState('info')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(initialForm)
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'teachers', page, search],
    queryFn: () => api.get(`/admin/teachers?page=${page}&limit=15&search=${encodeURIComponent(search)}`).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  // Deep-link support: /admin/teachers?teacherId=... auto-opens that teacher's
  // performance tab (used by AdminTeacherPerformancePage's "عرض الملف" link)
  useEffect(() => {
    const teacherId = searchParams.get('teacherId')
    if (!teacherId || !data?.data) return
    const found = data.data.find(t => t._id === teacherId)
    if (found) {
      setSelected(found)
      setPanelInitialTab('performance')
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('teacherId'); return p }, { replace: true })
    }
  }, [searchParams, data])

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/admin/teachers', { ...d, role: 'teacher' }),
    onSuccess: () => {
      toast.success('تم إنشاء حساب المعلم')
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      setShowCreate(false)
      setForm(initialForm)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }
  function submitCreate() {
    if (!form.gender) return toast.error('يرجى تحديد تصنيف المعلم: معلم أو معلمة')
    createMutation.mutate(form)
  }
  const teachers = data?.data || []

  const handlePanelUpdate = (updated) => {
    if (updated && selected?._id === updated._id) setSelected(updated)
  }

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">إدارة المعلمين</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || 0} معلم — صلاحيات كاملة على جميع الحسابات</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90 bg-violet-600">
          <Plus size={16} /> إضافة معلم
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="relative max-w-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث عن معلم..." dir="rtl"
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((t) => (
            <motion.div key={t._id} whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              onClick={() => { setSelected(t); setPanelInitialTab('info') }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer transition-all">
              <div className="flex items-start gap-3 mb-4">
                <Avatar src={resolveTeacherIdentity(t).displayAvatar} firstName={t.firstNameAr} lastName={t.lastNameAr} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-bold text-gray-900 text-base truncate">{t.firstNameAr} {t.lastNameAr}</div>
                  {t.specialization && <div className="text-xs text-gray-500 mt-0.5 truncate">{t.specialization}</div>}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {t.isActive ? 'نشط' : 'موقوف'}
                    </span>
                    {!t.gender && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">التصنيف غير محدد</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex flex-col items-center py-2.5 rounded-xl bg-violet-50">
                  <div className="font-heading font-extrabold text-lg text-violet-700">{t.studentCount || 0}</div>
                  <div className="text-[11px] text-violet-500">طالب</div>
                </div>
                <div className="flex flex-col items-center py-2.5 rounded-xl bg-amber-50">
                  <div className="font-heading font-extrabold text-lg text-amber-600">{t.sessionCount || 0}</div>
                  <div className="text-[11px] text-amber-500">حصة</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">انضم {formatDateAr(t.createdAt)}</span>
                <button onClick={e => { e.stopPropagation(); setSelected(t); setPanelInitialTab('info') }}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                  <Edit2 size={11} /> إدارة
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && !teachers.length && (
        <div className="bg-white rounded-2xl p-16 border border-gray-100 flex flex-col items-center text-gray-400">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><GraduationCap size={24} /></div>
          <p className="font-semibold text-gray-500">لا يوجد معلمون</p>
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination current={page} total={data.totalPages} onChange={setPage} />
        </div>
      )}

      {/* CRM Panel */}
      <AnimatePresence>
        {selected && <TeacherCRMPanel teacher={selected} onClose={() => setSelected(null)} onUpdate={handlePanelUpdate} initialTab={panelInitialTab} />}
      </AnimatePresence>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إضافة معلم جديد" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="purple" onClick={submitCreate} loading={createMutation.isPending}>إنشاء الحساب</Button>
        </>}>
        <div className="space-y-4">
          <GenderSegmentedControl value={form.gender} onChange={v => setForm(p => ({ ...p, gender: v }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الأول" name="firstNameAr" value={form.firstNameAr} onChange={change} variant="light" />
            <Input label="اسم العائلة" name="lastNameAr" value={form.lastNameAr} onChange={change} variant="light" />
          </div>
          <Input label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={change} variant="light" />
          <Input label="كلمة المرور" name="password" type="password" value={form.password} onChange={change} variant="light" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="رقم الهاتف" name="phone" value={form.phone} onChange={change} variant="light" />
            <Input label="التخصص" name="specialization" value={form.specialization} onChange={change} variant="light" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
