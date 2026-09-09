import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileBarChart, RefreshCw, Check, Eye } from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import MonthlyReportDetailModal from '../../components/admin/MonthlyReportDetailModal.jsx'
import { formatCurrency } from '../../utils/format.js'
import { monthlyReportService } from '../../services/monthlyReport.service.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const STATUS_LABELS = {
  draft: { label: 'مسودة', variant: 'gray' },
  submitted: { label: 'بانتظار المراجعة', variant: 'warning' },
  needs_completion: { label: 'يحتاج إكمال', variant: 'danger' },
  reviewed: { label: 'تمت المراجعة', variant: 'blue' },
  approved: { label: 'معتمد', variant: 'success' },
}
const TABS = [
  { value: '', label: 'الكل' }, { value: 'submitted', label: 'بانتظار المراجعة' },
  { value: 'reviewed', label: 'تمت المراجعة' }, { value: 'approved', label: 'معتمد' },
]

export default function AdminMonthlyReportsPage() {
  const [searchParams] = useSearchParams()
  // Deep-linked from a teacher's unified profile ("?teacherId=...") — shows
  // that teacher's full report history, not just the pending-review default.
  const teacherId = searchParams.get('teacherId') || undefined
  const [status, setStatus] = useState(teacherId ? '' : 'submitted')
  const [selected, setSelected] = useState(null)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [note, setNote] = useState('')
  const [inspectionReport, setInspectionReport] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'monthly-reports', status, teacherId],
    queryFn: () => monthlyReportService.getAllReports({ status: status || undefined, teacherId, limit: 30 }).then(r => r.data.data),
  })

  const generateAllMut = useMutation({
    mutationFn: () => { const now = new Date(); return monthlyReportService.generateAll({ year: now.getFullYear(), month: now.getMonth() + 1 }) },
    onSuccess: (res) => { toast.success(`تم توليد ${res.data.data.created} تقرير`); qc.invalidateQueries({ queryKey: ['admin', 'monthly-reports'] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })
  const reviewMut = useMutation({
    mutationFn: (id) => monthlyReportService.markReviewed(id, undefined),
    onSuccess: () => { toast.success('تم تعليمه كمُراجَع'); qc.invalidateQueries({ queryKey: ['admin', 'monthly-reports'] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })
  const approveMut = useMutation({
    mutationFn: (id) => monthlyReportService.approveReport(id),
    onSuccess: () => { toast.success('تم اعتماد التقرير'); qc.invalidateQueries({ queryKey: ['admin', 'monthly-reports'] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })
  const completionMut = useMutation({
    mutationFn: () => monthlyReportService.requestCompletion(selected._id, note),
    onSuccess: () => { toast.success('تم طلب الإكمال'); setCompletionOpen(false); qc.invalidateQueries({ queryKey: ['admin', 'monthly-reports'] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const reports = data?.reports || []

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader title="التقارير الشهرية للمعلمين" subtitle="مراجعة واعتماد التقارير الشهرية التلقائية"
        actions={<Button variant="outline" size="sm" icon={<RefreshCw size={14} />} loading={generateAllMut.isPending} onClick={() => generateAllMut.mutate()}>توليد تقارير هذا الشهر</Button>} />

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setStatus(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${status === t.value ? 'bg-brand-purple text-white shadow-md' : 'bg-white text-[#7c6aaa] border border-[#e8e0f5]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : !reports.length ? (
        <div className="card-light p-12 text-center">
          <FileBarChart size={48} strokeWidth={1.3} color="#7c6aaa" className="mb-4 mx-auto" />
          <p className="text-[#7c6aaa] text-sm">لا توجد تقارير بهذه الحالة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r._id} className="card-light p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar firstName={r.teacherId?.firstNameAr} lastName={r.teacherId?.lastNameAr} size="sm" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-brand-textBody truncate">{r.teacherId?.firstNameAr} {r.teacherId?.lastNameAr}</div>
                  <div className="text-xs text-[#7c6aaa]">{r.periodKey} — {r.completedSessions} حصة — صافي {formatCurrency(r.netPayable)}</div>
                </div>
              </div>
              <Badge variant={STATUS_LABELS[r.status]?.variant}>{STATUS_LABELS[r.status]?.label}</Badge>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" icon={<Eye size={13} />} onClick={() => setInspectionReport(r)}>
                  عرض التقرير الشامل
                </Button>
                {r.status === 'submitted' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => { setSelected(r); setNote(''); setCompletionOpen(true) }}>طلب إكمال</Button>
                    <Button size="sm" variant="outline" loading={reviewMut.isPending} onClick={() => reviewMut.mutate(r._id)}>تمت المراجعة</Button>
                    <Button size="sm" variant="purple" icon={<Check size={13} />} loading={approveMut.isPending} onClick={() => approveMut.mutate(r._id)}>اعتماد</Button>
                  </>
                )}
                {r.status === 'reviewed' && (
                  <Button size="sm" variant="purple" icon={<Check size={13} />} loading={approveMut.isPending} onClick={() => approveMut.mutate(r._id)}>اعتماد</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={completionOpen} onClose={() => setCompletionOpen(false)} title="طلب إكمال التقرير"
        footer={<><Button variant="ghost" onClick={() => setCompletionOpen(false)}>إلغاء</Button><Button variant="purple" loading={completionMut.isPending} disabled={!note.trim()} onClick={() => completionMut.mutate()}>إرسال</Button></>}>
        <div dir="rtl">
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">ما المطلوب إكماله؟</label>
          <textarea className={`${inputCls} h-24 py-2 resize-none`} value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </Modal>

      {inspectionReport && (
        <MonthlyReportDetailModal
          open={!!inspectionReport}
          onClose={() => setInspectionReport(null)}
          report={inspectionReport}
        />
      )}
    </div>
  )
}
