import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../utils/api.js'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { formatNumber, formatCurrency } from '../../utils/format.js'
import { ROUTES, getFileUrl } from '../../config/constants.js'
import { useAuthStore } from '../../store/authStore.js'

function getArabicDate() {
  return new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function KPICard({ label, value, sub, icon, color = '#7c3aed', trend, to }) {
  const navigate = useNavigate()
  return (
    <motion.div
      whileHover={{ y: -1 }}
      onClick={() => to && navigate(to)}
      className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm ${to ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, color }}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="font-heading font-extrabold text-2xl text-gray-900">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </motion.div>
  )
}

// Consolidates every "needs an admin decision" signal into one checklist
// instead of stacking separate full-width banners per source — replaces the
// old AlertBanner + inline unscheduled-students banner, and adds the
// previously-unsurfaced ungraded-homework backlog.
function PendingTasksCard({ pendingEnrollments, unscheduledStudents, pendingHomeworkGrading, studentsClosingPackage }) {
  const tasks = [
    {
      key: 'enrollments', count: pendingEnrollments, to: ROUTES.ADMIN_ENROLLMENTS, color: '#f59e0b',
      label: (n) => `${n} ${n === 1 ? 'طلب تسجيل جديد' : 'طلبات تسجيل'} بانتظار المراجعة`,
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      key: 'unscheduled', count: unscheduledStudents, to: ROUTES.ADMIN_STUDENTS, color: '#7c3aed',
      label: (n) => `${n} ${n === 1 ? 'طالب مشترك' : 'طلاب مشتركون'} بلا جدول دوري`,
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    },
    {
      key: 'homework', count: pendingHomeworkGrading, to: ROUTES.ADMIN_TEACHERS, color: '#3b82f6',
      label: (n) => `${n} ${n === 1 ? 'واجب مسلّم' : 'واجبات مسلّمة'} بانتظار تصحيح المعلم`,
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    },
    {
      key: 'closing-package', count: studentsClosingPackage, to: ROUTES.ADMIN_SUBSCRIPTIONS, color: '#ec4899',
      label: (n) => `${n} ${n === 1 ? 'طالب اقترب' : 'طلاب اقتربوا'} من انتهاء باقة حصصهم`,
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/></svg>,
    },
  ].filter(t => t.count > 0)

  if (!tasks.length) {
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <span className="font-bold text-emerald-800 text-sm">لا توجد مهام معلقة — كل شيء تحت السيطرة ✓</span>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500">المهام المعلقة</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tasks.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {tasks.map(t => (
          <Link key={t.key} to={t.to}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ background: `${t.color}12`, color: t.color }}>
              {t.icon}
            </div>
            <span className="flex-1 text-sm font-semibold text-gray-700">{t.label(t.count)}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-300 flex-none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}

function SessionRow({ session, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <Avatar
        src={getFileUrl(session.studentId?.avatar)}
        firstName={session.studentId?.firstNameAr}
        lastName={session.studentId?.lastNameAr}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 truncate">
          {session.studentId?.firstNameAr} — {session.teacherId?.firstNameAr}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{formatTimeAr(session.scheduledAt)} • {session.durationMinutes} دقيقة</div>
      </div>
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
        {session.meetingProvider}
      </span>
    </motion.div>
  )
}

function RegistrationRow({ user: u, index }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar src={getFileUrl(u.avatar)} firstName={u.firstNameAr} lastName={u.lastNameAr} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 truncate">{u.firstNameAr} {u.lastNameAr}</div>
        <div className="text-xs text-gray-400">{formatDateAr(u.createdAt)}</div>
      </div>
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${u.role === 'teacher' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'}`}>
        {u.role === 'teacher' ? 'معلم' : 'طالب'}
      </span>
    </div>
  )
}

