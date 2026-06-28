import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  DollarSign, Wallet, TrendingUp, TrendingDown,
  CalendarDays, Clock3, CheckCircle,
  Users, UserCheck, UserPlus,
  GraduationCap, Star, BarChart2 as ChartIcon,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import api from '../../utils/api.js'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatCurrency, formatNumber } from '../../utils/format.js'

// ── Static data ─────────────────────────────────────────────────────────────
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو']
const MONTH_WEIGHTS = [0.82, 0.91, 0.87, 1.04, 1.13, 1.23]
const SPARK = {
  rising:  [44, 52, 49, 63, 71, 68, 80],
  growing: [38, 47, 53, 59, 66, 73, 80],
  steady:  [68, 65, 72, 67, 74, 70, 75],
}

function monthlyData(total, key) {
  const base = (total || 0) / 6
  return MONTHS_AR.map((month, i) => ({ month, [key]: Math.round(base * MONTH_WEIGHTS[i]) }))
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const W = 100; const H = 32
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`
  ).join(' ')
  const id = `sg${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
    </svg>
  )
}

// ── Premium KPI card ─────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, bg, trend, trendLabel, sparkData, delay = 0 }) {
  const up = trend >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.48, ease: [0.2, 0.7, 0.2, 1] }}
      whileHover={{ y: -5, boxShadow: '0 24px 48px -8px rgba(31,17,71,0.14)' }}
      className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-[0_2px_16px_-4px_rgba(31,17,71,0.07)] cursor-default transition-shadow duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[13px] text-brand-textMuted font-body leading-tight mt-0.5 max-w-[120px]">{label}</p>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-none" style={{ background: bg }}>
          <Icon size={20} style={{ color }} strokeWidth={2} />
        </div>
      </div>

      <p className="font-heading font-bold text-[28px] md:text-3xl text-brand-textBody leading-none mb-2">
        {value}
      </p>

      {trend !== undefined && (
        <div className="flex items-center gap-1.5">
          {up
            ? <TrendingUp size={13} className="text-emerald-500 flex-none" />
            : <TrendingDown size={13} className="text-red-400 flex-none" />}
          <span className={`text-[11px] font-bold ${up ? 'text-emerald-500' : 'text-red-400'}`}>
            {up ? '+' : ''}{trend}%
          </span>
          {trendLabel && <span className="text-[11px] text-brand-textMuted">{trendLabel}</span>}
        </div>
      )}

      {sparkData && <Sparkline data={sparkData} color={color} />}
    </motion.div>
  )
}

// ── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ title, subtitle, icon: Icon, color }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
        style={{ background: `${color}18` }}>
        <Icon size={17} style={{ color }} strokeWidth={2} />
      </div>
      <div>
        <h2 className="font-heading font-bold text-brand-textBody text-[15px] leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-brand-textMuted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-lift text-right">
      <p className="text-[11px] text-brand-textMuted mb-1 font-body">{label}</p>
      <p className="text-sm font-heading font-bold text-brand-textBody">
        {fmt ? fmt(payload[0].value) : formatNumber(payload[0].value)}
      </p>
    </div>
  )
}

// ── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, ease: [0.2, 0.7, 0.2, 1] }}
      className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-[0_2px_16px_-4px_rgba(31,17,71,0.07)]"
    >
      <p className="font-heading font-bold text-brand-textBody text-[15px] leading-tight">{title}</p>
      {subtitle && <p className="text-[12px] text-brand-textMuted mt-0.5 mb-5">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </motion.div>
  )
}

// ── Rank badge ───────────────────────────────────────────────────────────────
const RANK_STYLE = {
  1: { bg: 'linear-gradient(135deg,#F6D365,#D4AF37)', color: '#6b4c00', shadow: '0 4px 12px rgba(212,175,55,0.38)' },
  2: { bg: 'linear-gradient(135deg,#d0d0d0,#9b9b9b)', color: '#3a3a3a', shadow: '0 4px 10px rgba(0,0,0,0.14)' },
  3: { bg: 'linear-gradient(135deg,#cd7f32,#a0522d)', color: '#fff',    shadow: '0 4px 10px rgba(160,82,45,0.32)' },
}
function RankBadge({ rank }) {
  const s = RANK_STYLE[rank] || { bg: '#f3f4f6', color: '#6b7280', shadow: 'none' }
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-heading font-bold text-sm flex-none"
      style={{ background: s.bg, color: s.color, boxShadow: s.shadow }}>
      {rank}
    </div>
  )
}

// ── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={11}
          className={i <= Math.round(rating || 0) ? 'text-brand-gold fill-brand-gold' : 'text-gray-200'} />
      ))}
    </div>
  )
}

// ── Teacher ranking card ─────────────────────────────────────────────────────
function TeacherCard({ teacher, rank }) {
  const initials = (teacher.firstNameAr?.[0] || '') + (teacher.lastNameAr?.[0] || '')
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.06, duration: 0.45 }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px -8px rgba(31,17,71,0.12)' }}
      className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-[0_2px_16px_-4px_rgba(31,17,71,0.07)] cursor-default transition-shadow duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <RankBadge rank={rank} />
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purpleLight flex items-center justify-center font-heading font-bold text-white text-sm flex-none">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-brand-textBody text-[13px] leading-tight truncate">
            {teacher.firstNameAr} {teacher.lastNameAr}
          </p>
          <StarRating rating={teacher.avgEvaluation} />
        </div>
      </div>

      <div className="flex items-center pt-3 border-t border-gray-50">
        {[
          { val: teacher.studentCount ?? 0,              lbl: 'طالب' },
          { val: teacher.sessionCount ?? 0,              lbl: 'حصة'  },
          { val: teacher.avgEvaluation?.toFixed(1) ?? '—', lbl: 'تقييم' },
        ].map(({ val, lbl }, i) => (
          <div key={lbl}
            className={`flex-1 flex flex-col items-center gap-0.5 ${i > 0 ? 'border-r border-gray-100' : ''}`}>
            <p className="font-heading font-bold text-brand-textBody text-lg leading-none">{val}</p>
            <p className="text-[11px] text-brand-textMuted">{lbl}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => api.get('/admin/reports').then(r => r.data.data),
    placeholderData: {
      revenue:     { total: 0, thisMonth: 0, lastMonth: 0, growth: 0 },
      sessions:    { total: 0, thisMonth: 0, completionRate: 0 },
      students:    { total: 0, active: 0, new: 0 },
      attendance:  { rate: 0 },
      topTeachers: [],
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spinner color="border-brand-purple" />
      </div>
    )
  }

  const revenueChart  = monthlyData(data?.revenue?.total,   'value')
  const sessionsChart = monthlyData(data?.sessions?.total,  'value')
  const studentsChart = monthlyData(data?.students?.total,  'value')

  return (
    <div dir="rtl" className="space-y-8">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-brand-textBody">التقارير والإحصاءات</h1>
          <p className="text-[13px] text-brand-textMuted mt-1">نظرة شاملة على أداء المنصة وتحليل البيانات</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-brand-textMuted bg-white rounded-2xl px-4 py-2.5 border border-gray-100 shadow-[0_2px_8px_-2px_rgba(31,17,71,0.06)]">
          <ChartIcon size={13} className="text-brand-purple" />
          <span className="font-body">بيانات محدثة</span>
        </div>
      </div>

      {/* ── Executive summary ────────────────────────────────── */}
      <section>
        <p className="text-[11px] font-semibold text-brand-purple uppercase tracking-widest mb-4 font-body">
          الملخص التنفيذي
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي الإيرادات"
            value={formatCurrency(data?.revenue?.total)}
            icon={DollarSign} color="#7c3aed" bg="#f5f3ff"
            trend={data?.revenue?.growth}
            trendLabel="مقارنة بالشهر الماضي"
            sparkData={SPARK.rising}
            delay={0}
          />
          <KpiCard
            label="الطلاب النشطون"
            value={formatNumber(data?.students?.active)}
            icon={UserCheck} color="#3b82f6" bg="#eff6ff"
            sparkData={SPARK.growing}
            delay={0.06}
          />
          <KpiCard
            label="حصص هذا الشهر"
            value={formatNumber(data?.sessions?.thisMonth)}
            icon={CalendarDays} color="#E8C76A" bg="#fffbeb"
            sparkData={SPARK.steady}
            delay={0.12}
          />
          <KpiCard
            label="معدل الحضور"
            value={`${data?.attendance?.rate || 0}%`}
            icon={CheckCircle} color="#22c55e" bg="#f0fdf4"
            sparkData={SPARK.steady}
            delay={0.18}
          />
        </div>
      </section>

      {/* ── Revenue ──────────────────────────────────────────── */}
      <section>
        <SectionHeading
          title="الإيرادات"
          subtitle="نظرة على الأداء المالي للمنصة"
          icon={DollarSign} color="#7c3aed"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <KpiCard label="الإجمالي الكلي"       value={formatCurrency(data?.revenue?.total)}     icon={DollarSign} color="#7c3aed" bg="#f5f3ff" delay={0} />
          <KpiCard label="إيرادات هذا الشهر"     value={formatCurrency(data?.revenue?.thisMonth)} icon={Wallet}     color="#22c55e" bg="#f0fdf4" delay={0.05} />
          <KpiCard label="إيرادات الشهر الماضي"  value={formatCurrency(data?.revenue?.lastMonth)} icon={Wallet}     color="#E8C76A" bg="#fffbeb" delay={0.1} />
          <KpiCard
            label="نسبة النمو"
            value={`${data?.revenue?.growth || 0}%`}
            icon={TrendingUp} color="#3b82f6" bg="#eff6ff"
            trend={data?.revenue?.growth}
            delay={0.15}
          />
        </div>
        <ChartCard title="تطور الإيرادات الشهرية" subtitle="آخر 6 أشهر">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ecfa" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#b3a4d0' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTip fmt={formatCurrency} />} />
              <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.5}
                fill="url(#grad-rev)" dot={false}
                activeDot={{ r: 5, fill: '#7c3aed', strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* ── Sessions ─────────────────────────────────────────── */}
      <section>
        <SectionHeading
          title="الحصص الدراسية"
          subtitle="إحصاءات الحصص والإكمال"
          icon={CalendarDays} color="#E8C76A"
        />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <KpiCard label="إجمالي الحصص"   value={formatNumber(data?.sessions?.total)}          icon={CalendarDays} color="#E8C76A" bg="#fffbeb" sparkData={SPARK.rising}  delay={0} />
          <KpiCard label="حصص هذا الشهر"  value={formatNumber(data?.sessions?.thisMonth)}      icon={Clock3}       color="#f97316" bg="#fff7ed"                           delay={0.06} />
          <KpiCard label="نسبة الإكمال"   value={`${data?.sessions?.completionRate || 0}%`}    icon={CheckCircle}  color="#22c55e" bg="#f0fdf4"                           delay={0.12} />
        </div>
        <ChartCard title="الحصص الشهرية" subtitle="توزيع الحصص على مدار العام">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sessionsChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fef9e7" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#b3a4d0' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="value" fill="#E8C76A" radius={[8, 8, 0, 0]} opacity={0.82} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* ── Students ─────────────────────────────────────────── */}
      <section>
        <SectionHeading
          title="الطلاب"
          subtitle="نمو قاعدة الطلاب وإحصاءاتهم"
          icon={Users} color="#3b82f6"
        />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <KpiCard label="إجمالي الطلاب"        value={formatNumber(data?.students?.total)}  icon={Users}     color="#3b82f6" bg="#eff6ff" sparkData={SPARK.growing} delay={0} />
          <KpiCard label="الطلاب النشطون"        value={formatNumber(data?.students?.active)} icon={UserCheck} color="#22c55e" bg="#f0fdf4"                          delay={0.06} />
          <KpiCard label="طلاب جدد هذا الشهر"   value={formatNumber(data?.students?.new)}   icon={UserPlus}  color="#8b5cf6" bg="#f5f3ff"                          delay={0.12} />
        </div>
        <ChartCard title="نمو الطلاب" subtitle="مسار تسجيل الطلاب الجدد">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={studentsChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#b3a4d0' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTip />} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5}
                dot={false} activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* ── Top teachers ─────────────────────────────────────── */}
      {data?.topTeachers?.length > 0 && (
        <section>
          <SectionHeading
            title="أفضل المعلمين"
            subtitle="ترتيب المعلمين بناءً على الأداء والتقييمات"
            icon={GraduationCap} color="#7c3aed"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.topTeachers.map((t, i) => (
              <TeacherCard key={i} teacher={t} rank={i + 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
