import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDateAr } from '../../utils/date.js'

// ── Student CRM Side Panel ────────────────────────────────────────────────────

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

function QuickAction({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:scale-105"
      style={{ background: `${color}10`, color }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        {icon}
      </div>
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  )
}

function StudentCRMPanel({ student, onClose, onToggleActive }) {
  if (!student) return null

  const statusColor = student.isActive ? '#10b981' : '#ef4444'
  const statusLabel = student.isActive ? 'نشط' : 'موقوف'

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel — slides in from the left (content side in RTL layout) */}
      <motion.aside
        initial={{ x: -480 }}
        animate={{ x: 0 }}
        exit={{ x: -480 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="fixed left-0 top-0 bottom-0 z-50 w-[460px] max-w-full bg-white overflow-y-auto"
        style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.12)', direction: 'rtl' }}
      >
        {/* Panel Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                src={student.avatar}
                firstName={student.firstNameAr}
                lastName={student.lastNameAr}
                size="md"
              />
              <div>
                <div className="font-heading font-bold text-gray-900 text-base">
                  {student.firstNameAr} {student.lastNameAr}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                  <span className="text-xs font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
                </div>
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

        {/* Panel Body */}
        <div className="px-5 pb-6">

          {/* Quick Actions */}
          <div className="py-4 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">إجراءات سريعة</h3>
            <div className="grid grid-cols-4 gap-2">
              {student.phone && (
                <QuickAction
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
                  label="اتصال"
                  color="#10b981"
                  onClick={() => window.open(`tel:${student.phone}`)}
                />
              )}
              {student.phone && (
                <QuickAction
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
                  label="واتساب"
                  color="#25D366"
                  onClick={() => window.open(`https://wa.me/${student.phone}`)}
                />
              )}
              <QuickAction
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8"/><path d="m22 6-10 7L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                label="رسالة"
                color="#7c3aed"
                onClick={() => window.open(`mailto:${student.email}`)}
              />
              <QuickAction
                icon={student.isActive
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M10 15V9M14 15V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="m10 8 6 4-6 4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                }
                label={student.isActive ? 'إيقاف' : 'تفعيل'}
                color={student.isActive ? '#ef4444' : '#10b981'}
                onClick={() => onToggleActive(student._id, !student.isActive)}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="py-4 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">معلومات التواصل</h3>
            <InfoRow
              label="البريد الإلكتروني"
              value={student.email}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.7"/><path d="m22 6-10 7L2 6" stroke="currentColor" strokeWidth="1.7"/></svg>}
            />
            <InfoRow
              label="رقم الهاتف"
              value={student.phone}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.17 12.7a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.1 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>}
            />
            <InfoRow
              label="الدولة"
              value={student.country}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M3 12h18M12 3c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10s1.5-7.3 4-10Z" stroke="currentColor" strokeWidth="1.7"/></svg>}
            />
          </div>

          {/* Subscription Info */}
          <div className="py-4 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">الاشتراك الحالي</h3>
            <InfoRow
              label="المعلم المعين"
              value={student.teacherId ? `${student.teacherId.firstNameAr} ${student.teacherId.lastNameAr}` : 'لم يتم التعيين'}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}
            />
            <InfoRow
              label="حالة الحساب"
              value={student.isActive ? 'حساب نشط' : 'حساب موقوف'}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            />
          </div>

          {/* Account Info */}
          <div className="py-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">بيانات الحساب</h3>
            <InfoRow
              label="تاريخ التسجيل"
              value={formatDateAr(student.createdAt)}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}
            />
            <InfoRow
              label="البريد الإلكتروني"
              value={student.email}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}
            />
          </div>

          {/* Danger Zone */}
          <div className="mt-2 pt-4 border-t border-gray-100">
            <button
              onClick={() => onToggleActive(student._id, !student.isActive)}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                student.isActive
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {student.isActive ? 'إيقاف حساب الطالب' : 'تفعيل حساب الطالب'}
            </button>
          </div>
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
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students', page, search],
    queryFn: () => api.get(`/admin/students?page=${page}&limit=15&search=${search}`).then(r => r.data),
    placeholderData: { data: [], totalPages: 1, total: 0 },
    keepPreviousData: true,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/students/${id}`, { isActive }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      if (selected?._id === vars.id) {
        setSelected(prev => prev ? { ...prev, isActive: vars.isActive } : null)
      }
    },
    onError: () => toast.error('حدث خطأ'),
  })

  const students = data?.data || []

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">

      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">إدارة الطلاب</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.total || 0} طالب مسجل — انقر على أي طالب لعرض ملفه الكامل
          </p>
        </div>
      </div>

      {/* Search + Filters */}
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
              placeholder="بحث بالاسم أو البريد الإلكتروني..."
              className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
              dir="rtl"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {students.length} نتيجة
          </div>
        </div>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner color="border-violet-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['الطالب', 'البريد الإلكتروني', 'المعلم', 'تاريخ التسجيل', 'الحالة', ''].map(h => (
                  <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <motion.tr
                  key={st._id}
                  whileHover={{ backgroundColor: '#FAFAFA' }}
                  className="border-b border-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelected(st)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={st.avatar}
                        firstName={st.firstNameAr}
                        lastName={st.lastNameAr}
                        size="sm"
                      />
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {st.firstNameAr} {st.lastNameAr}
                        </div>
                        {st.country && (
                          <div className="text-xs text-gray-400 mt-0.5">{st.country}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-500">{st.email}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-700 font-medium">
                      {st.teacherId?.firstNameAr ? `${st.teacherId.firstNameAr} ${st.teacherId.lastNameAr}` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-500">{formatDateAr(st.createdAt)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      st.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {st.isActive ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setSelected(st)
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-violet-50"
                    >
                      عرض الملف
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {!students.length && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <p className="font-semibold text-gray-500">لا توجد نتائج</p>
              <p className="text-sm text-gray-400 mt-1">جرب تغيير معايير البحث</p>
            </div>
          )}
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
          <StudentCRMPanel
            student={selected}
            onClose={() => setSelected(null)}
            onToggleActive={(id, isActive) => toggleMutation.mutate({ id, isActive })}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
