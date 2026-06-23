import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'

export default function AdminSubscriptionsPage() {
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ studentId: '', packageId: '', startDate: '', teacherId: '', notes: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', page],
    queryFn: () => api.get(`/subscriptions?page=${page}&limit=20`).then(r => r.data),
    placeholderData: { data: [], totalPages: 1 },
  })

  const { data: students = [] } = useQuery({ queryKey: ['admin', 'students', 'all'], queryFn: () => api.get('/admin/students?limit=200').then(r => r.data.data) })
  const { data: teachers = [] } = useQuery({ queryKey: ['admin', 'teachers', 'all'], queryFn: () => api.get('/admin/teachers?limit=100').then(r => r.data.data) })
  const { data: packages = [] } = useQuery({ queryKey: ['packages'], queryFn: () => api.get('/packages').then(r => r.data.data) })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/subscriptions', data),
    onSuccess: () => { toast.success('تم إنشاء الاشتراك'); qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] }); setShowCreate(false) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/subscriptions/${id}`, { status }),
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] }) },
  })

  const statusBadge = { active: 'success', expired: 'gray', cancelled: 'danger', paused: 'warning' }
  const statusLabel = { active: 'نشط', expired: 'منتهي', cancelled: 'ملغى', paused: 'موقوف' }

  return (
    <div dir="rtl">
      <PageHeader
        title="الاشتراكات"
        subtitle="إدارة اشتراكات الطلاب"
        actions={<Button variant="purple" onClick={() => setShowCreate(true)}>+ اشتراك جديد</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          <div className="card-light overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f0ecf8]">
                  {['الطالب', 'الباقة', 'المعلم', 'تاريخ البدء', 'الانتهاء', 'الحصص المتبقية', 'الحالة', 'إجراءات'].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.data || []).map((sub) => (
                  <tr key={sub._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={sub.studentId?.avatar} name={`${sub.studentId?.firstNameAr}`} size="xs" />
                        <span className="text-sm font-semibold text-brand-textBody">{sub.studentId?.firstNameAr} {sub.studentId?.lastNameAr}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-textBody">{sub.packageId?.nameAr}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{sub.teacherId?.firstNameAr || '—'}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{formatDateAr(sub.startDate)}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{formatDateAr(sub.endDate)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-brand-textBody">{sub.sessionsRemaining || 0}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadge[sub.status] || 'gray'}>{statusLabel[sub.status] || sub.status}</Badge></td>
                    <td className="px-4 py-3">
                      {sub.status === 'active' && (
                        <button onClick={() => statusMutation.mutate({ id: sub._id, status: 'paused' })} className="text-xs text-amber-500 hover:text-amber-700 font-semibold">إيقاف</button>
                      )}
                      {sub.status === 'paused' && (
                        <button onClick={() => statusMutation.mutate({ id: sub._id, status: 'active' })} className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold">تفعيل</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && <div className="text-center py-12 text-[#9b7fd6]">لا توجد اشتراكات</div>}
          </div>
          {data?.totalPages > 1 && <div className="mt-4 flex justify-center"><Pagination current={page} total={data.totalPages} onChange={setPage} /></div>}
        </>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إنشاء اشتراك جديد" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>إنشاء</Button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-textBody mb-1">الطالب</label>
            <select value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} className="field-light w-full">
              <option value="">اختر طالباً</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.firstNameAr} {s.lastNameAr}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-textBody mb-1">الباقة</label>
            <select value={form.packageId} onChange={e => setForm(p => ({ ...p, packageId: e.target.value }))} className="field-light w-full">
              <option value="">اختر باقة</option>
              {packages.map(p => <option key={p._id} value={p._id}>{p.nameAr} — {p.price} ريال</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-textBody mb-1">المعلم</label>
            <select value={form.teacherId} onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))} className="field-light w-full">
              <option value="">اختر معلماً</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-textBody mb-1">تاريخ البدء</label>
            <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="field-light w-full" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
