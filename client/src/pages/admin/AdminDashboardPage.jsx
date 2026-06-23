import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../utils/api.js'
import StatCard from '../../components/shared/StatCard.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { formatNumber, formatCurrency } from '../../utils/format.js'
import { ROUTES } from '../../config/constants.js'

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get('/admin/stats').then(r => r.data.data),
    placeholderData: {
      totalStudents: 0, totalTeachers: 0, totalSessions: 0, totalRevenue: 0,
      activeSubscriptions: 0, sessionsToday: 0,
      recentRegistrations: [], upcomingSessions: [], revenueByMonth: [],
    },
  })

  const cards = [
    { label: 'إجمالي الطلاب', value: formatNumber(stats?.totalStudents), color: '#7c3aed', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.7"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> },
    { label: 'المعلمون', value: formatNumber(stats?.totalTeachers), color: '#E8C76A', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M20 19c0-3.3-3.6-6-8-6s-8 2.7-8 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> },
    { label: 'الاشتراكات النشطة', value: formatNumber(stats?.activeSubscriptions), color: '#22c55e', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M16 6V4a2 2 0 0 0-4 0v2M3 10h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> },
    { label: 'الإيرادات (ريال)', value: formatCurrency(stats?.totalRevenue), color: '#3b82f6', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> },
  ]
  const pendingEnrollments = stats?.pendingEnrollments || 0

  return (
    <div dir="rtl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-heading font-extrabold text-2xl text-brand-textBody">لوحة الإدارة</h1>
        <p className="text-[#9b7fd6] mt-1">نظرة عامة على المنصة</p>
      </motion.div>

      {/* Pending enrollment alert */}
      {pendingEnrollments > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <Link to={ROUTES.ADMIN_ENROLLMENTS} className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-amber-400/40 hover:bg-amber-500/5 transition-colors" style={{ background: 'rgba(245,158,11,0.06)' }}>
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-none" />
            <span className="font-semibold text-amber-600">{pendingEnrollments} طلب تسجيل جديد يحتاج مراجعة</span>
            <svg className="mr-auto" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's sessions */}
        <div className="lg:col-span-2 card-light p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-brand-textBody text-lg">حصص اليوم</h2>
            <Badge variant="purple" dot>{stats?.sessionsToday || 0} حصة</Badge>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner color="border-brand-purple" /></div>
          ) : !stats?.upcomingSessions?.length ? (
            <div className="text-center py-8 text-[#9b7fd6] text-sm">لا توجد حصص لهذا اليوم</div>
          ) : (
            <div className="space-y-3">
              {stats.upcomingSessions.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f5ff]">
                  <Avatar src={s.studentId?.avatar} name={`${s.studentId?.firstNameAr}`} size="xs" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-brand-textBody">{s.studentId?.firstNameAr} - {s.teacherId?.firstNameAr}</span>
                    <div className="text-xs text-[#9b7fd6]">{formatTimeAr(s.scheduledAt)} • {s.durationMinutes} د</div>
                  </div>
                  <Badge variant="purple">{s.meetingProvider}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent registrations */}
        <div className="card-light p-6">
          <h2 className="font-heading font-bold text-brand-textBody text-lg mb-5">آخر التسجيلات</h2>
          {!stats?.recentRegistrations?.length ? (
            <div className="text-center py-6 text-[#9b7fd6] text-sm">لا توجد تسجيلات حديثة</div>
          ) : (
            <div className="space-y-3">
              {stats.recentRegistrations.slice(0, 5).map((u, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Avatar src={u.avatar} name={`${u.firstNameAr} ${u.lastNameAr}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-brand-textBody truncate">{u.firstNameAr} {u.lastNameAr}</div>
                    <div className="text-xs text-[#9b7fd6]">{formatDateAr(u.createdAt)}</div>
                  </div>
                  <Badge variant={u.role === 'teacher' ? 'gold' : 'purple'}>
                    {u.role === 'teacher' ? 'معلم' : 'طالب'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
