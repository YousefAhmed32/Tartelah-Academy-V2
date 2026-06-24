import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDateAr } from '../../utils/date.js'

// ── Teacher CRM Panel ─────────────────────────────────────────────────────────

function StatBadge({ value, label, color = '#7c3aed' }) {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl" style={{ background: `${color}08` }}>
      <div className="font-heading font-extrabold text-xl" style={{ color }}>{value ?? '—'}</div>
      <div className="text-xs text-gray-500 mt-0.5 text-center">{label}</div>
    </div>
  )
}

function InfoRow({ label, value, icon }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-none text-gray-400">
        {icon}
      </div>
      <div>
        <div className="text-xs text-gray-400 mb-0.5">{label}</div>
        <div className="text-sm font-semibold text-gray-800">{value}</div>
      </div>
    </div>
  )
}

function TeacherCRMPanel({ teacher, onClose, onToggleActive }) {
  if (!teacher) return null
  const statusColor = teacher.isActive ? '#10b981' : '#ef4444'

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: -480 }}
        animate={{ x: 0 }}
        exit={{ x: -480 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="fixed left-0 top-0 bottom-0 z-50 w-[460px] max-w-full bg-white overflow-y-auto"
        style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.12)', direction: 'rtl' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar src={teacher.avatar} firstName={teacher.firstNameAr} lastName={teacher.lastNameAr} size="lg" />
              <div>
                <div className="font-heading font-bold text-gray-900 text-base">
                  {teacher.firstNameAr} {teacher.lastNameAr}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                  <span className="text-xs font-semibold" style={{ color: statusColor }}>
                    {teacher.isActive ? 'معلم نشط' : 'حساب موقوف'}
                  </span>
                </div>
                {teacher.specialization && (
                  <div className="text-xs text-gray-400 mt-0.5">{teacher.specialization}</div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-6">

          {/* Performance Stats */}
          <div className="py-4 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">الأداء والإحصائيات</h3>
            <div className="grid grid-cols-3 gap-2">
              <StatBadge value={teacher.studentCount || 0} label="الطلاب" color="#7c3aed" />
              <StatBadge value={teacher.sessionCount || 0} label="الحصص الكلية" color="#E8C76A" />
              <StatBadge value={teacher.isActive ? 'نشط' : 'موقوف'} label="الحالة" color={teacher.isActive ? '#10b981' : '#ef4444'} />
            </div>
          </div>

          {/* Contact */}
          <div className="py-4 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">معلومات التواصل</h3>
            <InfoRow
              label="البريد الإلكتروني"
              value={teacher.email}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.7"/><path d="m22 6-10 7L2 6" stroke="currentColor" strokeWidth="1.7"/></svg>}
            />
            <InfoRow
              label="رقم الهاتف"
              value={teacher.phone}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.17 12.7a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.1 2h3a2 2 0 0 1 2 1.72" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>}
            />
            <InfoRow
              label="التخصص"
              value={teacher.specialization}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 14v6M9 20h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}
            />
          </div>

          {/* Activity */}
          <div className="py-4 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">بيانات الحساب</h3>
            <InfoRow
              label="تاريخ الانضمام"
              value={formatDateAr(teacher.createdAt)}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}
            />
            <InfoRow
              label="عدد الطلاب النشطين"
              value={teacher.studentCount ? `${teacher.studentCount} طالب` : 'لا يوجد طلاب'}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}
            />
          </div>

          {/* Quick Actions */}
          <div className="py-4 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">إجراءات سريعة</h3>
            <div className="flex gap-2">
              {teacher.email && (
                <button
                  onClick={() => window.open(`mailto:${teacher.email}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/><path d="m22 6-10 7L2 6" stroke="currentColor" strokeWidth="1.8"/></svg>
                  مراسلة
                </button>
              )}
              {teacher.phone && (
                <button
                  onClick={() => window.open(`https://wa.me/${teacher.phone}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                  واتساب
                </button>
              )}
            </div>
          </div>

          {/* Status Toggle */}
          <div className="mt-2 pt-4">
            <button
              onClick={() => onToggleActive(teacher._id, !teacher.isActive)}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                teacher.isActive
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {teacher.isActive ? 'إيقاف حساب المعلم' : 'تفعيل حساب المعلم'}
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const initialForm = {
  firstNameAr: '', lastNameAr: '', email: '', password: '', phone: '', specialization: ''
}

export default function AdminTeachersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(initialForm)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'teachers', page, search],
    queryFn: () => api.get(`/admin/teachers?page=${page}&limit=15&search=${search}`).then(r => r.data),
    placeholderData: { data: [], totalPages: 1, total: 0 },
    keepPreviousData: true,
  })

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

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/teachers/${id}`, { isActive }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      if (selected?._id === vars.id) {
        setSelected(prev => prev ? { ...prev, isActive: vars.isActive } : null)
      }
    },
    onError: () => toast.error('حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }
  const teachers = data?.data || []

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">

      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">إدارة المعلمين</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.total || 0} معلم — انقر على أي معلم لعرض ملفه الكامل
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90"
          style={{ background: '#7c3aed' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          إضافة معلم
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="بحث عن معلم..."
              className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
              dir="rtl"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">{teachers.length} نتيجة</div>
        </div>
      </div>

      {/* Teachers Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((t) => (
            <motion.div
              key={t._id}
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              onClick={() => setSelected(t)}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <Avatar src={t.avatar} firstName={t.firstNameAr} lastName={t.lastNameAr} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-bold text-gray-900 text-base truncate">
                    {t.firstNameAr} {t.lastNameAr}
                  </div>
                  {t.specialization && (
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{t.specialization}</div>
                  )}
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-1 px-2 py-0.5 rounded-full ${
                    t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {t.isActive ? 'نشط' : 'موقوف'}
                  </span>
                </div>
              </div>

              {/* Stats Row */}
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

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">انضم {formatDateAr(t.createdAt)}</span>
                <button
                  onClick={e => { e.stopPropagation(); setSelected(t) }}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                >
                  عرض الملف
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && !teachers.length && (
        <div className="bg-white rounded-2xl p-16 border border-gray-100 flex flex-col items-center text-gray-400">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
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
        {selected && (
          <TeacherCRMPanel
            teacher={selected}
            onClose={() => setSelected(null)}
            onToggleActive={(id, isActive) => toggleMutation.mutate({ id, isActive })}
          />
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="إضافة معلم جديد"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>
              إنشاء الحساب
            </Button>
          </>
        }
      >
        <div className="space-y-4">
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
