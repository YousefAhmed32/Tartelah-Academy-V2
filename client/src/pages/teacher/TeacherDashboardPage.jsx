import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Calendar, Star, FileText, TrendingUp, ChevronLeft, Video, ExternalLink, Check, AlertCircle } from 'lucide-react'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import FinishSessionModal from '../../components/teacher/FinishSessionModal.jsx'
import LatestNotificationsWidget from '../../components/shared/LatestNotificationsWidget.jsx'
import { useElapsed } from '../../hooks/useElapsed.js'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { toArray } from '../../utils/format.js'
import { ROUTES, getFileUrl } from '../../config/constants.js'

const DEFAULT_STATS = {
  totalStudents: 0, sessionsToday: 0, pendingEvaluations: 0, completedThisMonth: 0,
  upcomingSessions: [], recentStudents: [], needsAttention: 0,
  currentSession: null, ongoingCount: 0,
}

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
      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all flex-1 text-center bg-white"
      style={{ borderColor: `${color}25` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={20} strokeWidth={1.8} color={color} />
      </div>
      <span className="font-semibold text-xs text-gray-700">{label}</span>
    </motion.button>
  )
}

function NextSessionCard({ session }) {
  const countdown = useCountdown(session?.scheduledAt)
  const qc = useQueryClient()

  const startMutation = useMutation({
    mutationFn: () => api.patch(`/sessions/${session._id}/start`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      if (res.data.data.teacherAttendanceStatus === 'late') {
        toast('بدأت الحصة متأخراً — تم تسجيل ذلك في سجل حضورك', { icon: '⏱️' })
      }
    },
  })

  if (!session) {
    return (
      <div className="rounded-2xl p-6 text-center bg-white border-2 border-dashed border-gray-200">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-violet-50">
          <Calendar size={20} strokeWidth={1.8} className="text-violet-600" />
        </div>
        <p className="text-gray-900 font-semibold mb-1">لا توجد حصص مجدولة</p>
        <p className="text-sm text-gray-500 mb-1">قم بإنشاء حصة جديدة لطلابك</p>
      </div>
    )
  }

  const canCheckIn = ['scheduled', 'missed', 'no_show'].includes(session.status)

  function handleJoin() {
    if (canCheckIn) startMutation.mutate()
    api.post(`/sessions/${session._id}/link-opened`).catch(() => {})
    window.open(session.meetingLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="rounded-2xl p-6 relative overflow-hidden bg-white border border-gray-100 shadow-sm">
      <div className="absolute top-0 end-0 w-32 h-32 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', transform: 'translate(30%, -30%)' }} />

      <div className="flex items-start gap-4 mb-5 relative">
        <Avatar src={getFileUrl(session.studentId?.avatar)} firstName={session.studentId?.firstNameAr} lastName={session.studentId?.lastNameAr} size="md" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold mb-1 text-violet-600">الحصة القادمة</div>
          <div className="text-gray-900 font-heading font-bold text-base truncate">{session.titleAr}</div>
          <div className="text-sm mt-0.5 text-gray-500">
            {session.studentId?.firstNameAr} {session.studentId?.lastNameAr}
          </div>
          <div className="text-xs mt-1 text-gray-400">
            {formatDateAr(session.scheduledAt)} • {formatTimeAr(session.scheduledAt)}
          </div>
        </div>
      </div>

      {countdown.expired ? (
        <div className="text-center text-sm font-bold text-emerald-600 mb-4">الحصة جارية الآن</div>
      ) : (
        <div className="flex items-center justify-center gap-3 mb-5">
          {[
            { value: countdown.h, label: 'ساعة' },
            { value: countdown.m, label: 'دقيقة' },
            { value: countdown.s, label: 'ثانية' },
          ].map(({ value, label }, i) => (
            <div key={i} className="text-center">
              <div className="font-heading font-extrabold text-3xl text-gray-900 w-14 h-14 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100">
                {value}
              </div>
              <div className="text-[10px] mt-1 text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      )}

      {session.meetingLink && (
        <button
          onClick={handleJoin}
          disabled={startMutation.isPending}
          className="btn-gold w-full text-center flex items-center justify-center gap-2 rounded-xl py-2.5 disabled:opacity-60"
        >
          <Video size={16} strokeWidth={1.8} />
          {canCheckIn ? 'تسجيل الحضور وفتح الفصل' : 'فتح الفصل الخارجي'}
        </button>
      )}
    </div>
  )
}

// Replaces NextSessionCard the moment a session is `ongoing` — same slot on
// the Home Dashboard, so the teacher never has to leave the page to manage a
// live lesson. Reuses the exact same /sessions/:id/finish workflow (via the
// shared FinishSessionModal) as the Sessions page — no duplicated logic.
function CurrentSessionCard({ session, ongoingCount }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showFinish, setShowFinish] = useState(false)
  const elapsed = useElapsed(session.teacherStartedAt)

  const linkOpenMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${session._id}/link-opened`),
  })

  function handleOpenLink() {
    linkOpenMutation.mutate()
    if (session.meetingLink) window.open(session.meetingLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className="rounded-2xl p-6 relative overflow-hidden bg-white shadow-sm" style={{ border: '1.5px solid #22c55e' }}>
        <div className="absolute top-0 end-0 w-32 h-32 rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, #22c55e, transparent)', transform: 'translate(30%, -30%)' }} />

        <div className="flex items-start gap-4 mb-4 relative">
          <Avatar src={getFileUrl(session.studentId?.avatar)} firstName={session.studentId?.firstNameAr} lastName={session.studentId?.lastNameAr} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold mb-1 text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> الحصة جارية الآن
            </div>
            <div className="text-gray-900 font-heading font-bold text-base truncate">{session.titleAr}</div>
            <div className="text-sm mt-0.5 text-gray-500">
              {session.studentId?.firstNameAr} {session.studentId?.lastNameAr}
            </div>
            <div className="text-xs mt-1 text-gray-400">
              الموعد: {formatTimeAr(session.scheduledAt)}
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-4 flex items-center justify-center gap-8" style={{ background: 'rgba(34,197,94,0.08)' }}>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 mb-0.5">بدأت الساعة</div>
            <div className="font-heading font-bold text-gray-900">{formatTimeAr(session.teacherStartedAt)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500 mb-0.5">المدة الحالية</div>
            <div className="font-heading font-extrabold text-lg text-emerald-700 tabular-nums">{elapsed}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFinish(true)}
            className="flex-1 py-3 rounded-xl text-sm font-extrabold text-white transition-all flex items-center justify-center gap-2"
            style={{ background: '#16a34a' }}
          >
            <Check size={16} strokeWidth={2.5} /> إنهاء الحصة
          </button>
          {session.meetingLink && (
            <button
              onClick={handleOpenLink}
              className="py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
            >
              <ExternalLink size={15} strokeWidth={1.8} /> فتح رابط الحصة
            </button>
          )}
        </div>

        {ongoingCount > 1 && (
          <button
            onClick={() => navigate(ROUTES.TEACHER_SESSIONS)}
            className="w-full mt-3 text-center text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            عرض كل الحصص الجارية ({ongoingCount})
          </button>
        )}
      </div>

      {showFinish && (
        <FinishSessionModal session={session} onClose={() => setShowFinish(false)} qc={qc} />
      )}
    </>
  )
}

function ActionItem({ icon, title, count, color, onClick }) {
  if (!count) return null
  return (
    <motion.button
      whileHover={{ x: -3 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-start bg-white border"
      style={{ borderColor: `${color}25` }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-gray-800 font-semibold text-sm">{title}</div>
      </div>
      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${color}18`, color }}>
        {count}
      </span>
    </motion.button>
  )
}

export default function TeacherDashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: stats = DEFAULT_STATS, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['teacher', 'dashboard'],
    queryFn: () => api.get('/teachers/me/stats').then(r => {
      const d = r.data?.data || {}
      return {
        totalStudents: d.totalStudents || 0,
        sessionsToday: d.sessionsToday || 0,
        pendingEvaluations: d.pendingEvaluations || 0,
        completedThisMonth: d.completedThisMonth || 0,
        upcomingSessions: toArray(d.upcomingSessions),
        recentStudents: toArray(d.recentStudents),
        needsAttention: d.needsAttention || 0,
        currentSession: d.currentSession || null,
        ongoingCount: d.ongoingCount || 0,
      }
    }),
    placeholderData: DEFAULT_STATS,
  })

  const { data: scheduleRules = [] } = useQuery({
    queryKey: ['teacher', 'schedule-rules'],
    queryFn: () => api.get('/schedule-rules/my').then(r => toArray(r.data?.data)),
    enabled: !isLoading,
  })

  const nextSession = stats?.upcomingSessions?.[0] || null
  const currentSession = stats?.currentSession || null
  const hasActions = stats?.pendingEvaluations > 0 || stats?.sessionsToday > 0 || stats?.needsAttention > 0

  // Students without a schedule rule
  const scheduledStudentIds = new Set(toArray(scheduleRules).map(r => r.studentId?._id || r.studentId))
  const unscheduledCount = toArray(stats?.recentStudents).filter(s => !scheduledStudentIds.has(s._id)).length

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner color="border-brand-purple" />
    </div>
  )

  if (isError) return <ErrorState onRetry={refetch} isRetrying={isFetching} />

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold mb-1 text-violet-600">{getArabicDate()}</p>
        <h1 className="font-heading font-extrabold text-2xl text-gray-900">
          أهلاً، {user?.firstNameAr || user?.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {hasActions ? 'لديك مهام تنتظرك اليوم' : 'يومك التعليمي هادئ اليوم — أحسنت!'}
        </p>
      </motion.div>

      {/* Unscheduled students alert */}
      {unscheduledCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate(ROUTES.TEACHER_SESSIONS)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all bg-amber-50 border border-amber-200 hover:bg-amber-100"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none bg-amber-100">
            <Calendar size={15} strokeWidth={1.8} className="text-amber-600" />
          </div>
          <span className="text-sm font-bold text-amber-700">
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
              <h2 className="font-heading font-bold text-gray-900 text-base">{currentSession ? 'الحصة الجارية' : 'الحصة القادمة'}</h2>
              <button onClick={() => navigate(ROUTES.TEACHER_SESSIONS)} className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                كل الحصص <ChevronLeft size={12} />
              </button>
            </div>
            {currentSession ? (
              <CurrentSessionCard session={currentSession} ongoingCount={stats.ongoingCount} />
            ) : (
              <NextSessionCard session={nextSession} />
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="font-heading font-bold text-gray-900 text-base mb-3">إجراء سريع</h2>
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
                color="#d97706"
              />
              <QuickActionBtn
                Icon={FileText}
                label="واجب"
                onClick={() => navigate(ROUTES.TEACHER_HOMEWORK)}
                color="#22c55e"
              />
              <QuickActionBtn
                Icon={TrendingUp}
                label="أدائي"
                onClick={() => navigate(ROUTES.TEACHER_PERFORMANCE)}
                color="#3b82f6"
              />
            </div>
          </div>

          {/* Latest Notifications */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <LatestNotificationsWidget role="teacher" viewAllPath={ROUTES.TEACHER_NOTIFICATIONS} />
          </motion.div>

          {/* Action Queue */}
          {(hasActions || unscheduledCount > 0) && (
            <div>
              <h2 className="font-heading font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                يحتاج اهتمامك
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </h2>
              <div className="space-y-2.5">
                <ActionItem
                  icon={<AlertCircle size={16} strokeWidth={1.8} />}
                  title="حصص سابقة بحاجة إجراء منك"
                  count={stats?.needsAttention}
                  color="#ef4444"
                  onClick={() => navigate(ROUTES.TEACHER_SESSIONS)}
                />
                <ActionItem
                  icon={<Calendar size={16} strokeWidth={1.8} />}
                  title="طلاب بدون جدول دوري"
                  count={unscheduledCount}
                  color="#d97706"
                  onClick={() => navigate(ROUTES.TEACHER_SESSIONS)}
                />
                <ActionItem
                  icon={<Star size={16} strokeWidth={1.8} />}
                  title="تقييمات معلقة"
                  count={stats?.pendingEvaluations}
                  color="#f59e0b"
                  onClick={() => navigate(ROUTES.TEACHER_EVALUATIONS)}
                />
                <ActionItem
                  icon={<Calendar size={16} strokeWidth={1.8} />}
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
              { label: 'حصص اليوم', value: stats?.sessionsToday || 0, color: '#3b82f6' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl p-4 text-center bg-white border border-gray-100 shadow-sm"
              >
                <div className="font-heading font-extrabold text-3xl mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Upcoming Sessions */}
          <div className="rounded-2xl p-5 flex-1 bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-gray-900 text-base">الحصص القادمة</h2>
              <button onClick={() => navigate(ROUTES.TEACHER_SESSIONS)} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                عرض الكل ←
              </button>
            </div>
            {!stats?.upcomingSessions?.length ? (
              <div className="text-center py-8 text-gray-400">
                <Calendar size={32} strokeWidth={1.4} className="mb-2 mx-auto" />
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
                    className="flex items-center gap-3.5 p-3.5 rounded-xl transition-all bg-gray-50 border border-gray-100 hover:bg-gray-100/70"
                  >
                    <Avatar src={getFileUrl(s.studentId?.avatar)} firstName={s.studentId?.firstNameAr} lastName={s.studentId?.lastNameAr} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 font-semibold text-sm truncate">{s.titleAr}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-2 text-gray-500">
                        <span>{s.studentId?.firstNameAr}</span>
                        <span>•</span>
                        <span>{formatDateAr(s.scheduledAt)}</span>
                        <span>{formatTimeAr(s.scheduledAt)}</span>
                      </div>
                    </div>
                    {s.meetingLink && (
                      <a href={s.meetingLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all bg-violet-100 text-violet-700 hover:bg-violet-200">
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
            <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-bold text-gray-900 text-base">طلابي ({stats.totalStudents})</h2>
                <button onClick={() => navigate(ROUTES.TEACHER_STUDENTS)} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                  عرض الكل ←
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {stats.recentStudents.slice(0, 6).map((st) => (
                  <div key={st._id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <Avatar src={getFileUrl(st.avatar)} firstName={st.firstNameAr} lastName={st.lastNameAr} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 text-xs font-semibold truncate">{st.firstNameAr}</div>
                      <div className="text-[10px] truncate text-gray-400">{st.courseLevel || 'مبتدئ'}</div>
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
