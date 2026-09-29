import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MessageSquareText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'
import { supervisionService } from '../../services/supervision.service.js'
import SupervisionAcademicDirectivesSection from '../../components/supervision/SupervisionAcademicDirectivesSection.jsx'

const labels = { pending: 'بانتظار ردك', acknowledged: 'اطلعت عليه', will_apply: 'سأطبقه', applied: 'تم التنفيذ', needs_discussion: 'أحتاج توضيحًا' }

export default function TeacherGuidancePage() {
  const [page, setPage] = useState(1)
  const [drafts, setDrafts] = useState({})
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['teacher-guidance', page], queryFn: () => supervisionService.teacherGuidance({ page, limit: 20 }) })
  const reply = useMutation({ mutationFn: ({ id, status, note }) => supervisionService.replyGuidance(id, { status, note }),
    onSuccess: () => { toast.success('وصل ردك للإشراف'); qc.invalidateQueries({ queryKey: ['teacher-guidance'] }) },
    onError: (error) => toast.error(error.response?.data?.message || 'تعذر إرسال الرد') })
  return <div dir="rtl" className="mx-auto max-w-5xl space-y-4 pb-12">
    <header className="rounded-3xl bg-gradient-to-bl from-[#21113d] to-[#513087] p-6 text-white"><MessageSquareText size={25} /><h1 className="mt-3 text-2xl font-extrabold">توجيهات الإشراف الأكاديمي</h1><p className="mt-2 text-sm leading-6 text-violet-100">تظهر هنا الملاحظات الموجهة لك من متابعة حصصك. ردك يصل للمشرف ومديره؛ تفاصيل التقييم الداخلية لا تظهر هنا.</p></header>
    {query.isLoading && <p className="rounded-xl bg-white p-5 text-sm">جارٍ تحميل التوجيهات...</p>}
    {query.isError && <p role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-700">تعذر تحميل التوجيهات. <button onClick={() => query.refetch()} className="underline">إعادة المحاولة</button></p>}
    {!query.isLoading && !query.isError && !query.data?.data?.length && <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-600">لا توجد توجيهات مطلوبة منك حاليًا.</p>}
    {(query.data?.data || []).map((row) => <article key={row._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-gray-900">{row.sessionId?.titleAr || 'متابعة حصة'}</h2><p className="mt-1 text-xs text-gray-600">{new Date(row.scheduledAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</p>{row.sessionId?._id && <Link to={ROUTES.TEACHER_QURAN_REPORT.replace(':sessionId', row.sessionId._id)} className="mt-1 inline-block min-h-11 py-3 text-xs font-bold text-violet-700 underline">فتح تقرير حصتي</Link>}</div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{labels[row.teacherReplyStatus] || labels.pending}</span></div><p className="mt-4 whitespace-pre-wrap rounded-xl bg-violet-50 p-4 text-sm leading-7 text-gray-900">{row.teacherGuidance}</p>{row.teacherReply && <p className="mt-2 text-xs text-gray-600">ردك السابق: {row.teacherReply}</p>}<form onSubmit={(event) => { event.preventDefault(); const draft = drafts[row._id] || { status: 'acknowledged', note: '' }; reply.mutate({ id: row._id, ...draft }) }} className="mt-4 grid gap-2 sm:grid-cols-[minmax(160px,220px)_1fr_auto]"><label className="text-sm font-semibold text-gray-700">حالتي<select value={drafts[row._id]?.status || 'acknowledged'} onChange={(event) => setDrafts({ ...drafts, [row._id]: { ...drafts[row._id], status: event.target.value } })} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="acknowledged">اطلعت عليه</option><option value="will_apply">سأطبقه</option><option value="applied">تم التنفيذ</option><option value="needs_discussion">أحتاج توضيحًا</option></select></label><label className="text-sm font-semibold text-gray-700">رد مختصر<input maxLength={2000} required={drafts[row._id]?.status === 'needs_discussion'} value={drafts[row._id]?.note || ''} onChange={(event) => setDrafts({ ...drafts, [row._id]: { ...drafts[row._id], note: event.target.value } })} placeholder="اكتب توضيحًا إذا لزم" className="mt-1 min-h-11 w-full rounded-xl border px-3" /></label><button disabled={reply.isPending} className="mt-auto min-h-11 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white disabled:opacity-50">إرسال الرد</button></form></article>)}
    {!!query.data?.totalPages && <nav aria-label="صفحات التوجيهات" className="flex items-center gap-2 text-sm"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">السابق</button><span>صفحة {page} من {query.data.totalPages}</span><button disabled={page >= query.data.totalPages} onClick={() => setPage(page + 1)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">التالي</button></nav>}
    <SupervisionAcademicDirectivesSection />
  </div>
}
