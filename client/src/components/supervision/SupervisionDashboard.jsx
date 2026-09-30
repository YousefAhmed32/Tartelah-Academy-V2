import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, ClipboardCheck, Clock3, ExternalLink, FileText, ListTodo, ShieldCheck, UsersRound, Wallet } from 'lucide-react'
import { supervisionService } from '../../services/supervision.service.js'
import { academyDateKey, academyDayRange, formatTimeAr } from '../../utils/date.js'

const name = (person) => [person?.firstNameAr, person?.lastNameAr].filter(Boolean).join(' ') || '—'
const number = (value) => new Intl.NumberFormat('en-US').format(value || 0)
const time = formatTimeAr
const safeLink = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null } catch { return null } }
const dayRange = () => academyDayRange(academyDateKey(new Date()))

function Metric({ icon: Icon, label, value, detail, tone = 'violet', onClick }) {
  const tones = { violet: 'bg-violet-50 text-violet-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-800', sky: 'bg-sky-50 text-sky-700' }
  return <button type="button" onClick={onClick} className="group min-h-32 rounded-2xl border border-gray-200 bg-white p-4 text-right shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
    <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={19} aria-hidden="true" /></span>
    <strong className="block text-2xl font-extrabold text-gray-950" dir="ltr">{value}</strong>
    <span className="mt-1 block text-sm font-bold text-gray-800">{label}</span>
    <span className="mt-1 block text-xs text-gray-600">{detail}</span>
  </button>
}

function Action({ icon: Icon, label, detail, onClick }) {
  return <button type="button" onClick={onClick} className="flex min-h-20 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-right transition-colors hover:border-violet-300 hover:bg-violet-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon size={19} aria-hidden="true" /></span>
    <span className="min-w-0 flex-1"><strong className="block text-sm text-gray-950">{label}</strong><span className="mt-1 block text-xs text-gray-600">{detail}</span></span>
    <ArrowLeft size={16} className="flex-none text-gray-500" aria-hidden="true" />
  </button>
}

