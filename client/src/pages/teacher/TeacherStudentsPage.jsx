import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'

export default function TeacherStudentsPage() {
  const [search, setSearch] = useState('')

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => r.data.data),
  })

  const filtered = students.filter(s =>
    `${s.firstNameAr} ${s.lastNameAr} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="طلابي" subtitle={`${students.length} طالب مسجل`} />

      <div className="mb-5 max-w-sm">
        <div className="relative">
          <span className="absolute top-1/2 -translate-y-1/2 end-4 pointer-events-none" style={{ color: '#9888bd' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث عن طالب..."
            className="field w-full pe-12"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !filtered.length ? (
        <EmptyState
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.7"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/></svg>}
          title={search ? 'لا نتائج مطابقة' : 'لا يوجد طلاب بعد'}
          description={search ? `لم نجد طالباً باسم "${search}"` : 'سيظهر طلابك هنا بعد تعيينهم من قِبل الإدارة'}
          dark
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((st) => {
            const attendance = st.attendanceRate || 0
            const attendanceColor = attendance >= 80 ? '#22c55e' : attendance >= 60 ? '#f59e0b' : '#ef4444'
            return (
              <div
                key={st._id}
                className="rounded-card p-5 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <Avatar src={st.avatar} name={`${st.firstNameAr} ${st.lastNameAr}`} size="md" ring />
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-white truncate">{st.firstNameAr} {st.lastNameAr}</div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: '#b3a4d0' }}>{st.email}</div>
                    <div className="mt-2">
                      <Badge variant="purple">{st.courseLevel || 'مبتدئ'}</Badge>
                    </div>
                  </div>
                </div>

                {/* Attendance bar */}
                <div className="mt-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs" style={{ color: '#b3a4d0' }}>نسبة الحضور</span>
                    <span className="text-xs font-bold" style={{ color: attendanceColor }}>{attendance}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${attendance}%`, background: attendanceColor }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
