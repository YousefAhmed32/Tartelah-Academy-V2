import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileBarChart, ChevronLeft } from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatCurrency, formatNumber } from '../../utils/format.js'
import { monthlyReportService } from '../../services/monthlyReport.service.js'

const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none'
const STATUS_LABELS = {
  draft: { label: 'مسودة — بانتظار مراجعتك', variant: 'gray' },
  submitted: { label: 'تم الإرسال', variant: 'warning' },
  needs_completion: { label: 'يحتاج إكمال', variant: 'danger' },
  reviewed: { label: 'تمت المراجعة', variant: 'blue' },
  approved: { label: 'معتمد', variant: 'success' },
}

export default function TeacherMonthlyReportsPage() {
  const [openId, setOpenId] = useState(null)
  const { data, isLoading } = useQuery({ queryKey: ['teacher', 'monthly-reports'], queryFn: () => monthlyReportService.getMyReports({ limit: 12 }).then(r => r.data.data) })
  const reports = data?.reports || []
  const openReport = reports.find(r => r._id === openId)

  if (openId) return <ReportDetail report={openReport} onBack={() => setOpenId(null)} />

  return (
    <div dir="rtl">
      <PageHeader title="تقاريري الشهرية" subtitle="تقرير أداء شهري تلقائي — راجعه وأضف ملاحظاتك ثم أرسله للإدارة" />
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : !reports.length ? (
        <div className="card-light p-12 text-center">
          <FileBarChart size={48} strokeWidth={1.3} color="#7c6aaa" className="mb-4 mx-auto" />
          <p className="text-[#7c6aaa] text-sm">لا توجد تقارير شهرية بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <button key={r._id} onClick={() => setOpenId(r._id)} className="w-full card-light p-4 flex items-center justify-between hover:shadow-md transition-shadow text-right">
              <div>
                <div className="font-bold text-brand-textBody">{r.periodKey}</div>
                <div className="text-xs text-[#7c6aaa]">{r.completedSessions} حصة مكتملة — صافي {formatCurrency(r.netPayable)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_LABELS[r.status]?.variant}>{STATUS_LABELS[r.status]?.label}</Badge>
                <ChevronLeft size={16} className="text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ReportDetail({ report, onBack }) {
  const qc = useQueryClient()
  const [teacherNotes, setTeacherNotes] = useState(report.teacherNotes || '')
  const [challenges, setChallenges] = useState(report.challenges || '')
  const [recommendations, setRecommendations] = useState(report.recommendations || '')
  const canEdit = ['draft', 'needs_completion'].includes(report.status)

  const submitMut = useMutation({
    mutationFn: () => monthlyReportService.submitMyReport(report._id, { teacherNotes, challenges, recommendations }),
    onSuccess: () => { toast.success('تم إرسال التقرير الشهري'); qc.invalidateQueries({ queryKey: ['teacher', 'monthly-reports'] }); onBack() },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <div dir="rtl" className="space-y-6 max-w-3xl">
      <PageHeader title={`التقرير الشهري — ${report.periodKey}`} actions={<Button variant="ghost" size="sm" onClick={onBack}>رجوع</Button>} />
      <div className="flex items-center gap-2"><Badge variant={STATUS_LABELS[report.status]?.variant}>{STATUS_LABELS[report.status]?.label}</Badge></div>
      {report.status === 'needs_completion' && report.adminNotes && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">{report.adminNotes}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {[
          ['حصص مجدولة', report.scheduledSessions], ['حصص مكتملة', report.completedSessions],
          ['ملغاة', report.cancelledSessions], ['مؤجلة', report.postponedSessions],
          ['تقارير مرسلة', report.submittedReports], ['تقارير ناقصة', report.missingReports],
          ['نسبة الحضور', `${report.attendanceSummary?.completionRate ?? 0}%`], ['نسبة الالتزام بالموعد', `${report.attendanceSummary?.punctualityRate ?? 0}%`],
        ].map(([label, value], i) => (
          <div key={i}><div className="text-xs text-gray-400">{label}</div><div className="font-bold text-gray-900">{formatNumber(value)}</div></div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">المستحق الأساسي</span><b>{formatCurrency(report.grossEntitlement)}</b></div>
        <div className="flex justify-between"><span className="text-gray-500">المكافآت</span><b className="text-emerald-600">{formatCurrency(report.bonusesTotal)}</b></div>
        <div className="flex justify-between"><span className="text-gray-500">الخصومات</span><b className="text-red-600">{formatCurrency(report.deductionsTotal)}</b></div>
        <div className="flex justify-between pt-2 border-t border-gray-100"><span className="font-bold text-gray-700">صافي المستحق</span><b className="text-violet-700 text-lg">{formatCurrency(report.netPayable)}</b></div>
      </div>

      {canEdit ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div><label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظاتك</label><textarea className={`${inputCls} h-20`} value={teacherNotes} onChange={e => setTeacherNotes(e.target.value)} /></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1.5 block">التحديات هذا الشهر</label><textarea className={`${inputCls} h-20`} value={challenges} onChange={e => setChallenges(e.target.value)} /></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1.5 block">توصياتك</label><textarea className={`${inputCls} h-20`} value={recommendations} onChange={e => setRecommendations(e.target.value)} /></div>
          <Button variant="purple" loading={submitMut.isPending} onClick={() => submitMut.mutate()}>إرسال التقرير</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2 text-sm">
          <div><b>ملاحظاتك:</b> {report.teacherNotes || '—'}</div>
          <div><b>التحديات:</b> {report.challenges || '—'}</div>
          <div><b>التوصيات:</b> {report.recommendations || '—'}</div>
        </div>
      )}
    </div>
  )
}