export default function SupervisionDashboard({ team, position, user, onSection, onReport }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer) }, [])
  const manager = position === 'manager'
  const academic = team === 'academic'
  const range = dayRange()
  const today = useQuery({ queryKey: ['supervision', 'dashboard', 'daily', team, range.from], queryFn: () => supervisionService.dailySessions({ team, ...range, limit: 50 }), refetchInterval: 30000 })
  const upcoming = useQuery({ queryKey: ['supervision', 'dashboard', 'upcoming', team, range.from], queryFn: () => supervisionService.dailySessions({ team, from: new Date().toISOString(), to: dayRange().to, limit: 1 }), refetchInterval: 30000 })
  const lateCutoff = new Date(now - 5 * 60000).toISOString()
  const overdue = useQuery({ queryKey: ['supervision', 'dashboard', 'late', team, range.from], queryFn: () => supervisionService.dailySessions({ team, from: range.from, to: new Date(Date.now() - 5 * 60000).toISOString(), lateStart: true, limit: 1 }), enabled: !academic && new Date(lateCutoff) > new Date(range.from), refetchInterval: 30000 })
  const reports = useQuery({ queryKey: ['supervision', 'dashboard', 'reports', position], queryFn: () => supervisionService.academicReports({ status: manager ? 'submitted' : 'draft', limit: 1 }), enabled: academic, refetchInterval: 60000 })
  const exceptions = useQuery({ queryKey: ['supervision', 'dashboard', 'exceptions', team], queryFn: () => supervisionService.exceptions({ team, status: 'open', limit: 1 }), refetchInterval: 60000 })
  const adjustments = useQuery({ queryKey: ['supervision', 'dashboard', 'adjustments'], queryFn: () => supervisionService.adjustmentRequests({ status: 'pending', limit: 1 }), enabled: !academic && manager, refetchInterval: 60000 })
  const assignments = useQuery({ queryKey: ['supervision', 'dashboard', 'assignments', team], queryFn: () => supervisionService.assignments({ team, limit: 1 }), refetchInterval: 60000 })
  const shifts = useQuery({ queryKey: ['supervision', 'dashboard', 'shifts', team], queryFn: () => supervisionService.shifts({ team, limit: 1 }), enabled: !academic && !manager, refetchInterval: 60000 })
  const rows = today.data?.data || []
  const delayed = overdue.data?.data?.[0]
  const nextSession = !academic && delayed || rows.find((row) => row.status === 'ongoing') || upcoming.data?.data?.find((row) => !['completed', 'cancelled'].includes(row.status))
  const minutesUntil = nextSession ? Math.ceil((new Date(nextSession.scheduledAt).getTime() - now) / 60000) : null
  const countdown = minutesUntil > 0 ? `متبقي ${minutesUntil} دقيقة` : nextSession?.status === 'ongoing' ? 'الحصة جارية الآن' : 'حان موعد الحصة'
  const title = academic ? manager ? 'الإشراف الأكاديمي' : 'متابعة الحلقات الأكاديمية' : manager ? 'الإشراف الإداري' : 'غرفة العمليات اليومية'
  const subtitle = manager ? 'القرارات والتغطية وتقارير الفريق في مكان واحد' : academic ? 'ابدأ من الحصة القادمة، ثم سجل المتابعة وسلم تقريرك' : 'راجع الحصص والحالات المفتوحة وسلّم ما يحتاج متابعة'
  const focusCount = academic ? reports.data?.total : manager ? adjustments.data?.total : exceptions.data?.total
  const focusLabel = academic ? manager ? 'تقارير بانتظار المراجعة' : 'مسودات متابعة تحتاج إكمالًا' : manager ? 'طلبات مالية تنتظر القرار' : 'حالات مفتوحة تحتاج إجراء'
  const focusSection = academic ? 'academic-reports' : 'exceptions'

  return <div dir="rtl" className="mx-auto max-w-[1480px] space-y-6 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold text-violet-700">ترتيلة أونلاين / {manager ? 'مدير الفريق' : 'فريق الإشراف'}</p><h1 className="mt-2 font-heading text-2xl font-extrabold text-gray-950 sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-gray-600">{subtitle}</p></div>
      <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">{name(user)}</span>
    </header>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
      <section className="relative overflow-hidden rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7" aria-label="الأولوية الآن">
        <div className="absolute inset-y-0 right-0 w-1.5 bg-violet-600" />
        <div className="flex items-center gap-2 text-xs font-bold text-violet-700"><Clock3 size={16} aria-hidden="true" /> الأولوية الآن</div>
        {today.isLoading || upcoming.isLoading ? <p className="mt-6 text-sm text-gray-600">جارٍ تحميل الحصص...</p> : today.isError || upcoming.isError ? <p role="alert" className="mt-6 text-sm text-red-700">تعذر تحميل حلقات اليوم. <button onClick={() => { today.refetch(); upcoming.refetch() }} className="font-bold underline">إعادة المحاولة</button></p> : nextSession ? <>
          <h2 className="mt-4 text-xl font-extrabold text-gray-950">{nextSession.titleAr || 'الحصة القادمة'}</h2>
          <p className="mt-2 text-sm text-gray-700">{name(nextSession.teacherId)} مع {name(nextSession.studentId)} · {time(nextSession.scheduledAt)}</p>
          <p className="mt-1 text-sm font-bold text-violet-800" aria-live="polite">{delayed && nextSession._id === delayed._id ? `لم يبدأ المعلم الحلقة بعد مرور ${Math.floor((now - new Date(nextSession.scheduledAt).getTime()) / 60000)} دقائق` : countdown}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {safeLink(nextSession.meetingLink) && <a href={safeLink(nextSession.meetingLink)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white no-underline transition-colors hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"><ExternalLink size={16} aria-hidden="true" /> دخول الحلقة</a>}
            {academic && !manager && <button onClick={() => onReport(nextSession)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50"><ClipboardCheck size={16} aria-hidden="true" /> تقرير المتابعة R1</button>}
            {!academic && delayed && nextSession._id === delayed._id && <button onClick={() => onSection('exceptions', nextSession)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100"><ListTodo size={16} aria-hidden="true" /> متابعة التأخير أو البديل</button>}
            <button onClick={() => onSection('daily', nextSession)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50"><CalendarDays size={16} aria-hidden="true" /> تفاصيل اليوم</button>
          </div>
        </> : <div className="mt-5"><h2 className="text-lg font-bold text-gray-950">لا توجد حصة قادمة اليوم</h2><p className="mt-1 text-sm text-gray-600">راجع الجدول أو التكليفات لمعرفة الحصص المسندة للفريق.</p><button onClick={() => onSection('daily')} className="mt-4 min-h-11 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white">عرض حلقات اليوم</button></div>}
      </section>
      <section className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5 sm:p-6" aria-label="ما يحتاج قرارًا">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-800"><ListTodo size={20} aria-hidden="true" /></span>
        <p className="mt-5 text-sm font-bold text-gray-800">{focusLabel}</p>
        <p className="mt-2 text-4xl font-extrabold text-gray-950" dir="ltr">{focusCount === undefined ? '—' : number(focusCount)}</p>
        <p className="mt-2 text-xs text-gray-600">{manager ? 'راجع الطلبات المفتوحة واتخذ القرار المناسب' : 'أكمل ما يخص شيفتك قبل التسليم'}</p>
        <button onClick={() => onSection(focusSection)} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-800 hover:underline">فتح القائمة <ArrowLeft size={16} aria-hidden="true" /></button>
      </section>
    </div>

    <section aria-label="مؤشرات الإشراف"><div className="mb-3 flex items-center justify-between"><h2 className="font-heading text-lg font-extrabold text-gray-950">نظرة سريعة</h2><span className="text-xs text-gray-600">بيانات مباشرة من المنصة</span></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric icon={CalendarDays} label="حلقات اليوم" value={today.data ? number(today.data.total) : '—'} detail="حسب نطاق مسؤوليتك" onClick={() => onSection('daily')} />
      <Metric icon={UsersRound} label="التكليفات الجارية" value={assignments.data ? number(assignments.data.total) : '—'} detail="فريق الإشراف الحالي" tone="sky" onClick={() => onSection('assignments')} />
      <Metric icon={academic ? FileText : ListTodo} label={academic ? manager ? 'تقارير تنتظر المراجعة' : 'مسودات R1' : 'حالات مفتوحة'} value={academic ? reports.data ? number(reports.data.total) : '—' : exceptions.data ? number(exceptions.data.total) : '—'} detail="تحتاج متابعة" tone="amber" onClick={() => onSection(focusSection)} />
      <Metric icon={manager ? ShieldCheck : ClipboardCheck} label={manager ? academic ? 'حالات مفتوحة' : 'قرارات مالية معلقة' : academic ? 'الحالات المفتوحة' : 'شيفتاتي'} value={!academic && !manager ? shifts.data ? number(shifts.data.total) : '—' : manager && !academic ? adjustments.data ? number(adjustments.data.total) : '—' : exceptions.data ? number(exceptions.data.total) : '—'} detail={!academic && !manager ? 'الجارية والقادمة' : manager ? 'للمراجعة والمتابعة' : 'قبل تسليم الشيفت'} tone="emerald" onClick={() => onSection(!academic && !manager ? 'shifts' : 'exceptions')} />
    </div></section>

    <section aria-label="إجراءات سريعة"><h2 className="mb-3 font-heading text-lg font-extrabold text-gray-950">ابدأ من هنا</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {(academic ? manager ? [
        [ClipboardCheck, 'مراجعة تقارير R1', 'تقارير الفريق وقرارات المراجعة', 'academic-reports'],
        [UsersRound, 'التكليفات', 'توزيع المعلمين ومتابعة الإسناد', 'assignments'],
        [FileText, 'الخطط والمناهج', 'متابعة تقدم الطلاب', 'academic-learning'],
        [ShieldCheck, 'التوجيهات', 'تعليمات الفريق والمعلمين', 'academic-directives'],
      ] : [
        [CalendarDays, 'حلقات اليوم', 'الدخول والرصد من بطاقة الحصة', 'daily'],
        [ClipboardCheck, 'تقارير المتابعة', 'مسوداتك والتقارير المرسلة', 'academic-reports'],
        [FileText, 'الطلاب والمناهج', 'خطط الطلاب المكلف بهم', 'academic-learning'],
        [ListTodo, 'تسليم الشيفت', 'راجع المعلق قبل المغادرة', 'handoff'],
      ] : manager ? [
        [Wallet, 'القرارات المالية', 'الخصومات والمكافآت المعلقة', 'exceptions'],
        [UsersRound, 'الشيفتات والتكليفات', 'وزع الفريق حسب الحاجة', 'shifts'],
        [ListTodo, 'الحالات والتعويضات', 'راجع ما يحتاج اعتمادًا', 'exceptions'],
        [ShieldCheck, 'التغطية', 'الحصص دون مشرف بالشيفت', 'coverage'],
      ] : [
        [CalendarDays, 'حلقات اليوم', 'راجع البداية والحضور والرابط', 'daily'],
        [ListTodo, 'الحالات والتعويضات', 'سجل المشكلة والمسؤول عنها', 'exceptions'],
        [UsersRound, 'الطلاب الجدد', 'تابع الحصة الأولى واستقرار الجدول', 'new-students'],
        [ClipboardCheck, 'تسليم الشيفت', 'انقل المعلق للشيفت التالي', 'handoff'],
      ]).map(([Icon, label, detail, section]) => <Action key={label} icon={Icon} label={label} detail={detail} onClick={() => onSection(section)} />)}
    </div></section>

    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm" aria-label="الحصص التالية"><div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-heading text-base font-extrabold text-gray-950">الحصص التالية</h2><p className="mt-1 text-xs text-gray-600">من جدول اليوم الفعلي</p></div><button onClick={() => onSection('daily')} className="min-h-11 text-sm font-bold text-violet-700 hover:underline">عرض الكل</button></div>
      {today.isError ? <p role="alert" className="p-5 text-sm text-red-700">تعذر تحميل الحصص.</p> : rows.length ? <div className="divide-y divide-gray-100">{rows.slice(0, 5).map((row) => <div key={row._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-bold text-gray-950">{row.titleAr || 'حصة'} · {time(row.scheduledAt)}</p><p className="mt-1 text-xs text-gray-600">{name(row.teacherId)} مع {name(row.studentId)}</p></div><button onClick={() => onSection('daily', row)} className="min-h-11 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-800 hover:bg-gray-50">فتح الحصة</button></div>)}</div> : <p className="p-6 text-sm text-gray-600">لا توجد حصص ظاهرة اليوم. راجع التكليفات أو غيّر اليوم من شاشة الحلقات.</p>}
    </section>
  </div>
}
