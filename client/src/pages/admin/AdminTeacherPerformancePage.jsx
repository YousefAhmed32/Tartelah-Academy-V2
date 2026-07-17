import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Search, Download, FileText, Award, Users, Wallet, TrendingUp, ChevronUp, ChevronDown,
} from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import AttendanceStatusBadge from '../../components/ui/AttendanceStatusBadge.jsx'
import { formatDateAr } from '../../utils/date.js'
import { formatCurrency, formatNumber } from '../../utils/format.js'
import { exportRowsToCSV, exportReportToPDF } from '../../utils/exportUtils.js'
import { ROUTES, PAYROLL_STATUS } from '../../config/constants.js'
import { resolveTeacherIdentity } from '../../utils/teacherIdentity.js'

function getPeriodRange(preset) {
  const now = new Date()
  if (preset === 'week') {
    const from = new Date(now); from.setDate(now.getDate() - now.getDay()); from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: now.toISOString(), label: 'هذا الأسبوع' }
  }
  if (preset === 'quarter') {
    const from = new Date(now); from.setMonth(now.getMonth() - 3)
    return { from: from.toISOString(), to: now.toISOString(), label: 'آخر 3 أشهر' }
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: from.toISOString(), to: now.toISOString(), label: 'هذا الشهر' }
}

const PERIODS = [
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'quarter', label: 'آخر 3 أشهر' },
]

function StatCard({ label, value, Icon, color, bg }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon size={18} style={{ color }} strokeWidth={2} />
        </div>
      </div>
      <div className="font-heading font-extrabold text-xl text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis" dir="ltr" style={{ textAlign: 'right' }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </motion.div>
  )
}

