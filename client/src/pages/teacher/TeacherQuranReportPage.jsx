import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BookOpen, Save, Send } from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { quranReportService } from '../../services/quranReport.service.js'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const QUALITY_OPTIONS = [['excellent', 'ممتاز'], ['good', 'جيد'], ['fair', 'مقبول'], ['weak', 'ضعيف']]
const STATUS_LABELS = {
  draft: { label: 'مسودة', variant: 'gray' },
  submitted: { label: 'تم الإرسال — بانتظار المراجعة', variant: 'warning' },
  correction_requested: { label: 'مطلوب تصحيح', variant: 'danger' },
  approved: { label: 'معتمد', variant: 'success' },
}

function emptySurahRow() { return { enabled: false, surahNumber: '', fromAyah: '', toAyah: '', quality: 'good', teacherNotes: '' } }

export default function TeacherQuranReportPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [fields, setFields] = useState({ tajweedNotes: '', interactiveActivity: '', nextSessionHomework: '', teacherNotes: '', referenceLink: '' })
  const [memo, setMemo] = useState(emptySurahRow())
  const [revision, setRevision] = useState(emptySurahRow())

  const { data: detail, isLoading } = useQuery({
    queryKey: ['teacher', 'quran-report', sessionId],
    queryFn: () => quranReportService.getSessionReport(sessionId).then(r => r.data.data).catch(() => null),
  })

  useEffect(() => {
    if (detail?.report) {
      const { tajweedNotes, interactiveActivity, nextSessionHomework, teacherNotes, referenceLink } = detail.report
      setFields({ tajweedNotes: tajweedNotes || '', interactiveActivity: interactiveActivity || '', nextSessionHomework: nextSessionHomework || '', teacherNotes: teacherNotes || '', referenceLink: referenceLink || '' })
    }
  }, [detail])

  const set = (k, v) => setFields(p => ({ ...p, [k]: v }))
  const canEdit = !detail?.report || ['draft', 'correction_requested'].includes(detail.report.status)

  function buildLineItems(row) {
    if (!row.enabled || !row.surahNumber || !row.fromAyah || !row.toAyah) return []
    return [{ surahNumber: Number(row.surahNumber), fromAyah: Number(row.fromAyah), toAyah: Number(row.toAyah), quality: row.quality, teacherNotes: row.teacherNotes || undefined }]
  }

  const draftMut = useMutation({
    mutationFn: () => quranReportService.saveDraft(sessionId, fields),
    onSuccess: () => { toast.success('تم حفظ المسودة'); qc.invalidateQueries({ queryKey: ['teacher', 'quran-report', sessionId] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })
  const submitMut = useMutation({
    mutationFn: () => quranReportService.submitReport(sessionId, { ...fields, memorization: buildLineItems(memo), revision: buildLineItems(revision) }),
    onSuccess: () => { toast.success('تم إرسال تقرير الحصة'); qc.invalidateQueries({ queryKey: ['teacher', 'quran-report', sessionId] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner color="border-brand-purple" /></div>

  const session = detail?.session
  const report = detail?.report

  return (
    <div dir="rtl" className="space-y-6 max-w-3xl">
      <PageHeader title="تقرير الحلقة القرآنية"
        subtitle={session ? `${formatDateAr(session.scheduledAt)} — ${formatTimeAr(session.scheduledAt)}` : ''}
        actions={<Button variant="ghost" size="sm" onClick={() => navigate(-1)}>رجوع</Button>} />

      {report && (
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_LABELS[report.status]?.variant}>{STATUS_LABELS[report.status]?.label}</Badge>
          {report.status === 'correction_requested' && report.correctionReason && (
            <span className="text-xs text-red-600">{report.correctionReason}</span>
          )}
        </div>
      )}

      {!canEdit ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 text-sm">
          <div><b>ملاحظات التجويد:</b> {report.tajweedNotes || '—'}</div>
          <div><b>النشاط التفاعلي:</b> {report.interactiveActivity || '—'}</div>
          <div><b>واجب الحصة القادمة:</b> {report.nextSessionHomework || '—'}</div>
          <div><b>ملاحظات المعلم:</b> {report.teacherNotes || '—'}</div>
          {report.referenceLink && <div><b>مرجع:</b> <a href={report.referenceLink} target="_blank" rel="noreferrer" className="text-violet-600 underline">{report.referenceLink}</a></div>}
          {!!detail.memorization?.length && (
            <div><b>الحفظ:</b> {detail.memorization.map((m, i) => <span key={i} className="block text-xs">سورة {m.surahNumber}: {m.fromAyah}-{m.toAyah} ({m.quality})</span>)}</div>
          )}
          {!!detail.revision?.length && (
            <div><b>المراجعة:</b> {detail.revision.map((r, i) => <span key={i} className="block text-xs">سورة {r.surahNumber}: {r.fromAyah}-{r.toAyah} ({r.quality})</span>)}</div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <SurahRow title="الحفظ (اختياري)" icon={<BookOpen size={14} />} row={memo} setRow={setMemo} />
          <SurahRow title="المراجعة (اختياري)" icon={<BookOpen size={14} />} row={revision} setRow={setRevision} />

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات التجويد</label>
            <textarea className={`${inputCls} h-16 py-2 resize-none`} value={fields.tajweedNotes} onChange={e => set('tajweedNotes', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">النشاط التفاعلي/التعليمي</label>
            <input className={inputCls} value={fields.interactiveActivity} onChange={e => set('interactiveActivity', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">واجب الحصة القادمة</label>
            <input className={inputCls} value={fields.nextSessionHomework} onChange={e => set('nextSessionHomework', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات المعلم</label>
            <textarea className={`${inputCls} h-16 py-2 resize-none`} value={fields.teacherNotes} onChange={e => set('teacherNotes', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">رابط مرجعي (مصحف/تشغيلة/فيديو)</label>
            <input className={inputCls} value={fields.referenceLink} onChange={e => set('referenceLink', e.target.value)} placeholder="https://" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" icon={<Save size={14} />} loading={draftMut.isPending} onClick={() => draftMut.mutate()}>حفظ كمسودة</Button>
            <Button variant="purple" icon={<Send size={14} />} loading={submitMut.isPending} onClick={() => submitMut.mutate()}>إرسال التقرير</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SurahRow({ title, icon, row, setRow }) {
  const set = (k, v) => setRow(p => ({ ...p, [k]: v }))
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer mb-2">
        <input type="checkbox" checked={row.enabled} onChange={e => set('enabled', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-violet-600" />
        {icon} {title}
      </label>
      {row.enabled && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input type="number" min={1} max={114} placeholder="رقم السورة" className={inputCls} value={row.surahNumber} onChange={e => set('surahNumber', e.target.value)} />
          <input type="number" min={1} placeholder="من آية" className={inputCls} value={row.fromAyah} onChange={e => set('fromAyah', e.target.value)} />
          <input type="number" min={1} placeholder="إلى آية" className={inputCls} value={row.toAyah} onChange={e => set('toAyah', e.target.value)} />
          <select className={inputCls} value={row.quality} onChange={e => set('quality', e.target.value)}>
            {QUALITY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}
