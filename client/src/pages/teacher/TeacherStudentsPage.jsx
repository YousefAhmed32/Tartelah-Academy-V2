import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Users } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import { SkeletonCardGrid } from '../../components/ui/Skeleton.jsx'
import { toArray } from '../../utils/format.js'

export default function TeacherStudentsPage() {
  const [search, setSearch] = useState('')

  const { data: students = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => toArray(r.data?.data)),
  })

  const filtered = toArray(students).filter(s =>
    `${s.firstNameAr} ${s.lastNameAr} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="طلابي" subtitle={`${students.length} طالب مسجل`} />

      <div className="mb-5 max-w-sm">
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 end-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن طالب..."
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pe-10 ps-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonCardGrid count={6} />
      ) : isError ? (
        <ErrorState onRetry={refetch} isRetrying={isFetching} />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Users size={28} strokeWidth={1.6} />}
          title={search ? 'لا نتائج مطابقة' : 'لا يوجد طلاب بعد'}
          description={search ? `لم نجد طالباً باسم "${search}"` : 'سيظهر طلابك هنا بعد تعيينهم من قِبل الإدارة'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((st, i) => {
            const attendance = st.attendanceRate || 0
            const attendanceColor = attendance >= 80 ? '#22c55e' : attendance >= 60 ? '#f59e0b' : '#ef4444'
            return (
              <motion.div
                key={st._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                whileHover={{ y: -3, boxShadow: '0 12px 28px rgba(15,23,42,0.08)' }}
                className="rounded-2xl p-5 transition-all bg-white border border-gray-100 shadow-sm"
              >
                <div className="flex items-start gap-3 mb-4">
                  <Avatar src={st.avatar} firstName={st.firstNameAr} lastName={st.lastNameAr} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-gray-900 truncate">{st.firstNameAr} {st.lastNameAr}</div>
                    <div className="text-xs mt-0.5 truncate text-gray-500">{st.email}</div>
                    <div className="mt-2">
                      <Badge variant="purple">{st.courseLevel || 'مبتدئ'}</Badge>
                    </div>
                  </div>
                </div>

                {/* Attendance bar */}
                <div className="mt-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-500">نسبة الحضور</span>
                    <span className="text-xs font-bold" style={{ color: attendanceColor }}>{attendance}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${attendance}%`, background: attendanceColor }}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
