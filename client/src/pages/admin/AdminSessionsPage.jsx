import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { SESSION_STATUS } from '../../config/constants.js'

export default function AdminSessionsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sessions', page, status],
    queryFn: () => api.get(`/admin/sessions?page=${page}&limit=20${status ? `&status=${status}` : ''}`).then(r => r.data),
    placeholderData: { data: [], totalPages: 1 },
  })

  const statusOptions = [
    { key: '', label: 'الكل' },
    { key: 'scheduled', label: 'مجدولة' },
    { key: 'completed', label: 'مكتملة' },
    { key: 'cancelled', label: 'ملغاة' },
    { key: 'no_show', label: 'غياب' },
  ]

  const badgeVariant = { scheduled: 'purple', completed: 'success', cancelled: 'danger', no_show: 'warning' }

  return (
    <div dir="rtl">
      <PageHeader title="جميع الحصص" subtitle="متابعة ومراقبة الحصص" />

      <div className="flex gap-1 mb-5 p-1 bg-[#f0ecf8] rounded-xl w-fit">
        {statusOptions.map(s => (
          <button key={s.key} onClick={() => { setStatus(s.key); setPage(1) }}
            className={`px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-all ${status === s.key ? 'bg-white text-brand-textBody shadow-sm' : 'text-[#9b7fd6] hover:text-brand-textBody'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          <div className="card-light overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f0ecf8]">
                  {['العنوان', 'الطالب', 'المعلم', 'التاريخ', 'الوقت', 'المدة', 'الحالة'].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.data || []).map((s) => (
                  <tr key={s._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-brand-textBody">{s.titleAr || s.title}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{s.studentId?.firstNameAr} {s.studentId?.lastNameAr}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{s.teacherId?.firstNameAr} {s.teacherId?.lastNameAr}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{formatDateAr(s.scheduledAt)}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{formatTimeAr(s.scheduledAt)}</td>
                    <td className="px-4 py-3 text-sm text-[#9b7fd6]">{s.durationMinutes} د</td>
                    <td className="px-4 py-3"><Badge variant={badgeVariant[s.status] || 'gray'}>{SESSION_STATUS[s.status]?.label || s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && <div className="text-center py-12 text-[#9b7fd6]">لا توجد حصص</div>}
          </div>
          {data?.totalPages > 1 && <div className="mt-4 flex justify-center"><Pagination current={page} total={data.totalPages} onChange={setPage} /></div>}
        </>
      )}
    </div>
  )
}
