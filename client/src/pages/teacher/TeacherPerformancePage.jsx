import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Award, CheckCircle2, Clock3, Wallet, Download, FileText,
  TrendingUp, CalendarRange, XCircle,
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import AttendanceStatusBadge from '../../components/ui/AttendanceStatusBadge.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import { SkeletonStatRow, SkeletonChart, SkeletonRows } from '../../components/ui/Skeleton.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { formatCurrency, toArray } from '../../utils/format.js'
import { exportRowsToCSV, exportReportToPDF } from '../../utils/exportUtils.js'
import { PAYROLL_STATUS, getFileUrl } from '../../config/constants.js'

// ── Period presets ──────────────────────────────────────────────────────────

function getPeriodRange(preset) {
  const now = new Date()
  if (preset === 'week') {
    const from = new Date(now)
    from.setDate(now.getDate() - now.getDay())
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: now.toISOString(), label: 'هذا الأسبوع' }
  }
  if (preset === 'quarter') {
    const from = new Date(now)
    from.setMonth(now.getMonth() - 3)
    return { from: from.toISOString(), to: now.toISOString(), label: 'آخر 3 أشهر' }
  }
  // month (default)
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: from.toISOString(), to: now.toISOString(), label: 'هذا الشهر' }
}

const PERIODS = [
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'quarter', label: 'آخر 3 أشهر' },
]

const STATUS_COLORS = { on_time: '#22c55e', late: '#f59e0b', absent: '#ef4444', excused: '#7c3aed', pending: '#6b7280' }
const STATUS_LABELS = { on_time: 'في الموعد', late: 'متأخر', absent: 'غائب', excused: 'معذور', pending: 'معلّق' }

// ── Light chart tooltip ──────────────────────────────────────────────────────

function LightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3.5 py-2.5 bg-white border border-gray-100 shadow-lg">
      <p className="text-[10px] mb-1 text-gray-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-bold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, Icon, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3 }}
      className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} strokeWidth={2} color={color} />
        </div>
      </div>
      <div className="font-heading font-extrabold text-xl text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis" dir="ltr" style={{ textAlign: 'right' }}>{value}</div>
      <div className="text-xs mt-1 text-gray-500">{label}</div>
    </motion.div>
  )
}

