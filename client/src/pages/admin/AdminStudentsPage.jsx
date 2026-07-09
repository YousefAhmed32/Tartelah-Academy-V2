import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Edit2, Phone, Mail, MessageCircle, KeyRound, Trash2, User, BookOpen, Star, Calendar, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../utils/api.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

// ── Student CRM Side Panel ────────────────────────────────────────────────────

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

function QuickAction({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:scale-105"
      style={{ background: `${color}10`, color }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>{icon}</div>
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  )
}

function EditStudentForm({ student, onSave, isSaving }) {
  const [form, setForm] = useState({
    firstNameAr: student.firstNameAr || '',
    lastNameAr: student.lastNameAr || '',
    email: student.email || '',
    phone: student.phone || '',
    bioAr: student.bioAr || '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 py-4">
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
      <div>
        <label className="text-xs font-bold text-gray-400 mb-1 block">رقم الهاتف</label>
        <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} dir="ltr" />
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

function ResetPasswordForm({ studentId, onDone }) {
  const [pw, setPw] = useState('')
  const mut = useMutation({
    mutationFn: () => api.post(`/admin/students/${studentId}/reset-password`, { newPassword: pw }).then(r => r.data),
    onSuccess: () => { toast.success('تم إعادة تعيين كلمة المرور'); onDone() },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })
  return (
    <div className="py-4 space-y-3">
      <p className="text-sm text-gray-500">أدخل كلمة المرور الجديدة للطالب</p>
      <input type="password" className={inputCls} value={pw} onChange={e => setPw(e.target.value)} placeholder="كلمة مرور جديدة (8 أحرف على الأقل)" dir="ltr" />
      <button onClick={() => mut.mutate()} disabled={pw.length < 8 || mut.isPending}
        className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
        {mut.isPending && <Spinner size="sm" color="border-white" />}
        تعيين كلمة المرور
      </button>
    </div>
  )
}

function StudentCRMPanel({ student, onClose, onUpdate }) {
  const [tab, setTab] = useState('info') // info | edit | reset
  const qc = useQueryClient()

  const updateMut = useMutation({
    mutationFn: (data) => api.patch(`/admin/students/${student._id}`, data).then(r => r.data),
    onSuccess: (res) => {
      toast.success('تم تحديث بيانات الطالب')
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      onUpdate(res.data)
      setTab('info')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const toggleMut = useMutation({
    mutationFn: (isActive) => api.patch(`/admin/students/${student._id}`, { isActive }).then(r => r.data),
    onSuccess: (res) => {
      toast.success(res.data?.isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      onUpdate(res.data)
    },
    onError: () => toast.error('حدث خطأ'),
  })

  const sc = student.isActive ? '#10b981' : '#ef4444'

  const tabs = [
    { key: 'info', label: 'الملف' },
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
        style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.12)', direction: 'rtl' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar src={getFileUrl(student.avatar)} firstName={student.firstNameAr} lastName={student.lastNameAr} size="md" />
              <div>
                <div className="font-heading font-bold text-gray-900 text-base">{student.firstNameAr} {student.lastNameAr}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />
                  <span className="text-xs font-semibold" style={{ color: sc }}>{student.isActive ? 'نشط' : 'موقوف'}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Tabs */}
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
              {/* Quick Actions */}
              <div className="py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">إجراءات سريعة</h3>
                <div className="grid grid-cols-4 gap-2">
                  {student.phone && <QuickAction icon={<Phone size={15} />} label="اتصال" color="#10b981" onClick={() => window.open(`tel:${student.phone}`)} />}
                  {student.phone && <QuickAction icon={<MessageCircle size={15} />} label="واتساب" color="#25D366" onClick={() => window.open(`https://wa.me/${student.phone}`)} />}
                  <QuickAction icon={<Mail size={15} />} label="رسالة" color="#7c3aed" onClick={() => window.open(`mailto:${student.email}`)} />
                  <QuickAction
                    icon={student.isActive ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M10 15V9M14 15V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="m10 8 6 4-6 4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
                    label={student.isActive ? 'إيقاف' : 'تفعيل'}
                    color={student.isActive ? '#ef4444' : '#10b981'}
                    onClick={() => toggleMut.mutate(!student.isActive)}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">معلومات التواصل</h3>
                <InfoRow label="البريد الإلكتروني" value={student.email} icon={<Mail size={14} />} />
                <InfoRow label="رقم الهاتف" value={student.phone} icon={<Phone size={14} />} />
              </div>

              <div className="py-4 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">بيانات الحساب</h3>
                <InfoRow label="تاريخ التسجيل" value={formatDateAr(student.createdAt)} icon={<Calendar size={14} />} />
                <InfoRow label="الدور" value="طالب" icon={<User size={14} />} />
                {student.bioAr && <InfoRow label="نبذة" value={student.bioAr} icon={<BookOpen size={14} />} />}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <Link to={`/admin/students/${student._id}`}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 bg-violet-50 text-violet-700 hover:bg-violet-100">
                  <ExternalLink size={14} /> السجل الأكاديمي الكامل
                </Link>
                <button onClick={() => toggleMut.mutate(!student.isActive)} disabled={toggleMut.isPending}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${student.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                  {toggleMut.isPending && <Spinner size="sm" color={student.isActive ? 'border-red-500' : 'border-emerald-600'} />}
                  {student.isActive ? 'إيقاف حساب الطالب' : 'تفعيل حساب الطالب'}
                </button>
              </div>
            </>
          )}

          {tab === 'edit' && (
            <EditStudentForm student={student} onSave={(data) => updateMut.mutate(data)} isSaving={updateMut.isPending} />
          )}

          {tab === 'reset' && (
            <ResetPasswordForm studentId={student._id} onDone={() => setTab('info')} />
          )}
        </div>
      </motion.aside>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students', page, search, statusFilter],
    queryFn: () => api.get(`/admin/students?page=${page}&limit=15&search=${encodeURIComponent(search)}${statusFilter ? `&status=${statusFilter}` : ''}`).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  const students = data?.data || []

  const handlePanelUpdate = (updated) => {
    if (updated && selected?._id === updated._id) setSelected(updated)
  }

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">إدارة الطلاب</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || 0} طالب — انقر لعرض الملف الكامل والتعديل</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 transition-all" dir="rtl" />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[['', 'الكل'], ['active', 'نشطون'], ['inactive', 'موقوفون']].map(([k, l]) => (
            <button key={k} onClick={() => { setStatusFilter(k); setPage(1) }}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all ${statusFilter === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['الطالب', 'البريد الإلكتروني', 'الهاتف', 'تاريخ التسجيل', 'الحالة', ''].map(h => (
                  <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <motion.tr key={st._id} whileHover={{ backgroundColor: '#FAFAFA' }}
                  className="border-b border-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelected(st)}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={getFileUrl(st.avatar)} firstName={st.firstNameAr} lastName={st.lastNameAr} size="sm" />
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{st.firstNameAr} {st.lastNameAr}</div>
                        {st.bioAr && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-[160px]">{st.bioAr}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className="text-sm text-gray-500">{st.email}</span></td>
                  <td className="px-5 py-4"><span className="text-sm text-gray-500" dir="ltr">{st.phone || '—'}</span></td>
                  <td className="px-5 py-4"><span className="text-sm text-gray-500">{formatDateAr(st.createdAt)}</span></td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {st.isActive ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={e => { e.stopPropagation(); setSelected(st) }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-violet-50">
                      <Edit2 size={12} /> إدارة
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {!students.length && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <User size={24} />
              </div>
              <p className="font-semibold text-gray-500">لا توجد نتائج</p>
            </div>
          )}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination current={page} total={data.totalPages} onChange={setPage} />
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <StudentCRMPanel student={selected} onClose={() => setSelected(null)} onUpdate={handlePanelUpdate} />
        )}
      </AnimatePresence>
    </div>
  )
}
