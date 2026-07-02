import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ClipboardList, Search, TrendingUp } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import { SkeletonRows } from '../../components/ui/Skeleton.jsx'
import { formatDateAr } from '../../utils/date.js'
import { toArray } from '../../utils/format.js'
import { ATTENDANCE_STATUS } from '../../config/constants.js'
import { ROUTES } from '../../config/constants.js'

export default function TeacherAttendancePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: records = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['attendance', 'teacher'],
    queryFn: () => api.get('/attendance/teacher').then(r => toArray(r.data?.data)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/attendance/${id}`, { status }),
    onSuccess: () => {
      toast.success('تم تحديث سجل الحضور')
      qc.invalidateQueries({ queryKey: ['attendance', 'teacher'] })
    },
    onError: () => toast.error('حدث خطأ'),
  })

  const filtered = useMemo(() => {
    return toArray(records).filter(rec => {
      if (statusFilter && rec.status !== statusFilter) return false
      if (search.trim()) {
        const name = `${rec.studentId?.firstNameAr || ''} ${rec.studentId?.lastNameAr || ''} ${rec.sessionId?.titleAr || ''}`.toLowerCase()
        if (!name.includes(search.trim().toLowerCase())) return false
      }
      return true
    })
  }, [records, search, statusFilter])

  return (
    <div>
      <PageHeader
        title="سجل الحضور"
        subtitle="متابعة حضور وغياب الطلاب في الحصص"
        actions={
          <Link to={ROUTES.TEACHER_PERFORMANCE}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100">
            <TrendingUp size={13} /> حضورك أنت والراتب
          </Link>
        }
      />

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search size={15} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الحصة..."
            className="w-full h-10 rounded-xl pe-10 ps-4 text-sm outline-none transition-all bg-gray-50 border border-gray-200 text-gray-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!statusFilter ? 'bg-violet-100 text-violet-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            الكل
          </button>
          {Object.entries(ATTENDANCE_STATUS).map(([key, info]) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: statusFilter === key ? `${info.color}18` : '#f9fafb',
                color: statusFilter === key ? info.color : '#6b7280',
              }}>
              {info.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows count={6} />
      ) : isError ? (
        <ErrorState onRetry={refetch} isRetrying={isFetching} />
      ) : !filtered.length ? (
        <EmptyState
          icon={<ClipboardList size={28} strokeWidth={1.6} />}
          title={search || statusFilter ? 'لا نتائج مطابقة' : 'لا توجد سجلات حضور بعد'}
          description={search || statusFilter ? 'جرّب تغيير البحث أو الفلتر' : 'ستظهر سجلات حضور طلابك هنا بعد إكمال الحصص'}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((rec, i) => (
            <motion.div
              key={rec._id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              whileHover={{ y: -2, boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}
              className="rounded-2xl p-4 sm:p-5 flex items-center gap-4 flex-wrap transition-all bg-white border border-gray-100 shadow-sm"
            >
              <Avatar src={rec.studentId?.avatar} firstName={rec.studentId?.firstNameAr} lastName={rec.studentId?.lastNameAr} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 font-semibold text-sm">{rec.studentId?.firstNameAr} {rec.studentId?.lastNameAr}</div>
                <div className="text-xs mt-0.5 text-gray-500">
                  {rec.sessionId?.titleAr} • {formatDateAr(rec.sessionId?.scheduledAt)}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(ATTENDANCE_STATUS).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => updateMutation.mutate({ id: rec._id, status: key })}
                    disabled={updateMutation.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50"
                    style={rec.status === key
                      ? { background: `${info.color}18`, color: info.color, border: `1px solid ${info.color}45` }
                      : { border: '1px solid #e5e7eb', color: '#9ca3af', background: 'transparent' }}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
