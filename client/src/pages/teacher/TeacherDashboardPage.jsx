import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Calendar, Star, FileText } from 'lucide-react'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { ROUTES } from '../../config/constants.js'

function useCountdown(targetDate) {
  const [time, setTime] = useState({ h: '--', m: '--', s: '--', expired: false })
  useEffect(() => {
    if (!targetDate) return
    function tick() {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) { setTime({ h: '00', m: '00', s: '00', expired: true }); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTime({
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
        expired: false,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return time
}

function getArabicDate() {
  return new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function QuickActionBtn({ Icon, label, onClick, color = '#7c3aed' }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all flex-1 text-center"
      style={{ background: `${color}15`, borderColor: `${color}30`, color }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}25` }}>
        <Icon size={20} strokeWidth={1.8} color={color} />
      </div>
      <span className="font-semibold text-xs text-white/80">{label}</span>
    </motion.button>
  )
}

function NextSessionCard({ session }) {
  const countdown = useCountdown(session?.scheduledAt)

  if (!session) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(124,58,237,0.15)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-brand-purple"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <p className="text-white font-semibold mb-1">لا توجد حصص مجدولة</p>
        <p className="text-sm mb-4" style={{ color: '#b3a4d0' }}>قم بإنشاء حصة جديدة لطلابك</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #3b1a7a 0%, #2a1060 100%)', border: '1px solid rgba(124,58,237,0.4)' }}
    >
      <div className="absolute top-0 end-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', transform: 'translate(30%, -30%)' }} />

      <div className="flex items-start gap-4 mb-5 relative">
        <Avatar src={session.studentId?.avatar} name={`${session.studentId?.firstNameAr} ${session.studentId?.lastNameAr}`} size="md" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold mb-1" style={{ color: '#E8C76A' }}>الحصة القادمة</div>
          <div className="text-white font-heading font-bold text-base truncate">{session.titleAr}</div>
          <div className="text-sm mt-0.5" style={{ color: '#b3a4d0' }}>
            {session.studentId?.firstNameAr} {session.studentId?.lastNameAr}
          </div>
          <div className="text-xs mt-1" style={{ color: '#9380c0' }}>
            {formatDateAr(session.scheduledAt)} • {formatTimeAr(session.scheduledAt)}
          </div>
        </div>
      </div>

      {countdown.expired ? (
        <div className="text-center text-sm font-bold text-emerald-400 mb-4">الحصة جارية الآن</div>
      ) : (
        <div className="flex items-center justify-center gap-3 mb-5">
          {[
            { value: countdown.h, label: 'ساعة' },
            { value: countdown.m, label: 'دقيقة' },
            { value: countdown.s, label: 'ثانية' },
          ].map(({ value, label }, i) => (
            <div key={i} className="text-center">
              <div className="font-heading font-extrabold text-3xl text-white w-14 h-14 flex items-center justify-center rounded-xl" style={{ background: 'rgba(0,0,0,0.25)' }}>
                {value}
              </div>
              <div className="text-[10px] mt-1" style={{ color: '#9380c0' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {session.meetingLink && (
        <a
          href={session.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold w-full text-center flex items-center justify-center gap-2 rounded-xl py-2.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 10l5-5M15 10h4V6M10 9a5 5 0 0 0-5 5v2m9-7V5m0 9v2M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ابدأ الحصة
        </a>
      )}
    </div>
  )
}

function ActionItem({ icon, title, count, color, onClick }) {
  if (!count) return null
  return (
    <motion.button
      whileHover={{ x: -3 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-start"
      style={{ background: `${color}12`, border: `1px solid ${color}25` }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: `${color}25`, color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm">{title}</div>
      </div>
      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${color}30`, color }}>
        {count}
      </span>
    </motion.button>
  )
}

export default function TeacherDashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['teacher', 'dashboard'],
    queryFn: () => api.get('/teachers/me/stats').then(r => r.data.data),
    placeholderData: {
      totalStudents: 0, sessionsToday: 0, pendingEvaluations: 0, completedThisMonth: 0,
      upcomingSessions: [], recentStudents: [],
    },
  })

  const { data: scheduleRules = [] } = useQuery({
    queryKey: ['teacher', 'schedule-rules'],
    queryFn: () => api.get('/schedule-rules/my').then(r => r.data.data),
    enabled: !isLoading,
  })

  const nextSession = stats?.upcomingSessions?.[0] || null
  const hasActions = stats?.pendingEvaluations > 0 || stats?.sessionsToday > 0

  // Students without a schedule rule
  const scheduledStudentIds = new Set(scheduleRules.map(r => r.studentId?._id || r.studentId))
  const unscheduledCount = (stats?.recentStudents || []).filter(s => !scheduledStudentIds.has(s._id)).length

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner color="border-brand-gold" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#E8C76A' }}>{getArabicDate()}</p>
        <h1 className="font-heading font-extrabold text-2xl text-white">
          أهلاً، {user?.firstNameAr || user?.firstName}
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#b3a4d0' }}>
          {hasActions ? 'لديك مهام تنتظرك اليوم' : 'يومك التعليمي هادئ اليوم — أحسنت!'}
        </p>
      </motion.div>

      {/* Unscheduled students alert */}
      {unscheduledCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate(ROUTES.TEACHER_SESSIONS)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
          style={{ background: 'rgba(232,199,106,0.1)', border: '1px solid rgba(232,199,106,0.25)' }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ background: 'rgba(232,199,106,0.2)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: '#E8C76A' }}>
              <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: '#E8C76A' }}>
            {unscheduledCount} {unscheduledCount === 1 ? 'طالب بدون' : 'طلاب بدون'} جدول دوري — انقر لإنشاء جدول
          </span>
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left Column: Next Session + Quick Actions */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-bold text-white text-base">الحصة القادمة</h2>
              <button onClick={() => navigate(ROUTES.TEACHER_SESSIONS)} className="text-xs font-semibold hover:text-brand-gold transition-colors" style={{ color: '#E8C76A' }}>
                كل الحصص ←
              </button>
            </div>
            <NextSessionCard session={nextSession} />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="font-heading font-bold text-white text-base mb-3">إجراء سريع</h2>
            <div className="flex gap-3">
              <QuickActionBtn
                Icon={Calendar}
                label="حصة جديدة"
                onClick={() => navigate(ROUTES.TEACHER_SESSIONS)}
                color="#7c3aed"
              />
              <QuickActionBtn
                Icon={Star}
                label="تقييم"
                onClick={() => navigate(ROUTES.TEACHER_EVALUATIONS)}
                color="#E8C76A"
              />
              <QuickActionBtn
                Icon={FileText}
                label="واجب"
                onClick={() => navigate(ROUTES.TEACHER_HOMEWORK)}
                color="#22c55e"
              />
            </div>
          </div>

          {/* Action Queue */}
          {(hasActions || unscheduledCount > 0) && (
            <div>
              <h2 className="font-heading font-bold text-white text-base mb-3 flex items-center gap-2">
                يحتاج اهتمامك
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </h2>
              <div className="space-y-2.5">
                <ActionItem
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                  title="طلاب بدون جدول دوري"
                  count={unscheduledCount}
                  color="#E8C76A"
                  onClick={() => navigate(ROUTES.TEACHER_SESSIONS)}
                />
                <ActionItem
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16l-7-3-7 3V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
                  title="تقييمات معلقة"
                  count={stats?.pendingEvaluations}
                  color="#f59e0b"
                  onClick={() => navigate(ROUTES.TEACHER_EVALUATIONS)}
                />
                <ActionItem
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                  title="حصص اليوم"
                  count={stats?.sessionsToday}
                  color="#7c3aed"
                  onClick={() => navigate(ROUTES.TEACHER_SESSIONS)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Stats + Students + Sessions */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'طلابي', value: stats?.totalStudents || 0, color: '#7c3aed' },
              { label: 'حصص هذا الشهر', value: stats?.completedThisMonth || 0, color: '#22c55e' },
              { label: 'تقييمات معلقة', value: stats?.pendingEvaluations || 0, color: '#f59e0b' },
              { label: 'حصص اليوم', value: stats?.sessionsToday || 0, color: '#E8C76A' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="font-heading font-extrabold text-3xl mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs" style={{ color: '#b3a4d0' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Upcoming Sessions */}
          <div className="rounded-2xl p-5 flex-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-white text-base">الحصص القادمة</h2>
              <button onClick={() => navigate(ROUTES.TEACHER_SESSIONS)} className="text-xs font-semibold" style={{ color: '#E8C76A' }}>
                عرض الكل ←
              </button>
            </div>
            {!stats?.upcomingSessions?.length ? (
              <div className="text-center py-8" style={{ color: '#b3a4d0' }}>
                <Calendar size={32} strokeWidth={1.4} color="#b3a4d0" className="mb-2" />
                <p className="text-sm">لا توجد حصص مجدولة</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.upcomingSessions.slice(0, 5).map((s, i) => (
                  <motion.div
                    key={s._id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3.5 p-3.5 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Avatar src={s.studentId?.avatar} name={`${s.studentId?.firstNameAr} ${s.studentId?.lastNameAr}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">{s.titleAr}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: '#b3a4d0' }}>
                        <span>{s.studentId?.firstNameAr}</span>
                        <span>•</span>
                        <span>{formatDateAr(s.scheduledAt)}</span>
                        <span>{formatTimeAr(s.scheduledAt)}</span>
                      </div>
                    </div>
                    {s.meetingLink && (
                      <a href={s.meetingLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                        style={{ background: 'rgba(232,199,106,0.15)', color: '#E8C76A', border: '1px solid rgba(232,199,106,0.25)' }}>
                        انضم
                      </a>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Students */}
          {!!stats?.recentStudents?.length && (
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-bold text-white text-base">طلابي ({stats.totalStudents})</h2>
                <button onClick={() => navigate(ROUTES.TEACHER_STUDENTS)} className="text-xs font-semibold" style={{ color: '#E8C76A' }}>
                  عرض الكل ←
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {stats.recentStudents.slice(0, 6).map((st) => (
                  <div key={st._id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Avatar src={st.avatar} name={`${st.firstNameAr} ${st.lastNameAr}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-semibold truncate">{st.firstNameAr}</div>
                      <div className="text-[10px] truncate" style={{ color: '#9380c0' }}>{st.courseLevel || 'مبتدئ'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
