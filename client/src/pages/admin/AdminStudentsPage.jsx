import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDateAr } from '../../utils/date.js'

export default function AdminStudentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students', page, search],
    queryFn: () => api.get(`/admin/students?page=${page}&limit=15&search=${search}`).then(r => r.data),
    placeholderData: { data: [], totalPages: 1 },
    keepPreviousData: true,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/students/${id}`, { isActive }),
    onSuccess: () => { toast.success('تم تحديث الحالة'); qc.invalidateQueries({ queryKey: ['admin', 'students'] }) },
    onError: () => toast.error('حدث خطأ'),
  })

  return (
    <div dir="rtl">
      <PageHeader title="الطلاب" subtitle={`${data?.total || 0} طالب مسجل`} />

      <div className="flex items-center gap-3 mb-5">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="بحث بالاسم أو البريد..." className="field-light flex-1 max-w-sm" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          <div className="card-light overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f0ecf8]">
                  {['الطالب', 'البريد الإلكتروني', 'تاريخ التسجيل', 'المعلم', 'الحالة', 'إجراءات'].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.data || []).map((st) => (
                  <tr key={st._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={st.avatar} name={`${st.firstNameAr} ${st.lastNameAr}`} size="sm" />
                        <span className="font-semibold text-brand-textBody text-sm">{st.firstNameAr} {st.lastNameAr}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{st.email}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{formatDateAr(st.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{st.teacherId?.firstNameAr || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={st.isActive ? 'success' : 'gray'}>{st.isActive ? 'نشط' : 'موقوف'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleMutation.mutate({ id: st._id, isActive: !st.isActive })} className="text-xs font-semibold text-brand-purple hover:text-brand-purpleDark transition-colors">
                        {st.isActive ? 'إيقاف' : 'تفعيل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && <div className="text-center py-12 text-[#9b7fd6]">لا توجد نتائج</div>}
          </div>
          {data?.totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination current={page} total={data.totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
