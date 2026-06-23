import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import StatCard from '../../components/shared/StatCard.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr, formatTimeAr, isFuture } from '../../utils/date.js'

export default function TeacherDashboardPage() {
  const { user } = useAuthStore()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['teacher', 'dashboard'],
    queryFn: () => api.get('/teachers/me/stats').then(r => r.data.data),
    placeholderData: {
      totalStudents: 0,
      sessionsToday: 0,
      pendingEvaluations: 0,
      completedThisMonth: 0,
      upcomingSessions: [],
      recentStudents: [],
    },
  })

  const statCards = [
    { label: 'الطلاب النشطون', value: stats?.totalStudents || 0, color: '#7c3aed', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> },
    { label: 'حصص اليوم', value: stats?.sessionsToday || 0, color: '#E8C76A', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> },
    { label: 'تقييمات معلقة', value: stats?.pendingEvaluations || 0, color: '#f59e0b', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16l-7-3-7 3V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg> },
    { label: 'حصص هذا الشهر', value: stats?.completedThisMonth || 0, color: '#22c55e', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5 9-9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  ]

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-heading font-extrabold text-2xl text-white">
          أهلاً، {user?.firstNameAr || user?.firstName} 👋
        </h1>
        <p style={{ color: '#b3a4d0' }} className="mt-1">إليك ملخص يومك التعليمي</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="rounded-card p-5 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: `${s.color}20`, color: s.color }}>
                {s.icon}
              </div>
              <div>
                <div className="font-heading font-extrabold text-2xl text-white">{s.value}</div>
                <div className="text-sm" style={{ color: '#b3a4d0' }}>{s.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming sessions */}
        <div className="lg:col-span-2 rounded-card p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-white text-lg">الحصص القادمة</h2>
            <a href="/teacher/sessions" className="text-sm font-semibold text-brand-gold hover:text-brand-goldDark">عرض الكل</a>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner color="border-brand-gold" /></div>
          ) : !stats?.upcomingSessions?.length ? (
            <div className="text-center py-8" style={{ color: '#b3a4d0' }}>لا توجد حصص قادمة</div>
          ) : (
            <div className="space-y-3">
              {stats.upcomingSessions.slice(0, 4).map((s) => (
                <div key={s._id} className="flex items-center gap-4 p-4 rounded-[14px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Avatar src={s.studentId?.avatar} name={`${s.studentId?.firstNameAr} ${s.studentId?.lastNameAr}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{s.studentId?.firstNameAr} {s.studentId?.lastNameAr}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#b3a4d0' }}>{formatDateAr(s.scheduledAt)} • {formatTimeAr(s.scheduledAt)}</div>
                  </div>
                  {s.meetingLink && isFuture(s.scheduledAt) && (
                    <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-brand-gold hover:text-brand-goldDark">ابدأ ←</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent students */}
        <div className="rounded-card p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="font-heading font-bold text-white text-lg mb-5">آخر الطلاب</h2>
          {!stats?.recentStudents?.length ? (
            <div className="text-center py-8" style={{ color: '#b3a4d0' }}>لا يوجد طلاب</div>
          ) : (
            <div className="space-y-3">
              {stats.recentStudents.slice(0, 5).map((st) => (
                <div key={st._id} className="flex items-center gap-3">
                  <Avatar src={st.avatar} name={`${st.firstNameAr} ${st.lastNameAr}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{st.firstNameAr} {st.lastNameAr}</div>
                    <div className="text-xs" style={{ color: '#b3a4d0' }}>{st.courseLevel}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
