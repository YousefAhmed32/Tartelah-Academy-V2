import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BookOpen, Check, AlertTriangle, Eye } from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import QuranReportDetailModal from '../../components/admin/QuranReportDetailModal.jsx'
import { formatDateAr } from '../../utils/date.js'
import { quranReportService } from '../../services/quranReport.service.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const STATUS_LABELS = {
  draft: { label: 'مسودة', variant: 'gray' },
  submitted: { label: 'بانتظار المراجعة', variant: 'warning' },
  correction_requested: { label: 'مطلوب تصحيح', variant: 'danger' },
  approved: { label: 'معتمد', variant: 'success' },
}
const TABS = [
  { value: '', label: 'الكل' },
  { value: 'submitted', label: 'بانتظار المراجعة' },
  { value: 'correction_requested', label: 'مطلوب تصحيح' },
  { value: 'approved', label: 'معتمد' },
]

export default function AdminQuranReportsPage() {
  const [searchParams] = useSearchParams()
  // Deep-linked from a teacher's unified profile ("?teacherId=...") or a
  // student's profile ("?studentId=...") — shows that person's full report
  // history rather than the pending-review default.
  const teacherId = searchParams.get('teacherId') || undefined
  const studentId = searchParams.get('studentId') || undefined
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState(teacherId || studentId ? '' : 'submitted')
  const [correctionOpen, setCorrectionOpen] = useState(null)
  const [correctionReason, setCorrectionReason] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const qc = useQueryClient()

  const { data: overview } = useQuery({ queryKey: ['admin', 'quran-reports', 'overview'], queryFn: () => quranReportService.getOverview({}).then(r => r.data.data) })
  const { data: overdueTeachers } = useQuery({ queryKey: ['admin', 'quran-reports', 'overdue-teachers'], queryFn: () => quranReportService.getOverdueTeachers(24).then(r => r.data.data) })
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quran-reports', page, status, teacherId, studentId],
    queryFn: () => quranReportService.getAllReports({ page, limit: 20, status: status || undefined, teacherId, studentId }).then(r => r.data.data),
    placeholderData: (prev) => prev,
  })

  const approveMut = useMutation({
    mutationFn: (id) => quranReportService.approveReport(id),
    onSuccess: () => { toast.success('تم اعتماد التقرير'); qc.invalidateQueries({ queryKey: ['admin', 'quran-reports'] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })
  const correctionMut = useMutation({
    mutationFn: () => quranReportService.requestCorrection(correctionOpen._id, correctionReason),
    onSuccess: () => { toast.success('تم طلب التصحيح'); setCorrectionOpen(null); qc.invalidateQueries({ queryKey: ['admin', 'quran-reports'] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const reports = data?.reports || []

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader title="تقارير الحلقات القرآنية" subtitle="مراجعة واعتماد تقارير حصص المعلمين" />

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'حصص مكتملة', value: overview.attendanceCompleted },
            { label: 'تقارير مكتملة', value: overview.reportCompleted },
            { label: 'تقارير ناقصة', value: overview.missingReport, danger: true },
            { label: 'ملغاة/مؤجلة', value: overview.cancelled + overview.postponed },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs text-gray-400 font-semibold mb-1">{s.label}</div>
              <div className={`text-lg font-bold ${s.danger ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {!!overdueTeachers?.length && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold text-sm"><AlertTriangle size={15} /> معلمون لديهم تقارير متأخرة</div>
          <div className="flex flex-wrap gap-2">
            {overdueTeachers.map(t => (
              <span key={t.teacherId} className="text-xs bg-white px-3 py-1.5 rounded-full border border-amber-200">{t.teacherName} — {t.overdueCount} تقرير</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.value} onClick={() => { setStatus(t.value); setPage(1) }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${status === t.value ? 'bg-brand-purple text-white shadow-md' : 'bg-white text-[#7c6aaa] border border-[#e8e0f5]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : !reports.length ? (
        <div className="card-light p-12 text-center">
          <BookOpen size={48} strokeWidth={1.3} color="#7c6aaa" className="mb-4 mx-auto" />
          <p className="text-[#7c6aaa] text-sm">لا توجد تقارير بهذه الحالة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r._id} className="card-light p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar firstName={r.studentId?.firstNameAr} lastName={r.studentId?.lastNameAr} size="sm" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-brand-textBody truncate">{r.studentId?.firstNameAr} {r.studentId?.lastNameAr}</div>
                  <div className="text-xs text-[#7c6aaa]">معلم: {r.teacherId?.firstNameAr} {r.teacherId?.lastNameAr} — {formatDateAr(r.sessionId?.scheduledAt || r.createdAt)}</div>
                </div>
              </div>
              <Badge variant={STATUS_LABELS[r.status]?.variant}>{STATUS_LABELS[r.status]?.label}</Badge>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" icon={<Eye size={13} />} onClick={() => setSelectedReport(r)}>
                  عرض التفاصيل
                </Button>
                {r.status === 'submitted' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => { setCorrectionOpen(r); setCorrectionReason('') }}>طلب تصحيح</Button>
                    <Button size="sm" variant="purple" icon={<Check size={13} />} loading={approveMut.isPending} onClick={() => approveMut.mutate(r._id)}>اعتماد</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {data?.totalPages > 1 && <div className="flex justify-center"><Pagination current={page} total={data.totalPages} onChange={setPage} /></div>}

      <Modal open={!!correctionOpen} onClose={() => setCorrectionOpen(null)} title="طلب تصحيح التقرير"
        footer={<><Button variant="ghost" onClick={() => setCorrectionOpen(null)}>إلغاء</Button><Button variant="purple" loading={correctionMut.isPending} disabled={!correctionReason.trim()} onClick={() => correctionMut.mutate()}>إرسال</Button></>}>
        <div dir="rtl">
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">سبب طلب التصحيح</label>
          <textarea className={`${inputCls} h-24 py-2 resize-none`} value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} />
        </div>
      </Modal>

      {selectedReport && (
        <QuranReportDetailModal
          open={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
        />
      )}
    </div>
  )
}