export default function AdminTeacherPerformancePage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('month')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('totalAmount')
  const [sortDir, setSortDir] = useState('desc')

  const periodRange = useMemo(() => getPeriodRange(period), [period])

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'teacher-performance', 'all', periodRange.from, periodRange.to, search, page],
    queryFn: () => api.get('/teacher-performance/admin/all', {
      params: { from: periodRange.from, to: periodRange.to, search: search || undefined, page, limit: 15 },
    }).then(r => r.data.data),
    placeholderData: (prev) => prev,
  })

  const { data: readiness } = useQuery({
    queryKey: ['admin', 'teacher-performance', 'payroll-readiness', periodRange.from, periodRange.to],
    queryFn: () => api.get('/teacher-performance/admin/payroll-readiness', {
      params: { from: periodRange.from, to: periodRange.to },
    }).then(r => r.data.data),
  })

  const rows = data?.rows || []

  const sortedRows = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const diff = (a[sortBy] ?? 0) - (b[sortBy] ?? 0)
      return sortDir === 'asc' ? diff : -diff
    })
    return copy
  }, [rows, sortBy, sortDir])

  function toggleSort(key) {
    if (sortBy === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('desc') }
  }

  const totals = useMemo(() => {
    if (!rows.length) return { avgPunctuality: 0, totalPayroll: 0, topPerformer: null }
    const avgPunctuality = Math.round(rows.reduce((s, r) => s + (r.punctualityRate || 0), 0) / rows.length)
    const totalPayroll = rows.reduce((s, r) => s + (r.totalAmount || 0), 0)
    const topPerformer = [...rows].sort((a, b) => b.punctualityRate - a.punctualityRate)[0]
    return { avgPunctuality, totalPayroll, topPerformer }
  }, [rows])

  async function handleExportReport() {
    try {
      const { data: report } = await api.get('/teacher-performance/admin/salary-report', {
        params: { from: periodRange.from, to: periodRange.to },
      })
      const rowsData = report.data.rows
      if (!rowsData.length) return toast.error('لا توجد بيانات للتصدير')
      await exportReportToPDF({
        title: 'تقرير رواتب المعلمين',
        subtitle: `الفترة: ${periodRange.label}`,
        meta: `تم إنشاء التقرير في ${formatDateAr(new Date())}`,
        columns: [
          { key: 'teacherName', label: 'المعلم' },
          { key: 'payableSessions', label: 'حصص مدفوعة' },
          { key: 'unpaidAbsences', label: 'غياب' },
          { key: 'salaryPerSession', label: 'سعر الحصة', format: v => formatCurrency(v, 'EGP') },
          { key: 'totalAmount', label: 'الإجمالي', format: v => formatCurrency(v, 'EGP') },
        ],
        rows: rowsData,
        summary: `إجمالي الرواتب المستحقة: ${formatCurrency(report.data.totalPayroll, 'EGP')}`,
        filename: 'تقرير-رواتب-المعلمين',
      })
      toast.success('تم إنشاء ملف PDF')
    } catch {
      toast.error('حدث خطأ أثناء إنشاء التقرير')
    }
  }

  async function handleExportCSV() {
    try {
      const { data: report } = await api.get('/teacher-performance/admin/salary-report', {
        params: { from: periodRange.from, to: periodRange.to },
      })
      const rowsData = report.data.rows
      if (!rowsData.length) return toast.error('لا توجد بيانات للتصدير')
      exportRowsToCSV(rowsData, [
        { key: 'teacherName', label: 'المعلم' },
        { key: 'payableSessions', label: 'حصص مدفوعة' },
        { key: 'unpaidAbsences', label: 'غياب' },
        { key: 'salaryPerSession', label: 'سعر الحصة' },
        { key: 'totalAmount', label: 'الإجمالي' },
      ], 'تقرير-رواتب-المعلمين')
      toast.success('تم تصدير الملف')
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const SortHeader = ({ label, sortKey }) => (
    <button onClick={() => toggleSort(sortKey)} className="flex items-center gap-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
      {label}
      {sortBy === sortKey && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
    </button>
  )

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">أداء المعلمين والرواتب</h1>
          <p className="text-sm text-gray-500 mt-0.5">متابعة الالتزام بالمواعيد وحساب المستحقات المالية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={15} /> CSV
          </button>
          <button onClick={handleExportReport} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
            <FileText size={15} /> تقرير الرواتب PDF
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="عدد المعلمين" value={formatNumber(data?.total || 0)} Icon={Users} color="#7c3aed" bg="#f5f3ff" />
        <StatCard label="متوسط الالتزام بالمواعيد" value={`${totals.avgPunctuality}%`} Icon={TrendingUp} color="#22c55e" bg="#f0fdf4" />
        <StatCard label="إجمالي الرواتب المستحقة" value={formatCurrency(totals.totalPayroll, 'EGP')} Icon={Wallet} color="#3b82f6" bg="#eff6ff" />
        <StatCard label="الأفضل التزاماً" value={totals.topPerformer ? `${totals.topPerformer.firstNameAr} ${totals.topPerformer.lastNameAr}` : '—'} Icon={Award} color="#E8C76A" bg="#fffbeb" />
      </div>

      {/* Payroll readiness — how many sessions are actually ready to pay vs still pending review */}
      {readiness?.totals && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-sm font-bold text-gray-800 mb-3">جاهزية الرواتب لهذه الفترة</div>
          <div className="flex flex-wrap gap-2">
            {['payable', 'pending_review', 'pending', 'non_payable', 'excluded'].filter(k => readiness.totals[k] > 0).map(k => {
              const cfg = PAYROLL_STATUS[k]
              return (
                <span key={k} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: `${cfg.color}18`, color: cfg.color }}>
                  {cfg.label}: {readiness.totals[k]}
                </span>
              )
            })}
          </div>
          {readiness.totals.pending_review > 0 && (
            <p className="text-[11px] text-amber-600 mt-2.5">
              {readiness.totals.pending_review} حصة عبر جميع المعلمين بانتظار مراجعتك قبل احتسابها ضمن الرواتب.
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث عن معلم..." dir="rtl"
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 rounded-[10px] text-xs font-bold transition-all ${period === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
        ) : !sortedRows.length ? (
          <div className="p-16 text-center text-gray-400">
            <Users size={36} className="mx-auto mb-3" />
            <p className="font-semibold text-gray-500">لا يوجد معلمون مطابقون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-right px-5 py-3.5"><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">المعلم</span></th>
                  <th className="text-right px-5 py-3.5"><SortHeader label="الحصص" sortKey="totalSessions" /></th>
                  <th className="text-right px-5 py-3.5"><SortHeader label="الالتزام" sortKey="punctualityRate" /></th>
                  <th className="text-right px-5 py-3.5"><SortHeader label="الإكمال" sortKey="completionRate" /></th>
                  <th className="text-right px-5 py-3.5"><span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">الغياب</span></th>
                  <th className="text-right px-5 py-3.5"><SortHeader label="الراتب المستحق" sortKey="totalAmount" /></th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(t => (
                  <tr key={t._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar src={resolveTeacherIdentity(t).displayAvatar} firstName={t.firstNameAr} lastName={t.lastNameAr} size="sm" />
                        <div>
                          <div className="font-semibold text-gray-900">{t.firstNameAr} {t.lastNameAr}</div>
                          <div className="text-[11px] text-gray-400">{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-700">{t.totalSessions}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold" style={{ color: t.punctualityRate >= 80 ? '#16a34a' : t.punctualityRate >= 50 ? '#d97706' : '#dc2626' }}>
                        {t.punctualityRate}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-700">{t.completionRate}%</td>
                    <td className="px-5 py-3.5">
                      {t.absent > 0 ? <span className="text-xs font-bold text-red-600">{t.absent}</span> : <span className="text-xs text-gray-300">0</span>}
                    </td>
                    <td className="px-5 py-3.5 font-heading font-bold text-gray-900 whitespace-nowrap" dir="ltr" style={{ textAlign: 'right' }}>{formatCurrency(t.totalAmount, 'EGP')}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => navigate(`${ROUTES.ADMIN_TEACHERS}?teacherId=${t._id}`)}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors whitespace-nowrap">
                        عرض الملف ←
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-gray-200 disabled:opacity-40">السابق</button>
          <span className="px-3 py-2 text-xs text-gray-500">{page} / {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-gray-200 disabled:opacity-40">التالي</button>
        </div>
      )}
    </div>
  )
}