// ── Period selector ──────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl w-fit bg-gray-100">
      {PERIODS.map(p => (
        <button key={p.key} onClick={() => onChange(p.key)}
          className={`px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${value === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ periodKey, summary, summaryLoading, trend, trendLoading, trendRange, setTrendRange }) {
  const attendance = summary?.attendance
  const salary = summary?.salary

  const pieData = attendance
    ? ['on_time', 'late', 'absent', 'excused'].map(k => ({ name: STATUS_LABELS[k], value: attendance[k] || 0, key: k }))
      .filter(d => d.value > 0)
    : []

  return (
    <div className="space-y-5">
      {summaryLoading ? <SkeletonStatRow count={4} /> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="نسبة الالتزام بالمواعيد" value={`${attendance?.punctualityRate ?? 0}%`} Icon={Clock3} color="#22c55e" delay={0} />
          <KpiCard label="نسبة إكمال الحصص" value={`${attendance?.completionRate ?? 0}%`} Icon={CheckCircle2} color="#7c3aed" delay={0.05} />
          <KpiCard label="إجمالي الحصص" value={attendance?.totalSessions ?? 0} Icon={CalendarRange} color="#d97706" delay={0.1} />
          <KpiCard label="الراتب المستحق" value={formatCurrency(salary?.totalAmount || 0, 'SAR')} Icon={Wallet} color="#3b82f6" delay={0.15} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-gray-900 text-sm flex items-center gap-2">
              <TrendingUp size={15} className="text-violet-600" /> اتجاه الأداء
            </h3>
            <div className="flex gap-1 p-0.5 rounded-lg bg-gray-100">
              {[['weekly', 'أسبوعي'], ['monthly', 'شهري']].map(([k, l]) => (
                <button key={k} onClick={() => setTrendRange(k)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${trendRange === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {trendLoading ? <SkeletonChart height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend || []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f0fc" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<LightTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
                <Bar dataKey="onTime" name="في الموعد" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="late" name="متأخر" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="absent" name="غياب" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
          <h3 className="font-heading font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Award size={15} className="text-amber-500" /> توزيع الحضور
          </h3>
          {summaryLoading ? <SkeletonChart height={200} /> : pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <XCircle size={28} strokeWidth={1.5} className="mb-2 text-gray-300" />
              <p className="text-xs text-gray-400">لا توجد بيانات لهذه الفترة</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {pieData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.key]} />)}
                </Pie>
                <Tooltip content={<LightTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {pieData.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {pieData.map(d => (
                <div key={d.key} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[d.key] }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Attendance history tab ────────────────────────────────────────────────────

function AttendanceHistoryTab({ periodRange }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['teacher-performance', 'me', 'attendance', periodRange.from, periodRange.to, statusFilter, page],
    queryFn: () => api.get('/teacher-performance/me/attendance', {
      params: { from: periodRange.from, to: periodRange.to, status: statusFilter || undefined, page, limit: 15 },
    }).then(r => r.data?.data || {}),
  })

  const sessions = toArray(data?.sessions)

  function handleExportCSV() {
    if (!sessions.length) return toast.error('لا توجد بيانات للتصدير')
    exportRowsToCSV(sessions, [
      { key: 'titleAr', label: 'الحصة' },
      { key: 'scheduledAt', label: 'التاريخ', format: v => formatDateAr(v) },
      { key: 'scheduledAt', label: 'الوقت', format: v => formatTimeAr(v) },
      { key: 'teacherAttendanceStatus', label: 'الحالة', format: v => STATUS_LABELS[v] || v },
      { key: 'teacherLateMinutes', label: 'دقائق التأخير' },
    ], 'سجل-الحضور')
    toast.success('تم تصدير الملف')
  }

  async function handleExportPDF() {
    if (!sessions.length) return toast.error('لا توجد بيانات للتصدير')
    await exportReportToPDF({
      title: 'سجل الحضور',
      subtitle: `الفترة: ${periodRange.label}`,
      meta: `تم إنشاء التقرير في ${formatDateAr(new Date())}`,
      columns: [
        { key: 'titleAr', label: 'الحصة' },
        { key: 'scheduledAt', label: 'التاريخ', format: v => formatDateAr(v) },
        { key: 'teacherAttendanceStatus', label: 'الحالة', format: v => STATUS_LABELS[v] || v },
        { key: 'teacherLateMinutes', label: 'دقائق التأخير', format: v => v || '—' },
      ],
      rows: sessions,
      filename: 'سجل-الحضور',
    })
    toast.success('تم إنشاء ملف PDF')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {[['', 'الكل'], ['on_time', 'في الموعد'], ['late', 'متأخر'], ['absent', 'غائب'], ['excused', 'معذور']].map(([v, l]) => (
            <button key={v} onClick={() => { setStatusFilter(v); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === v ? 'bg-violet-100 text-violet-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100">
            <Download size={13} /> CSV
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-red-50 text-red-500 border border-red-100 hover:bg-red-100">
            <FileText size={13} /> PDF
          </button>
        </div>
      </div>

      {isLoading ? <SkeletonRows count={6} /> : isError ? (
        <ErrorState onRetry={refetch} isRetrying={isFetching} />
      ) : !sessions.length ? (
        <div className="rounded-2xl p-14 text-center bg-white border-2 border-dashed border-gray-200">
          <CalendarRange size={40} strokeWidth={1.3} className="mb-3 mx-auto text-gray-300" />
          <p className="text-gray-900 font-semibold mb-1">لا توجد سجلات لهذه الفترة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s._id} className="rounded-xl p-4 flex items-center gap-3 flex-wrap bg-white border border-gray-100 shadow-sm">
              <Avatar src={getFileUrl(s.studentId?.avatar)} firstName={s.studentId?.firstNameAr} lastName={s.studentId?.lastNameAr} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 font-semibold text-sm truncate">{s.titleAr}</div>
                <div className="text-[11px] mt-0.5 text-gray-500">
                  {s.studentId?.firstNameAr} {s.studentId?.lastNameAr} • {formatDateAr(s.scheduledAt)} • {formatTimeAr(s.scheduledAt)}
                </div>
              </div>
              {s.teacherLateMinutes > 0 && (
                <span className="text-[10px] font-semibold text-amber-600">+{s.teacherLateMinutes} د</span>
              )}
              <AttendanceStatusBadge status={s.teacherAttendanceStatus} />
            </div>
          ))}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 bg-gray-100 text-gray-600 hover:bg-gray-200">السابق</button>
          <span className="px-3 py-1.5 text-xs text-gray-500">{page} / {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 bg-gray-100 text-gray-600 hover:bg-gray-200">التالي</button>
        </div>
      )}
    </div>
  )
}

// ── Salary tab ─────────────────────────────────────────────────────────────────

// Shows exactly which sessions are/aren't counted toward pay yet — the
// concrete, per-status breakdown behind the single "salary due" number.
function PayrollReadinessCard({ periodRange }) {
  const { data: readiness, isLoading } = useQuery({
    queryKey: ['teacher-performance', 'me', 'payroll-readiness', periodRange.from, periodRange.to],
    queryFn: () => api.get('/teacher-performance/me/payroll-readiness', { params: { from: periodRange.from, to: periodRange.to } }).then(r => r.data?.data),
  })

  if (isLoading) return <SkeletonStatRow count={4} />
  if (!readiness) return null

  const rows = [
    { key: 'payable', count: readiness.payable },
    { key: 'pending_review', count: readiness.pending_review },
    { key: 'pending', count: readiness.pending },
    { key: 'non_payable', count: readiness.non_payable },
    { key: 'excluded', count: readiness.excluded },
  ].filter(r => r.count > 0)

  return (
    <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
      <div className="text-sm font-bold text-gray-800 mb-3">تفصيل جاهزية الراتب</div>
      <div className="flex flex-wrap gap-2">
        {rows.length === 0 && <span className="text-xs text-gray-400">لا توجد حصص في هذه الفترة</span>}
        {rows.map(r => {
          const cfg = PAYROLL_STATUS[r.key]
          return (
            <span key={r.key} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: `${cfg.color}18`, color: cfg.color }}>
              {cfg.label}: {r.count}
            </span>
          )
        })}
      </div>
      {readiness.pending_review > 0 && (
        <p className="text-[11px] text-amber-600 mt-3">
          هناك {readiness.pending_review} حصة بانتظار مراجعة الإدارة قبل احتسابها ضمن الراتب.
        </p>
      )}
    </div>
  )
}

function SalaryTab({ periodRange, salary, isLoading }) {
  async function handleExportPDF() {
    if (!salary) return toast.error('لا توجد بيانات')
    await exportReportToPDF({
      title: 'تقرير الراتب',
      subtitle: `${salary.teacherName} — الفترة: ${periodRange.label}`,
      meta: `تم إنشاء التقرير في ${formatDateAr(new Date())}`,
      columns: [
        { key: 'label', label: 'البند' },
        { key: 'value', label: 'القيمة' },
      ],
      rows: [
        { label: 'سعر الحصة', value: formatCurrency(salary.salaryPerSession, 'SAR') },
        { label: 'الحصص المستحقة الدفع', value: salary.payableSessions },
        { label: 'حصص الغياب غير مدفوعة', value: salary.unpaidAbsences },
        { label: 'حصص معذورة', value: salary.excusedSessions },
      ],
      summary: `الإجمالي المستحق: ${formatCurrency(salary.totalAmount, 'SAR')}`,
      filename: 'تقرير-الراتب',
    })
    toast.success('تم إنشاء ملف PDF')
  }

  if (isLoading) return <div className="space-y-4"><SkeletonStatRow count={3} /><SkeletonChart height={160} /></div>

  if (!salary) return null

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-6 relative overflow-hidden bg-white border border-gray-100 shadow-sm">
        <div className="absolute top-0 end-0 w-40 h-40 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="relative">
          <div className="text-xs font-semibold mb-1 text-violet-600">الراتب المستحق — {periodRange.label}</div>
          <div className="font-heading font-extrabold text-4xl text-gray-900 mb-1 whitespace-nowrap" dir="ltr" style={{ textAlign: 'right' }}>{formatCurrency(salary.totalAmount, 'SAR')}</div>
          <div className="text-sm text-gray-500">
            {salary.payableSessions} حصة × <span dir="ltr">{formatCurrency(salary.salaryPerSession, 'SAR')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="حصص مستحقة الدفع" value={salary.payableSessions} Icon={CheckCircle2} color="#22c55e" />
        <KpiCard label="غياب بدون أجر" value={salary.unpaidAbsences} Icon={XCircle} color="#ef4444" />
        <KpiCard label="حصص معذورة" value={salary.excusedSessions} Icon={Clock3} color="#7c3aed" />
      </div>

      <PayrollReadinessCard periodRange={periodRange} />

      <button onClick={handleExportPDF}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100">
        <FileText size={15} /> تصدير تقرير الراتب PDF
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TeacherPerformancePage() {
  const [tab, setTab] = useState('overview')
  const [period, setPeriod] = useState('month')
  const [trendRange, setTrendRange] = useState('weekly')

  const periodRange = useMemo(() => getPeriodRange(period), [period])

  const { data: summary, isLoading: summaryLoading, isError: summaryError, isFetching: summaryFetching, refetch: refetchSummary } = useQuery({
    queryKey: ['teacher-performance', 'me', 'summary', periodRange.from, periodRange.to],
    queryFn: () => api.get('/teacher-performance/me/summary', { params: { from: periodRange.from, to: periodRange.to } }).then(r => r.data?.data),
  })

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['teacher-performance', 'me', 'trend', trendRange],
    queryFn: () => api.get('/teacher-performance/me/trend', { params: { range: trendRange } }).then(r => toArray(r.data?.data)),
  })

  const TABS = [
    { key: 'overview', label: 'نظرة عامة' },
    { key: 'attendance', label: 'سجل الحضور' },
    { key: 'salary', label: 'الراتب' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="أدائي والراتب" subtitle="متابعة التزامك بالمواعيد ومستحقاتك المالية" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 p-1 rounded-xl w-fit bg-gray-100">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {tab === 'overview' && (
        summaryError ? <ErrorState onRetry={refetchSummary} isRetrying={summaryFetching} /> : (
          <OverviewTab
            periodKey={period} summary={summary} summaryLoading={summaryLoading}
            trend={trend} trendLoading={trendLoading}
            trendRange={trendRange} setTrendRange={setTrendRange}
          />
        )
      )}
      {tab === 'attendance' && <AttendanceHistoryTab periodRange={periodRange} />}
      {tab === 'salary' && (
        summaryError
          ? <ErrorState onRetry={refetchSummary} isRetrying={summaryFetching} />
          : <SalaryTab periodRange={periodRange} salary={summary?.salary} isLoading={summaryLoading} />
      )}
    </div>
  )
}
