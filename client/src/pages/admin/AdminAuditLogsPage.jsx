import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { formatDateTimeAr } from '../../utils/date.js'

const ACTION_LABELS = {
  update_student: { label: 'تعديل طالب', badge: 'purple' },
  deactivate_student: { label: 'إيقاف طالب', badge: 'danger' },
  update_teacher: { label: 'تعديل معلم', badge: 'purple' },
  reset_password: { label: 'إعادة كلمة المرور', badge: 'warning' },
  update_evaluation: { label: 'تعديل تقييم', badge: 'purple' },
  delete_evaluation: { label: 'حذف تقييم', badge: 'danger' },
  cancel_session: { label: 'إلغاء حصة', badge: 'danger' },
  update_attendance: { label: 'تعديل حضور', badge: 'purple' },
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1)
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page, entity, action],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 30 })
      if (entity) p.set('entity', entity)
      if (action) p.set('action', action)
      return api.get(`/admin/audit-logs?${p}`).then(r => r.data)
    },
    placeholderData: (prev) => prev,
  })

  const logs = data?.data || []

  return (
    <div dir="rtl">
      <PageHeader title="سجل الأنشطة" subtitle={`${data?.total || 0} حدث مسجل`}
        actions={<Shield size={16} className="text-violet-400" />} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={entity} onChange={e => { setEntity(e.target.value); setPage(1) }} className="field-light h-9 text-sm px-3">
          <option value="">كل الكيانات</option>
          <option value="User">المستخدمون</option>
          <option value="Session">الحصص</option>
          <option value="Evaluation">التقييمات</option>
          <option value="Attendance">الحضور</option>
          <option value="Subscription">الاشتراكات</option>
        </select>
        <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }} className="field-light h-9 text-sm px-3">
          <option value="">كل الإجراءات</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          <div className="card-light overflow-hidden">
            {!logs.length ? (
              <div className="text-center py-12 text-[#9b7fd6]">
                <Shield size={36} className="mx-auto mb-3 opacity-40" />
                لا توجد أنشطة مسجلة
              </div>
            ) : (
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#f0ecf8]">
                    {['الوقت', 'المنفذ', 'الإجراء', 'الكيان', 'IP'].map(h => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const cfg = ACTION_LABELS[log.action] || { label: log.action, badge: 'gray' }
                    return (
                      <tr key={log._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff]">
                        <td className="px-4 py-3 text-xs text-[#9b7fd6] whitespace-nowrap">{formatDateTimeAr(log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-brand-textBody">{log.actorId?.firstNameAr} {log.actorId?.lastNameAr}</div>
                          <div className="text-xs text-[#9b7fd6]">{log.actorRole}</div>
                        </td>
                        <td className="px-4 py-3"><Badge variant={cfg.badge}>{cfg.label}</Badge></td>
                        <td className="px-4 py-3 text-sm text-[#9b7fd6]">{log.entity} {log.entityId ? `#${log.entityId.toString().slice(-6)}` : ''}</td>
                        <td className="px-4 py-3 text-xs text-[#9b7fd6] font-mono">{log.ip || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
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
