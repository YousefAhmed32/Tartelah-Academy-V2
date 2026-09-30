import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CalendarRange, History, Settings2, AlertCircle } from 'lucide-react'
import { supervisionService } from '../../services/supervision.service.js'
import { academyDateKey, academyDayRange } from '../../utils/date.js'

const input = 'min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100'
const dateTime = (value) => value ? new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const name = (person) => person ? `${person.firstNameAr || ''} ${person.lastNameAr || ''}`.trim() : '—'
const statusLabels = { covered: 'مغطاة', unassigned: 'بدون مشرف', inactive: 'المشرف موقوف', off_shift: 'خارج الشيفت' }
const activityLabels = {
  supervision_shift_create: 'إنشاء شيفت', supervision_shift_update: 'تعديل شيفت', supervision_shift_cancel: 'إلغاء شيفت',
  supervision_assignment_create: 'تكليف مشرف', supervision_assignment_replace: 'تبديل مشرف',
  supervision_person_update: 'تحديث عضو', supervision_settings_update: 'تحديث إعدادات',
  create_admin: 'إضافة عضو إشراف', update_user: 'تحديث حساب عضو', update_permissions: 'تعديل صلاحيات عضو', disable_user: 'إيقاف عضو', reactivate_user: 'تفعيل عضو',
}
const defaults = { notificationRecipients: ['manager', 'supervisor'], reportGraceMinutes: 120, escalateAfterMinutes: 0, priorityCategories: [] }

function Panel({ icon: Icon, title, detail, children }) {
  return <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
    <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4"><span className="rounded-xl bg-violet-50 p-2 text-violet-700"><Icon size={19} /></span><div><h2 className="font-heading text-lg font-bold text-gray-900">{title}</h2><p className="text-sm text-gray-500">{detail}</p></div></div>
    <div className="p-5">{children}</div>
  </section>
}
function Notice({ children }) { return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{children}</p> }

