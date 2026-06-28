import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr, formatTimeAr, isFuture } from '../../utils/date.js'
import { SESSION_STATUS, ROUTES } from '../../config/constants.js'
// greeting uses no emoji — wave removed

// ── Ayah rotation (by day of week) ────────────────────────────────────────
const AYAT = [
  { text: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',               source: 'سورة الشرح ٦' },
  { text: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',      source: 'سورة العلق ١' },
  { text: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',               source: 'سورة طه ١١٤' },
  { text: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',             source: 'سورة البقرة ١٥٣' },
  { text: 'وَفَوْقَ كُلِّ ذِي عِلْمٍ عَلِيمٌ',           source: 'سورة يوسف ٧٦' },
  { text: 'وَعَلَّمَكَ مَا لَمْ تَكُن تَعْلَمُ',          source: 'سورة النساء ١١٣' },
  { text: 'فَاقْرَءُوا مَا تَيَسَّرَ مِنَ الْقُرْآنِ',   source: 'سورة المزمل ٢٠' },
]

function getArabicDate() {
  return new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Countdown hook ─────────────────────────────────────────────────────────
function useCountdown(targetDate) {
  const [t, setT] = useState(null)
  useEffect(() => {
    if (!targetDate) { setT(null); return }
    const target = new Date(targetDate)
    function calc() {
      const diff = target - Date.now()
      if (diff <= 0) { setT({ expired: true }); return }
      setT({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return t
}

// ── Query ──────────────────────────────────────────────────────────────────
function useStudentStats() {
  return useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: () => api.get('/students/me/stats').then(r => r.data.data),
    placeholderData: {
      attendanceRate: 0, completedSessions: 0, pendingHomework: 0, subscriptionDaysLeft: 0,
      upcomingSessions: [], recentEvaluations: [],
      memorization: { surahsCompleted: 0, ayahsTotal: 0 },
    },
  })
}

// ── Animation helpers ──────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.2, 0.7, 0.2, 1] },
})

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function StudentDashboardPage() {
  const { user } = useAuthStore()
  const { data: stats, isLoading } = useStudentStats()

  const ayah      = AYAT[new Date().getDay()]
  const sessions  = stats?.upcomingSessions || []
  const nextSess  = sessions.find(s => isFuture(s.scheduledAt))
  const countdown = useCountdown(nextSess?.scheduledAt)
  const memPct    = Math.round(((stats?.memorization?.surahsCompleted || 0) / 114) * 100)
  const juz       = Math.min(30, Math.ceil(((stats?.memorization?.surahsCompleted || 0) / 114) * 30))

  if (isLoading) {
    return (
      <div dir="rtl" className="flex flex-col gap-4 animate-pulse">
        <div className="skeleton-light h-28 rounded-card" />
        <div className="skeleton-light h-36 rounded-card" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton-light h-24 rounded-card" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton-light h-64 rounded-card" />
          <div className="skeleton-light h-64 rounded-card" />
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="max-w-[1200px]">

      {/* ═══ HERO GREETING ═══ */}
      <motion.div {...fadeUp(0)} className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-extrabold text-[28px] lg:text-[32px] text-brand-textBody leading-tight">
              أهلاً، {user?.firstNameAr || user?.firstName}
            </h1>
            <p className="text-[#9b7fd6] mt-1 text-[15px]">{getArabicDate()}</p>
          </div>
          {/* Ayah card */}
          <div
            className="flex-none sm:max-w-[300px] w-full rounded-[18px] px-5 py-3.5 text-center"
            style={{
              background: 'linear-gradient(135deg, #1d0a3f 0%, #2e1065 100%)',
              border: '1px solid rgba(232,199,106,0.2)',
            }}
          >
            <div className="text-[10px] font-semibold tracking-wider mb-1.5" style={{ color: 'rgba(232,199,106,0.65)' }}>
              آية اليوم
            </div>
            <div className="font-quran text-[17px] text-white leading-relaxed">
              ﴿ {ayah.text} ﴾
            </div>
            <div className="text-[11px] mt-1.5" style={{ color: '#a78fd6' }}>{ayah.source}</div>
          </div>
        </div>
      </motion.div>

      {/* ═══ NEXT SESSION CARD ═══ */}
      <motion.div {...fadeUp(0.05)} className="mb-5">
        {nextSess
          ? <NextSessionCard session={nextSess} countdown={countdown} />
          : <NoSessionEmptyCard hasSubscription={stats?.subscriptionDaysLeft > 0} />
        }
      </motion.div>

      {/* ═══ QUICK STATS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'نسبة الحضور',     value: `${stats?.attendanceRate || 0}%`, color: '#22c55e', icon: <AttIcon />, },
          { label: 'حصص مكتملة',     value: stats?.completedSessions || 0,    color: '#7c3aed', icon: <ChkIcon />, },
          { label: 'واجبات معلقة',   value: stats?.pendingHomework || 0,      color: '#f59e0b', icon: <HwIcon />,  },
          { label: 'أيام متبقية',    value: stats?.subscriptionDaysLeft || 0, color: '#3b82f6', icon: <ClkIcon />, },
        ].map((s, i) => (
          <motion.div key={i} {...fadeUp(0.1 + i * 0.06)}>
            <QuickStat {...s} />
          </motion.div>
        ))}
      </div>

      {/* ═══ MAIN GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Journey + Upcoming */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <motion.div {...fadeUp(0.3)}>
            <LearningJourneyCard memPct={memPct} juz={juz} stats={stats} />
          </motion.div>
          <motion.div {...fadeUp(0.35)}>
            <UpcomingSessionsCard sessions={sessions} />
          </motion.div>
        </div>

        {/* RIGHT: Tasks + Evaluations */}
        <div className="flex flex-col gap-5">
          <motion.div {...fadeUp(0.32)}>
            <TodayTasksCard stats={stats} />
          </motion.div>
          <motion.div {...fadeUp(0.38)}>
            <RecentEvalsCard evals={stats?.recentEvaluations || []} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// NEXT SESSION CARD
// ══════════════════════════════════════════════════════════════════════════
function NextSessionCard({ session, countdown }) {
  const status = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled
  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div
      className="rounded-card p-6 flex flex-col sm:flex-row sm:items-center gap-5"
      style={{
        background: 'linear-gradient(140deg, #3b1a8a 0%, #1d0a3f 60%, #270c5a 100%)',
        border: '1px solid rgba(124,58,237,0.3)',
        boxShadow: '0 16px 40px rgba(74,29,158,0.25)',
      }}
    >
      {/* Countdown */}
      <div className="flex-none flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="#E8C76A" strokeWidth="1.7"/>
            <path d="M3 9h18M8 3v4M16 3v4" stroke="#E8C76A" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        </div>
        {countdown && !countdown.expired ? (
          <div className="flex items-center gap-1.5">
            {[
              { v: countdown.h, l: 'ساعة' },
              { v: countdown.m, l: 'دقيقة' },
              { v: countdown.s, l: 'ثانية' },
            ].map(({ v, l }, i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className="font-heading font-extrabold text-2xl text-white w-12 text-center py-1 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  {pad(v)}
                </div>
                <div className="text-[10px] mt-1" style={{ color: '#a78fd6' }}>{l}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-white font-bold text-lg">وقت الحصة الآن!</div>
        )}
      </div>

      {/* Session info */}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(167,143,214,0.7)' }}>الحصة القادمة</div>
        <div className="font-heading font-bold text-xl text-white truncate mb-1">
          {session.titleAr || session.title || 'حصة قرآن'}
        </div>
        <div className="text-[13px]" style={{ color: '#a78fd6' }}>
          {formatDateAr(session.scheduledAt)} · {formatTimeAr(session.scheduledAt)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-none flex flex-col gap-2.5 sm:items-end">
        {session.meetingLink && (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-6 py-2.5 rounded-xl text-sm font-bold text-center"
          >
            انضم للحصة الآن
          </a>
        )}
        <Link
          to={ROUTES.STUDENT_SESSIONS}
          className="text-[13px] font-semibold text-center"
          style={{ color: '#a78fd6' }}
        >
          عرض كل الحصص ←
        </Link>
      </div>
    </div>
  )
}

function NoSessionEmptyCard({ hasSubscription }) {
  return (
    <div
      className="rounded-card p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-right"
      style={{
        background: 'linear-gradient(135deg, #f8f5ff 0%, #ede8fa 100%)',
        border: '1.5px dashed #d6cef0',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center flex-none mx-auto sm:mx-0"
        style={{ background: 'rgba(124,58,237,0.1)' }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="#7c3aed" strokeWidth="1.7"/>
          <path d="M3 9h18M8 3v4M16 3v4M12 13v4M10 15h4" stroke="#7c3aed" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="flex-1">
        <div className="font-heading font-bold text-xl text-brand-textBody mb-1">
          لا توجد حصص قادمة
        </div>
        <p className="text-[#9b7fd6] text-sm mb-4">
          {hasSubscription
            ? 'لم يتم جدولة حصص قادمة بعد. تواصل مع معلمك لتحديد موعد.'
            : 'انضم إلى برنامج ترتيلة لبدء رحلتك مع القرآن الكريم.'
          }
        </p>
        <div className="flex flex-wrap justify-center sm:justify-start gap-3">
          {hasSubscription ? (
            <Link to={ROUTES.STUDENT_SCHEDULE} className="btn-purple px-5 py-2.5 rounded-xl text-sm">
              عرض الجدول
            </Link>
          ) : (
            <Link to={ROUTES.STUDENT_ENROLLMENT} className="btn-gold px-5 py-2.5 rounded-xl text-sm">
              التسجيل في برنامج
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// QUICK STAT
// ══════════════════════════════════════════════════════════════════════════
function QuickStat({ label, value, color, icon }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="card-light p-5 flex items-center gap-4"
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-none"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>
      <div>
        <div className="font-heading font-bold text-2xl text-brand-textBody">{value}</div>
        <div className="text-[13px] text-[#9b7fd6] mt-0.5">{label}</div>
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// LEARNING JOURNEY
// ══════════════════════════════════════════════════════════════════════════
function LearningJourneyCard({ memPct, juz, stats }) {
  const ringC  = 2 * Math.PI * 44
  const offset = ringC * (1 - memPct / 100)

  return (
    <div className="card-light p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading font-bold text-lg text-brand-textBody">رحلة الحفظ</h2>
        <Link to={ROUTES.STUDENT_PROGRESS} className="text-sm font-semibold text-brand-purple hover:text-brand-purpleDark">
          التفاصيل ←
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Progress ring */}
        <div className="flex-none flex flex-col items-center gap-2">
          <div className="relative w-[108px] h-[108px]">
            <svg width="108" height="108" viewBox="0 0 108 108" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="54" cy="54" r="44" fill="none" stroke="#f0ecf8" strokeWidth="10" />
              <circle
                cx="54" cy="54" r="44" fill="none"
                stroke="url(#pg)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={ringC}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#a855f7" />
                  <stop offset="1" stopColor="#6d28d9" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-heading font-extrabold text-2xl text-brand-textBody">{memPct}%</div>
              <div className="text-[10px] text-[#9b7fd6]">مكتمل</div>
            </div>
          </div>
          <div className="text-[13px] text-[#9b7fd6] text-center">تقدم الحفظ</div>
        </div>

        {/* Stats grid */}
        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
          {[
            { label: 'سور محفوظة',   value: stats?.memorization?.surahsCompleted || 0, suffix: 'من 114',  color: '#7c3aed' },
            { label: 'الجزء الحالي', value: juz || 0,                                    suffix: 'من 30',   color: '#22c55e' },
            { label: 'نسبة الحضور', value: `${stats?.attendanceRate || 0}%`,             suffix: '',         color: '#3b82f6' },
            { label: 'الحصص',       value: stats?.completedSessions || 0,               suffix: 'مكتملة',  color: '#f59e0b' },
          ].map((item, i) => (
            <div key={i} className="rounded-[14px] p-3.5" style={{ background: '#f8f5ff' }}>
              <div className="font-heading font-bold text-xl" style={{ color: item.color }}>
                {item.value}
                {item.suffix && <span className="text-[11px] font-normal text-[#9b7fd6] mr-1">{item.suffix}</span>}
              </div>
              <div className="text-[12px] text-[#9b7fd6] mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="flex justify-between text-[12px] text-[#9b7fd6] mb-2">
          <span>تقدم الحفظ الكلي</span>
          <span>{stats?.memorization?.surahsCompleted || 0} / 114 سورة</span>
        </div>
        <div className="w-full bg-[#f0ecf8] rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
            initial={{ width: 0 }}
            animate={{ width: `${memPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// UPCOMING SESSIONS LIST
// ══════════════════════════════════════════════════════════════════════════
function UpcomingSessionsCard({ sessions }) {
  const upcoming = sessions.filter(s => isFuture(s.scheduledAt)).slice(0, 4)

  return (
    <div className="card-light p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading font-bold text-lg text-brand-textBody">الحصص القادمة</h2>
        <Link to={ROUTES.STUDENT_SESSIONS} className="text-sm font-semibold text-brand-purple hover:text-brand-purpleDark">
          عرض الكل ←
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-center py-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(124,58,237,0.08)' }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="#7c3aed" strokeWidth="1.7"/>
              <path d="M3 9h18M8 3v4M16 3v4" stroke="#7c3aed" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-semibold text-brand-textBody mb-1">لا توجد حصص قادمة</p>
          <p className="text-sm text-[#9b7fd6] mb-3">تواصل مع معلمك لجدولة حصصك</p>
          <Link to={ROUTES.STUDENT_SCHEDULE} className="text-sm font-bold text-brand-purple">
            عرض الجدول الدراسي
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((sess, i) => (
            <SessionRow key={i} session={sess} />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionRow({ session }) {
  const status = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled
  return (
    <div className="flex items-center gap-4 p-4 rounded-[16px] border border-[#f0ecf8] hover:border-[#e0d8f5] hover:bg-[#faf8ff] transition-all">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-none"
        style={{ background: `${status.color}15` }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={status.color} strokeWidth="1.7"/>
          <path d="M3 9h18M8 3v4M16 3v4" stroke={status.color} strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-brand-textBody text-sm truncate">
          {session.titleAr || session.title || 'حصة قرآن'}
        </div>
        <div className="text-xs text-[#9b7fd6] mt-0.5">
          {formatDateAr(session.scheduledAt)} · {formatTimeAr(session.scheduledAt)}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Badge variant={session.status === 'completed' ? 'gray' : 'purple'} className="text-xs">
          {status.label}
        </Badge>
        {session.meetingLink && isFuture(session.scheduledAt) && (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-brand-gold hover:text-brand-goldDark"
          >
            انضم ←
          </a>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// TODAY'S TASKS PANEL
// ══════════════════════════════════════════════════════════════════════════
function TodayTasksCard({ stats }) {
  const pendingHw  = stats?.pendingHomework || 0
  const daysLeft   = stats?.subscriptionDaysLeft || 0
  const upcoming   = (stats?.upcomingSessions || []).filter(s => isFuture(s.scheduledAt)).length

  const tasks = [
    {
      label: pendingHw > 0 ? `${pendingHw} واجب معلق` : 'لا واجبات معلقة',
      done: pendingHw === 0,
      icon: <HwIcon />,
      color: '#f59e0b',
      to: ROUTES.STUDENT_HOMEWORK,
      cta: pendingHw > 0 ? 'عرض الواجبات' : null,
    },
    {
      label: upcoming > 0 ? `${upcoming} حصة قادمة` : 'لا حصص قادمة',
      done: upcoming === 0,
      icon: <SessIcon />,
      color: '#7c3aed',
      to: ROUTES.STUDENT_SESSIONS,
      cta: null,
    },
    {
      label: daysLeft > 0 ? `${daysLeft} يوم متبقي في الاشتراك` : 'الاشتراك منتهٍ',
      done: daysLeft > 14,
      icon: <SubIcon />,
      color: daysLeft < 7 ? '#ef4444' : daysLeft < 14 ? '#f59e0b' : '#22c55e',
      to: ROUTES.STUDENT_SUBSCRIPTION,
      cta: daysLeft < 7 ? 'تجديد الاشتراك' : null,
    },
  ]

  return (
    <div className="card-light p-5">
      <h2 className="font-heading font-bold text-base text-brand-textBody mb-4">المساعد الذكي</h2>
      <div className="space-y-3">
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
              style={{ background: t.done ? 'rgba(34,197,94,0.1)' : `${t.color}15`, color: t.done ? '#22c55e' : t.color }}
            >
              {t.done
                ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : t.icon
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-brand-textBody">{t.label}</div>
              {t.cta && (
                <Link to={t.to} className="text-[12px] font-bold" style={{ color: t.color }}>
                  {t.cta} ←
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f0ecf8' }}>
        <p className="text-[12px] text-[#b3a4d0] leading-relaxed">
          واصل مسيرتك — كل يوم خطوة نحو إتقان كتاب الله
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// RECENT EVALUATIONS
// ══════════════════════════════════════════════════════════════════════════
function RecentEvalsCard({ evals }) {
  return (
    <div className="card-light p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-base text-brand-textBody">آخر التقييمات</h2>
        <Link to={ROUTES.STUDENT_EVALUATIONS} className="text-sm font-semibold text-brand-purple">
          الكل ←
        </Link>
      </div>

      {evals.length === 0 ? (
        <div className="text-center py-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2"
            style={{ background: 'rgba(124,58,237,0.08)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 4h14v16l-7-3-7 3V4Z" stroke="#7c3aed" strokeWidth="1.7" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm text-[#9b7fd6]">لا توجد تقييمات حتى الآن</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {evals.slice(0, 3).map((ev, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-[12px] bg-[#faf8ff]">
              <div className="text-sm text-brand-textBody font-semibold">{ev.type}</div>
              <div className="flex items-center gap-1.5">
                <div className="font-heading font-bold text-brand-purple text-base">{ev.score}</div>
                <div className="text-xs text-[#9b7fd6]">/ ١٠</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Small icon components ──────────────────────────────────────────────────
function AttIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3 9h18M8 3v4M16 3v4M8 15l2.5 2.5L16 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ChkIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function HwIcon()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 4h8l3 3v13H5V4h3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ClkIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> }
function SessIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> }
function SubIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> }