function QuickActionBtn({ icon, label, to, color = '#7c3aed', badge }) {
  return (
    <Link
      to={to}
      className="relative flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-sm text-center"
      style={{ borderColor: `${color}20`, background: `${color}08` }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      {badge > 0 && (
        <span className="absolute -top-1.5 -start-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  )
}

// Compact "what needs my attention right now" strip — the dashboard's job
// is to answer that question in one glance; the full breakdown, timeline,
// and review actions live in the Operations Center this links to.
function OperationsIntelligenceStrip() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['admin', 'operations', 'live'],
    queryFn: () => api.get('/operations/live').then(r => r.data.data),
    refetchInterval: 120000,
  })
  const c = data?.counts
  if (!c) return null

  const items = [
    { label: 'جارية الآن', value: c.liveNow, color: '#22c55e' },
    { label: 'لم يسجّل المعلم حضوره', value: c.missingCheckIn, color: '#ef4444' },
    { label: 'بلا رابط اجتماع', value: c.missingLink, color: '#f59e0b' },
    { label: 'بحاجة مراجعة', value: c.needsReviewCount, color: '#ea580c' },
    { label: 'مراجعة راتب معلّقة', value: c.payrollReviewCount, color: '#7c3aed' },
  ]
  const anyUrgent = items.some(i => i.value > 0)

  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(ROUTES.ADMIN_OPERATIONS)}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-start flex-wrap"
    >
      <span className="text-xs font-bold text-gray-700 flex-none">مركز العمليات</span>
      <div className="flex items-center gap-4 flex-wrap flex-1">
        {items.map(i => (
          <span key={i.label} className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: i.value > 0 ? i.color : '#d1d5db' }} />
            <b style={{ color: i.value > 0 ? i.color : '#9ca3af' }}>{i.value ?? 0}</b> {i.label}
          </span>
        ))}
      </div>
      {!anyUrgent && <span className="text-xs text-emerald-600 font-semibold flex-none">كل شيء طبيعي ✓</span>}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400 flex-none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </motion.button>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get('/admin/stats').then(r => r.data.data),
    refetchInterval: 60000,
    placeholderData: {
      totalStudents: 0, totalTeachers: 0, totalSessions: 0, totalRevenue: 0,
      activeSubscriptions: 0, sessionsToday: 0, pendingEnrollments: 0,
      unscheduledStudents: 0, pendingHomeworkGrading: 0,
      recentRegistrations: [], upcomingSessions: [],
      studentsClosingPackage: [], studentsClosingPackageCount: 0,
      thisMonth: { completedSessions: 0, cancelledSessions: 0, payableSessions: 0, lateTeacherSessions: 0 },
    },
  })

  const pending = stats?.pendingEnrollments || 0

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner color="border-violet-600" />
    </div>
  )

  return (
    <div dir="rtl" className="space-y-6 max-w-[1400px]">

      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold text-gray-400 mb-1">{getArabicDate()}</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-extrabold text-2xl text-gray-900">
              مرحباً، {user?.firstNameAr || 'المدير'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {pending > 0
                ? `لديك ${pending} ${pending === 1 ? 'طلب يحتاج' : 'طلبات تحتاج'} مراجعتك اليوم`
                : 'المنصة تعمل بشكل طبيعي — لا توجد إجراءات عاجلة'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link to={ROUTES.ADMIN_REPORTS} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 16v-4M12 16V8M17 16v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              التقارير
            </Link>
            <Link to={ROUTES.ADMIN_ENROLLMENTS} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: '#7c3aed' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              طلبات التسجيل
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Operations intelligence strip */}
      <OperationsIntelligenceStrip />

      {/* Consolidated pending-tasks checklist (replaces separate per-source banners) */}
      <PendingTasksCard
        pendingEnrollments={pending}
        unscheduledStudents={stats?.unscheduledStudents || 0}
        pendingHomeworkGrading={stats?.pendingHomeworkGrading || 0}
        studentsClosingPackage={stats?.studentsClosingPackageCount || 0}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="إجمالي الطلاب"
          value={formatNumber(stats?.totalStudents)}
          sub="طالب مسجل في المنصة"
          icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.8"/><path d="M15.5 19a4 4 0 0 1 6-3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
          color="#7c3aed"
          to={ROUTES.ADMIN_STUDENTS}
        />
        <KPICard
          label="المعلمون"
          value={formatNumber(stats?.totalTeachers)}
          sub="معلم نشط"
          icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
          color="#E8C76A"
          to={ROUTES.ADMIN_TEACHERS}
        />
        <KPICard
          label="اشتراكات نشطة"
          value={formatNumber(stats?.activeSubscriptions)}
          sub="اشتراك فعّال حالياً"
          icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/></svg>}
          color="#10b981"
          to={ROUTES.ADMIN_PACKAGES}
        />
        <KPICard
          label="إجمالي الإيرادات"
          value={formatCurrency(stats?.totalRevenue, 'SAR')}
          sub="الإيرادات الكلية للمنصة"
          icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM12 7v2.5l2 1M3 19a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}
          color="#3b82f6"
          to={ROUTES.ADMIN_REPORTS}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="font-heading font-bold text-gray-900 mb-4 text-base">إجراءات سريعة</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <QuickActionBtn
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            label="مراجعة الطلبات"
            to={ROUTES.ADMIN_ENROLLMENTS}
            color="#f59e0b"
            badge={pending}
          />
          <QuickActionBtn
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
            label="إدارة الطلاب"
            to={ROUTES.ADMIN_STUDENTS}
            color="#7c3aed"
          />
          <QuickActionBtn
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
            label="إدارة المعلمين"
            to={ROUTES.ADMIN_TEACHERS}
            color="#E8C76A"
          />
          <QuickActionBtn
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 16v-4M12 16V8M17 16v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
            label="التقارير"
            to={ROUTES.ADMIN_REPORTS}
            color="#10b981"
          />
          <QuickActionBtn
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8"/></svg>}
            label="الإشعارات"
            to={ROUTES.ADMIN_NOTIFICATIONS}
            color="#ec4899"
          />
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's Sessions */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-bold text-gray-900 text-base">حصص اليوم</h2>
              <p className="text-xs text-gray-400 mt-0.5">الحصص المجدولة اليوم</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${stats?.sessionsToday > 0 ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                {stats?.sessionsToday || 0} حصة
              </span>
              <Link to={ROUTES.ADMIN_SESSIONS} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                عرض الكل
              </Link>
            </div>
          </div>

          {!stats?.upcomingSessions?.length ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl bg-gray-50">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-gray-400"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">لا توجد حصص مجدولة اليوم</p>
            </div>
          ) : (
            <div className="space-y-1">
              {stats.upcomingSessions.slice(0, 6).map((s, i) => (
                <SessionRow key={i} session={s} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-bold text-gray-900 text-base">آخر التسجيلات</h2>
              <p className="text-xs text-gray-400 mt-0.5">أحدث المستخدمين المسجلين</p>
            </div>
            <Link to={ROUTES.ADMIN_STUDENTS} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
              عرض الكل
            </Link>
          </div>

          {!stats?.recentRegistrations?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <p className="text-sm">لا توجد تسجيلات حديثة</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.recentRegistrations.slice(0, 7).map((u, i) => (
                <RegistrationRow key={i} user={u} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Platform Stats Row */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="font-heading font-bold text-gray-900 mb-4 text-base">صحة المنصة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'إجمالي الحصص',
              value: formatNumber(stats?.totalSessions),
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
              color: '#7c3aed',
            },
            {
              label: 'حصص اليوم',
              value: formatNumber(stats?.sessionsToday),
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
              color: '#10b981',
            },
            {
              label: 'طلبات قيد المراجعة',
              value: formatNumber(pending),
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
              color: '#f59e0b',
            },
            {
              label: 'متوسط الطلاب/معلم',
              value: stats?.totalTeachers > 0
                ? (stats.totalStudents / stats.totalTeachers).toFixed(1)
                : '0',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M7 16v-4M12 16V8M17 16v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
              color: '#3b82f6',
            },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: `${m.color}12`, color: m.color }}>
                {m.icon}
              </div>
              <div>
                <div className="font-heading font-extrabold text-lg text-gray-900">{m.value}</div>
                <div className="text-xs text-gray-500">{m.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* This month's session/payroll operational snapshot */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="font-heading font-bold text-gray-900 mb-4 text-base">هذا الشهر</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'حصص مكتملة', value: formatNumber(stats?.thisMonth?.completedSessions), color: '#10b981' },
            { label: 'حصص ملغاة', value: formatNumber(stats?.thisMonth?.cancelledSessions), color: '#ef4444' },
            { label: 'حصص مستحقة الدفع للمعلمين', value: formatNumber(stats?.thisMonth?.payableSessions), color: '#7c3aed' },
            { label: 'تأخّر المعلمين', value: formatNumber(stats?.thisMonth?.lateTeacherSessions), color: '#f59e0b' },
          ].map((m, i) => (
            <div key={i} className="p-3 rounded-xl bg-gray-50 text-center">
              <div className="font-heading font-extrabold text-xl" style={{ color: m.color }}>{m.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Students close to finishing their session package */}
      {!!stats?.studentsClosingPackage?.length && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-bold text-gray-900 text-base">طلاب قريبون من انتهاء الباقة</h2>
              <p className="text-xs text-gray-400 mt-0.5">3 حصص أو أقل متبقية</p>
            </div>
            <Link to={ROUTES.ADMIN_SUBSCRIPTIONS} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
              عرض الكل
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.studentsClosingPackage.map((sub, i) => (
              <div key={sub._id || i} className="flex items-center gap-3 py-2.5">
                <Avatar src={getFileUrl(sub.studentId?.avatar)} firstName={sub.studentId?.firstNameAr} lastName={sub.studentId?.lastNameAr} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{sub.studentId?.firstNameAr} {sub.studentId?.lastNameAr}</div>
                  <div className="text-xs text-gray-400">{sub.packageId?.nameAr}</div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-pink-50 text-pink-700">
                  {sub.sessionsRemaining} متبقية
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
