import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { UserRoundCheck } from 'lucide-react'
import { supervisionService } from '../../services/supervision.service.js'
import { ROUTES } from '../../config/constants.js'

const date = (value) => value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const name = (person) => `${person?.firstNameAr || ''} ${person?.lastNameAr || ''}`.trim() || '—'
const lessonStatus = { completed: 'تمت', scheduled: 'مجدولة', ongoing: 'جارية', cancelled: 'ملغاة', missed: 'لم تتم', no_show: 'غياب', rescheduled: 'تغير موعدها' }

export default function SupervisionNewStudentsSection({ user }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [note, setNote] = useState('')
  const query = useQuery({ queryKey: ['supervision', 'new-students', page], queryFn: () => supervisionService.newStudents({ page, limit: 15 }) })
  const stabilize = useMutation({ mutationFn: ({ studentId, note: value }) => supervisionService.stabilizeStudent(studentId, value),
    onSuccess: () => { toast.success('تم تثبيت المواعيد'); setEditing(null); setNote(''); qc.invalidateQueries({ queryKey: ['supervision', 'new-students'] }) },
    onError: (error) => toast.error(error.response?.data?.message || 'تعذّر تثبيت المواعيد') })
  return <section dir="rtl" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="rounded-xl bg-violet-50 p-2 text-violet-700"><UserRoundCheck size={20} /></span><div><h2 className="text-lg font-bold text-gray-900">متابعة الطلاب الجدد</h2><p className="mt-1 text-sm text-gray-600">أول حلقة ورأي الطالب والجدول النشط من سجلات المنصة. جاهزية المعلم تُدار من مسارها الحالي.</p></div></div>{(user?.isPrimaryAdmin || user?.role === 'admin' && user?.permissions?.includes('teachers.manage')) && <Link to={ROUTES.ADMIN_TEACHER_ONBOARDING} className="inline-flex min-h-11 items-center rounded-xl border border-violet-200 px-4 text-sm font-bold text-violet-700 no-underline">إعداد معلم جديد</Link>}</div>
    {query.isLoading && <p className="text-sm text-gray-600">جارٍ تحميل الطلاب...</p>}
    {query.isError && <p role="alert" className="text-sm text-red-700">تعذّر تحميل متابعة الطلاب.</p>}
    {!query.isLoading && !query.data?.data?.length && <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-600">لا يوجد طلاب جدد في آخر 90 يومًا ضمن نطاقك.</p>}
    <div className="grid gap-3 lg:grid-cols-2">{query.data?.data?.map((row) => <article key={row._id} className="rounded-2xl border border-gray-100 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-gray-900">{name(row)}</h3><p className="mt-1 text-xs text-gray-600">أُضيف {date(row.createdAt)}</p></div><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${row.feedback?.stabilizedAt ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>{row.feedback?.stabilizedAt ? 'المواعيد مستقرة' : 'تحتاج متابعة'}</span></div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-600">أول حلقة</p><p className="font-semibold text-gray-800">{row.firstSession ? `${lessonStatus[row.firstSession.status] || row.firstSession.status} · ${date(row.firstSession.scheduledAt)}` : 'لم تُجدول بعد'}</p></div><div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-600">الجداول النشطة</p><p className="font-semibold text-gray-800">{row.activeScheduleCount}</p></div></div>
      <p className="mt-3 text-sm text-gray-700">{row.feedback?.feedbackAt ? `رأي الطالب: ${row.feedback.rating}/5${row.feedback.comment ? ` · ${row.feedback.comment}` : ''}` : 'لم يصل رأي الطالب بعد أول حلقة'}</p>
      {row.feedback?.stabilizedAt && <p className="mt-2 text-xs text-green-800">ثُبّتت في {date(row.feedback.stabilizedAt)} · {row.feedback.stabilizationNote}</p>}
      {!row.feedback?.stabilizedAt && row.firstCompletedSession && row.activeScheduleCount > 0 && <div className="mt-3">{editing === row._id ? <form onSubmit={(event) => { event.preventDefault(); stabilize.mutate({ studentId: row._id, note }) }} className="space-y-2"><label htmlFor={`stabilize-${row._id}`} className="text-sm font-semibold text-gray-800">سبب تثبيت المواعيد</label><textarea id={`stabilize-${row._id}`} required maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} className="w-full min-h-11 rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-violet-600" rows={2} /><div className="flex gap-2"><button disabled={stabilize.isPending} className="min-h-11 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white disabled:opacity-50">تأكيد التثبيت</button><button type="button" onClick={() => { setEditing(null); setNote('') }} className="min-h-11 rounded-xl border px-4 text-sm">إلغاء</button></div></form> : <button onClick={() => setEditing(row._id)} className="min-h-11 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white">تثبيت المواعيد</button>}</div>}
    </article>)}</div>
    <div className="mt-4 flex items-center justify-between text-sm text-gray-600"><span>صفحة {page} من {Math.max(1, query.data?.totalPages || 1)}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">السابق</button><button disabled={page >= (query.data?.totalPages || 1)} onClick={() => setPage(page + 1)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">التالي</button></div></div>
  </section>
}
