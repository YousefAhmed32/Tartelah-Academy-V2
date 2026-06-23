import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import StatCard from '../../components/shared/StatCard.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr, formatTimeAr, isFuture } from '../../utils/date.js'
import { SESSION_STATUS, ATTENDANCE_STATUS } from '../../config/constants.js'

function useStudentDashboard() {
  return useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: () => api.get('/students/me/stats').then(r => r.data.data),
    placeholderData: {
      attendanceRate: 0,
      completedSessions: 0,
      pendingHomework: 0,
      subscriptionDaysLeft: 0,
      upcomingSessions: [],
      recentEvaluations: [],
      memorization: { surahsCompleted: 0, ayahsTotal: 0 },
    },
  })
}

export default function StudentDashboardPage() {
  const { user } = useAuthStore()
  const { data: stats, isLoading } = useStudentDashboard()

  const statCards = [
    { label: 'نسبة الحضور', value: `${stats?.attendanceRate || 0}%`, color: '#22c55e', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3 10h18M8 3v4M16 3v4M8 15l2.5 2.5L16 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: 'الحصص المكتملة', value: stats?.completedSessions || 0, color: '#7c3aed', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5 9-9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: 'واجبات معلقة', value: stats?.pendingHomework || 0, color: '#E8C76A', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 4h8l3 3v13H5V4h3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { label: 'أيام متبقية', value: stats?.subscriptionDaysLeft || 0, color: '#3b82f6', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> },
  ]

  return (
    <div dir="rtl">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-heading font-extrabold text-2xl text-brand-textBody">
          أهلاً، {user?.firstNameAr || user?.firstName} 👋
        </h1>
        <p className="text-[#9b7fd6] mt-1">تابع تقدمك في رحلتك مع القرآن الكريم</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions */}
        <div className="lg:col-span-2">
          <div className="card-light p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-lg text-brand-textBody">الحصص القادمة</h2>
              <a href="/student/sessions" className="text-sm font-semibold text-brand-purple hover:text-brand-purpleDark transition-colors">عرض الكل</a>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8"><Spinner color="border-brand-purple" /></div>
            ) : stats?.upcomingSessions?.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-[#9b7fd6] text-sm">لا توجد حصص قادمة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(stats?.upcomingSessions || []).slice(0, 4).map((session, i) => (
                  <SessionCard key={i} session={session} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="flex flex-col gap-4">
          {/* Memorization */}
          <div className="card-light p-6">
            <h2 className="font-heading font-bold text-base text-brand-textBody mb-4">تقدم الحفظ</h2>
            <div className="text-center mb-4">
              <div className="text-4xl font-heading font-extrabold text-brand-purple">
                {stats?.memorization?.surahsCompleted || 0}
              </div>
              <div className="text-sm text-[#9b7fd6] mt-1">سور محفوظة</div>
            </div>
            <div className="w-full bg-[#f0ecf8] rounded-full h-2">
              <div
                className="bg-purple-gradient h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((stats?.memorization?.surahsCompleted || 0) / 114) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[#9b7fd6] mt-2">
              <span>التقدم</span>
              <span>{Math.round(((stats?.memorization?.surahsCompleted || 0) / 114) * 100)}%</span>
            </div>
          </div>

          {/* Evaluations */}
          <div className="card-light p-6">
            <h2 className="font-heading font-bold text-base text-brand-textBody mb-4">آخر التقييمات</h2>
            {(stats?.recentEvaluations || []).length === 0 ? (
              <p className="text-sm text-[#9b7fd6] text-center py-4">لا توجد تقييمات حتى الآن</p>
            ) : (
              <div className="space-y-2.5">
                {(stats?.recentEvaluations || []).slice(0, 3).map((ev, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-brand-textBody">{ev.type}</span>
                    <span className="font-heading font-bold text-brand-purple text-base">{ev.score}/١٠</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionCard({ session }) {
  const status = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled
  return (
    <div className="flex items-center gap-4 p-4 rounded-[18px] border border-[#f0ecf8] hover:border-[#e0d8f5] transition-colors">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none" style={{ background: `${status.color}15` }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke={status.color} strokeWidth="1.7"/><path d="M3 9h18M8 3v4M16 3v4" stroke={status.color} strokeWidth="1.7" strokeLinecap="round"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-brand-textBody text-sm truncate">{session.titleAr || session.title}</div>
        <div className="text-xs text-[#9b7fd6] mt-0.5">
          {formatDateAr(session.scheduledAt)} • {formatTimeAr(session.scheduledAt)}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge variant={session.status === 'completed' ? 'gray' : 'purple'} className="text-xs">
          {status.label}
        </Badge>
        {session.meetingLink && isFuture(session.scheduledAt) && (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-brand-gold hover:text-brand-goldDark transition-colors"
          >
            انضم ←
          </a>
        )}
      </div>
    </div>
  )
}
