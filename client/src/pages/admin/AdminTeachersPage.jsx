import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Input from '../../components/ui/Input.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDateAr } from '../../utils/date.js'

export default function AdminTeachersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ firstNameAr: '', lastNameAr: '', email: '', password: '', phone: '', specialization: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'teachers', page, search],
    queryFn: () => api.get(`/admin/teachers?page=${page}&limit=15&search=${search}`).then(r => r.data),
    placeholderData: { data: [], totalPages: 1 },
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/admin/teachers', { ...data, role: 'teacher' }),
    onSuccess: () => {
      toast.success('تم إنشاء حساب المعلم بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      setShowCreate(false)
      setForm({ firstNameAr: '', lastNameAr: '', email: '', password: '', phone: '', specialization: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/teachers/${id}`, { isActive }),
    onSuccess: () => { toast.success('تم تحديث الحالة'); qc.invalidateQueries({ queryKey: ['admin', 'teachers'] }) },
    onError: () => toast.error('حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  return (
    <div dir="rtl">
      <PageHeader
        title="المعلمون"
        subtitle={`${data?.total || 0} معلم`}
        actions={<Button variant="purple" onClick={() => setShowCreate(true)}>+ إضافة معلم</Button>}
      />

      <div className="flex items-center gap-3 mb-5">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="بحث عن معلم..." className="field-light flex-1 max-w-sm" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          <div className="card-light overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f0ecf8]">
                  {['المعلم', 'البريد الإلكتروني', 'التخصص', 'عدد الطلاب', 'تاريخ الانضمام', 'الحالة', 'إجراءات'].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.data || []).map((t) => (
                  <tr key={t._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={t.avatar} name={`${t.firstNameAr} ${t.lastNameAr}`} size="sm" />
                        <span className="font-semibold text-brand-textBody text-sm">{t.firstNameAr} {t.lastNameAr}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{t.email}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{t.specialization || '—'}</td>
                    <td className="px-4 py-3 text-sm text-brand-textBody font-semibold">{t.studentCount || 0}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{formatDateAr(t.createdAt)}</td>
                    <td className="px-4 py-3"><Badge variant={t.isActive ? 'success' : 'gray'}>{t.isActive ? 'نشط' : 'موقوف'}</Badge></td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleMutation.mutate({ id: t._id, isActive: !t.isActive })} className="text-xs font-semibold text-brand-purple hover:text-brand-purpleDark">
                        {t.isActive ? 'إيقاف' : 'تفعيل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && <div className="text-center py-12 text-[#9b7fd6]">لا توجد نتائج</div>}
          </div>
          {data?.totalPages > 1 && <div className="mt-4 flex justify-center"><Pagination current={page} total={data.totalPages} onChange={setPage} /></div>}
        </>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إضافة معلم جديد" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>إنشاء الحساب</Button>
        </>}
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