export function CoverageSection({ team, onAssignments }) {
  const [day, setDay] = useState(() => academyDateKey(new Date()))
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [team, day])
  const range = academyDayRange(day)
  const query = useQuery({ queryKey: ['supervision', 'coverage', team, day, page], queryFn: () => supervisionService.coverage({ team, ...range, page, limit: 20 }), enabled: !!range })
  const rows = query.data?.data || []
  return <Panel icon={CalendarRange} title="تغطية الحلقات" detail="المسؤول عن كل حلقة من جدول المنصة، مع مطابقة شيفته عند موعدها">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><label className="text-sm font-semibold text-gray-700">اليوم<input aria-label="يوم التغطية" type="date" value={day} onChange={(e) => setDay(e.target.value)} className={`mt-1 block ${input}`} /></label><p className="text-xs text-gray-500">فتح رابط الحلقة لا يثبت حضور المشرف داخل الاجتماع.</p></div>
    {query.isError ? <Notice>تعذّر تحميل التغطية</Notice> : query.isLoading ? <p className="text-sm text-gray-500">جارٍ تحميل الحلقات...</p> : rows.length ? <div className="space-y-2">{rows.map((row) => <article key={row._id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${row.coverage === 'covered' ? 'border-gray-100' : 'border-amber-200 bg-amber-50/50'}`}><div className="min-w-0"><p className="font-semibold text-gray-900">{name(row.teacherId)} · {name(row.studentId)}</p><p className="mt-1 text-sm text-gray-500">{dateTime(row.scheduledAt)} · {row.titleAr}</p><p className="mt-1 text-xs text-gray-500">{row.supervisors?.length ? `المشرفون: ${row.supervisors.map((s) => `${name(s)}${s.primary ? ' (أساسي)' : ''}${s.onShift ? ' · في الشيفت' : ''}`).join('، ')}` : 'لا يوجد مشرف مكلّف'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.coverage === 'covered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{statusLabels[row.coverage]}</span></article>)}</div> : <p className="rounded-xl bg-gray-50 p-7 text-center text-sm text-gray-500">لا توجد حلقات مجدولة في هذا اليوم.</p>}
    {query.data && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-gray-500">{query.data.total} حلقة في هذا اليوم · الصفحة {page}</p><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">السابق</button><button disabled={page * 20 >= query.data.total} onClick={() => setPage(page + 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">التالي</button></div></div>}
    <button onClick={onAssignments} className="mt-4 min-h-11 text-sm font-bold text-violet-700">تعديل التكليفات والشيفتات ←</button>
  </Panel>
}

export function ActivitySection({ team }) {
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [team])
  const query = useQuery({ queryKey: ['supervision', 'activity', team, page], queryFn: () => supervisionService.activity({ team, page, limit: 20 }) })
  const rows = query.data?.data || []
  return <Panel icon={History} title="سجل تغييرات الإشراف" detail="من غيّر الشيفت أو التكليف أو العضو، ومتى حدث ذلك">
    {query.isError ? <Notice>تعذّر تحميل السجل</Notice> : query.isLoading ? <p className="text-sm text-gray-500">جارٍ تحميل السجل...</p> : rows.length ? <ol className="space-y-2">{rows.map((row) => <li key={row._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-4 py-3"><span className="text-sm font-semibold text-gray-800">{activityLabels[row.action] || row.action}</span><span className="text-xs text-gray-500">{name(row.actorId)} · {dateTime(row.createdAt)}</span></li>)}</ol> : <p className="rounded-xl bg-gray-50 p-7 text-center text-sm text-gray-500">لا توجد تغييرات مسجلة لهذا الفريق.</p>}
    {query.data && <div className="mt-4 flex items-center justify-between text-sm text-gray-500"><span>{query.data.total} تغيير</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">السابق</button><button disabled={page * 20 >= query.data.total} onClick={() => setPage(page + 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">التالي</button></div></div>}
  </Panel>
}

export function SettingsSection({ team, admin }) {
  const qc = useQueryClient()
  const settingsQuery = useQuery({ queryKey: ['supervision', 'settings', team], queryFn: () => supervisionService.settings({ team }) })
  const subjectsQuery = useQuery({ queryKey: ['supervision', 'subjects'], queryFn: supervisionService.subjects })
  const [form, setForm] = useState(defaults)
  useEffect(() => { if (settingsQuery.data?.data) setForm({ ...defaults, ...settingsQuery.data.data }) }, [settingsQuery.data])
  const save = useMutation({ mutationFn: () => supervisionService.saveSettings({ team, ...form }), onSuccess: () => { toast.success('تم حفظ الإعدادات'); qc.invalidateQueries({ queryKey: ['supervision', 'settings', team] }); qc.invalidateQueries({ queryKey: ['supervision', 'activity', team] }) }, onError: (err) => toast.error(err.response?.data?.message || 'تعذّر حفظ الإعدادات') })
  const subjects = subjectsQuery.data?.data || []
  return <Panel icon={Settings2} title="سياسة الإشراف" detail="الإشعارات الحالية للشيفتات والتكليفات، وتجهيز سياسات تقارير المراحل القادمة">
    {settingsQuery.isError ? <Notice>تعذّر تحميل الإعدادات</Notice> : settingsQuery.isLoading ? <p className="text-sm text-gray-500">جارٍ التحميل...</p> : <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-5">
      <fieldset disabled={!admin}><legend className="mb-2 text-sm font-semibold text-gray-800">مستلمو تغييرات الشيفت والتكليف</legend><div className="flex flex-wrap gap-3">{[['manager', 'مدير الفريق'], ['supervisor', 'المشرف المكلّف'], ['admin', 'الأدمن']].map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm"><input type="checkbox" checked={form.notificationRecipients?.includes(value) || false} onChange={() => setForm((old) => ({ ...old, notificationRecipients: old.notificationRecipients.includes(value) ? old.notificationRecipients.filter((x) => x !== value) : [...old.notificationRecipients, value] }))} />{label}</label>)}</div></fieldset>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-gray-800">مهلة تقرير المشرف بعد الشيفت بالدقائق<input disabled={!admin} type="number" min="0" max="1440" value={form.reportGraceMinutes} onChange={(e) => setForm({ ...form, reportGraceMinutes: Number(e.target.value) })} className={`mt-2 block ${input}`} /></label><label className="text-sm font-semibold text-gray-800">التصعيد بعد انتهاء المهلة بالدقائق<input disabled={!admin} type="number" min="0" max="1440" value={form.escalateAfterMinutes} onChange={(e) => setForm({ ...form, escalateAfterMinutes: Number(e.target.value) })} className={`mt-2 block ${input}`} /></label></div>
      <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900"><AlertCircle size={17} className="mt-1 shrink-0" />تُطبّق مهلة التقرير والتصعيد على تقارير المشرف عند إطلاقها في V3-6. القيم محفوظة الآن ولا تُنشئ تقريرًا أو إنذارًا قبل وجوده.</p>
      <fieldset disabled={!admin}><legend className="mb-2 text-sm font-semibold text-gray-800">فئات ذات أولوية إضافية للمتابعة</legend><p className="mb-3 text-xs text-gray-500">كل الحلقات المكلف بها المشرف تظل مطلوبة، وهذه الفئات تبرزها لاحقًا في قائمة المتابعة.</p>{subjectsQuery.isError ? <Notice>تعذّر تحميل الفئات</Notice> : <div className="flex flex-wrap gap-2">{subjects.map((subject) => <label key={subject.key} className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm"><input type="checkbox" checked={form.priorityCategories?.includes(subject.key) || false} onChange={() => setForm((old) => ({ ...old, priorityCategories: old.priorityCategories.includes(subject.key) ? old.priorityCategories.filter((x) => x !== subject.key) : [...old.priorityCategories, subject.key] }))} />{subject.nameAr}</label>)}{form.priorityCategories?.filter((key) => !subjects.some((subject) => subject.key === key)).map((key) => <label key={key} className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm"><input type="checkbox" checked onChange={() => setForm((old) => ({ ...old, priorityCategories: old.priorityCategories.filter((x) => x !== key) }))} />فئة مؤرشفة: {key}</label>)}</div>}</fieldset>
      {admin && <button disabled={save.isPending || subjectsQuery.isError} className="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white disabled:opacity-50">{save.isPending ? 'جارٍ الحفظ...' : 'حفظ السياسة'}</button>}
    </form>}
  </Panel>
}
