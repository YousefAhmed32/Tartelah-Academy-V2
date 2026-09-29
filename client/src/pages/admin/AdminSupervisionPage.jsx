import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CalendarDays, UsersRound, UserRoundCheck, Plus, XCircle, ArrowLeftRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'
import { supervisionService } from '../../services/supervision.service.js'
import { ROUTES } from '../../config/constants.js'
import Select from '../../components/ui/Select.jsx'
import { CoverageSection, ActivitySection, SettingsSection } from '../../components/supervision/SupervisionManagementSections.jsx'
import SupervisionDailySection from '../../components/supervision/SupervisionDailySection.jsx'
import SupervisionExceptionsSection from '../../components/supervision/SupervisionExceptionsSection.jsx'
import SupervisionHandoffSection from '../../components/supervision/SupervisionHandoffSection.jsx'
import SupervisionNewStudentsSection from '../../components/supervision/SupervisionNewStudentsSection.jsx'
import SupervisionAcademicReportsSection from '../../components/supervision/SupervisionAcademicReportsSection.jsx'
import SupervisionAcademicLearningSection from '../../components/supervision/SupervisionAcademicLearningSection.jsx'
import SupervisionAcademicDirectivesSection from '../../components/supervision/SupervisionAcademicDirectivesSection.jsx'
import SupervisionPeriodicSection from '../../components/supervision/SupervisionPeriodicSection.jsx'

const TEAMS = { academic: 'الأكاديمي', administrative: 'الإداري' }
const inputClass = 'w-full min-h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100'
const dateTime = (value) => value ? new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : 'مستمر'
const name = (person) => person ? `${person.firstNameAr || ''} ${person.lastNameAr || ''}`.trim() : '—'
const toIso = (local) => local ? new Date(local).toISOString() : null
const toLocalInput = (value) => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const initialShift = { name: '', startsAt: '', endsAt: '', members: [] }
const initialAssignment = { teacherId: '', supervisorId: '', startsAt: '', endsAt: '' }

function Field({ label, children }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</span>{children}</label>
}

function Section({ icon: Icon, title, description, action, children }) {
  return <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-violet-50 p-2 text-violet-700"><Icon size={19} /></span><div><h2 className="font-heading text-lg font-bold text-gray-900">{title}</h2><p className="text-sm text-gray-500">{description}</p></div></div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
}

function Empty({ message }) { return <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">{message}</p> }
function Error({ message }) { return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> }

export default function AdminSupervisionPage({ lockedTeam = null, workspacePosition = null }) {
  const { user, hasPermission } = useAuthStore()
  const admin = user?.isPrimaryAdmin || user?.role === 'admin'
  const [team, setTeam] = useState(lockedTeam || user?.supervisionTeam || 'academic')
  const [tab, setTab] = useState('overview')
  const [exceptionSessionId, setExceptionSessionId] = useState(null)
  const [academicTarget, setAcademicTarget] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const [dailyTarget, setDailyTarget] = useState(null)
  const [showShift, setShowShift] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState(null)
  const [shift, setShift] = useState(initialShift)
  const [shiftHistory, setShiftHistory] = useState(false)
  const [showAssignment, setShowAssignment] = useState(false)
  const [assignment, setAssignment] = useState(initialAssignment)
  const [teacherSearch, setTeacherSearch] = useState('')
  const [replaceId, setReplaceId] = useState(null)
  const [replacementId, setReplacementId] = useState('')
  const [effectiveAt, setEffectiveAt] = useState('')
  const [history, setHistory] = useState(false)
  const [expandedAssignmentId, setExpandedAssignmentId] = useState(null)
  const [editingPerson, setEditingPerson] = useState(null)
  const [personForm, setPersonForm] = useState(null)
  const [peoplePage, setPeoplePage] = useState(1)
  const [peopleSearch, setPeopleSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedSupervisor, setSelectedSupervisor] = useState(null)
  const qc = useQueryClient()
  const canManage = Boolean(hasPermission('supervision.manage') && (admin || (user?.supervisionTeam === team && user?.supervisionPosition === 'manager')))
  const isManager = user?.supervisionPosition === 'manager'
  const heading = workspacePosition ? `${workspacePosition === 'manager' ? 'لوحة مدير الإشراف' : 'لوحة المشرف'} ${TEAMS[team]}` : admin ? 'مركز الإشراف' : `${isManager ? 'لوحة مدير الإشراف' : 'لوحة المشرف'} ${TEAMS[team]}`

  const peopleQuery = useQuery({ queryKey: ['supervision', 'people', team, peoplePage, peopleSearch], queryFn: () => supervisionService.people({ team, page: peoplePage, search: peopleSearch, limit: 50 }), enabled: tab === 'people' })
  const peopleTotalQuery = useQuery({ queryKey: ['supervision', 'people-total', team], queryFn: () => supervisionService.people({ team, limit: 1 }), enabled: tab === 'overview' })
  const selectableQuery = useQuery({ queryKey: ['supervision', 'selectable-people', team, memberSearch], queryFn: () => supervisionService.people({ team, search: memberSearch, limit: 50 }), enabled: Boolean(canManage && (showShift || showAssignment || !!replaceId)) })
  const shiftsQuery = useQuery({ queryKey: ['supervision', 'shifts', team, shiftHistory], queryFn: () => supervisionService.shifts({ team, history: shiftHistory, limit: 50 }), enabled: tab === 'overview' || tab === 'shifts' })
  const assignmentsQuery = useQuery({ queryKey: ['supervision', 'assignments', team, history], queryFn: () => supervisionService.assignments({ team, history, limit: 50 }), enabled: tab === 'overview' || tab === 'assignments' })
  const teachersQuery = useQuery({ queryKey: ['supervision', 'teachers', teacherSearch], queryFn: () => supervisionService.teachers({ search: teacherSearch, limit: 50 }), enabled: Boolean(canManage && showAssignment) })
  const studentsQuery = useQuery({ queryKey: ['supervision', 'assignment-students', expandedAssignmentId], queryFn: () => supervisionService.assignmentStudents(expandedAssignmentId, { limit: 50 }), enabled: !!expandedAssignmentId })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const todayKey = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const coverageTodayQuery = useQuery({ queryKey: ['supervision', 'coverage-summary', team, todayKey], queryFn: () => supervisionService.coverage({ team, from: today.toISOString(), to: tomorrow.toISOString(), limit: 1 }), enabled: Boolean(canManage && tab === 'overview') })
  const subjectsQuery = useQuery({ queryKey: ['supervision', 'subjects'], queryFn: supervisionService.subjects, enabled: Boolean(admin && tab === 'people') })
  const members = peopleQuery.data?.data || []
  const selectableMembers = selectableQuery.data?.data || []
  const supervisors = [...new Map([...(selectedSupervisor ? [selectedSupervisor] : []), ...selectableMembers].filter((p) => p.supervisionPosition === 'supervisor' && p.isActive).map((p) => [p._id, p])).values()]
  const shifts = shiftsQuery.data?.data || []
  const selectedShiftMembers = shifts.find((row) => row._id === editingShiftId)?.members || []
  const availableMembers = [...new Map([...selectedShiftMembers, ...selectableMembers].map((p) => [p._id, p])).values()]
  const assignments = assignmentsQuery.data?.data || []
  const message = (err) => toast.error(err.response?.data?.message || 'تعذّر حفظ التغيير، حاول مرة أخرى')
  const refresh = () => qc.invalidateQueries({ queryKey: ['supervision'] })

  const saveShift = useMutation({ mutationFn: () => {
    const data = { ...shift, team, startsAt: toIso(shift.startsAt), endsAt: toIso(shift.endsAt), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    return editingShiftId ? supervisionService.updateShift(editingShiftId, data) : supervisionService.createShift(data)
  }, onSuccess: () => { toast.success(editingShiftId ? 'تم تحديث الشيفت' : 'تم إنشاء الشيفت'); setShift(initialShift); setEditingShiftId(null); setShowShift(false); refresh() }, onError: message })
  const cancelShift = useMutation({ mutationFn: (id) => supervisionService.cancelShift(id), onSuccess: () => { toast.success('تم إلغاء الشيفت وحفظ سجله'); refresh() }, onError: message })
  const createAssignment = useMutation({ mutationFn: () => supervisionService.createAssignment({ ...assignment, team, startsAt: toIso(assignment.startsAt), endsAt: toIso(assignment.endsAt), primary: true }), onSuccess: () => { toast.success('تم تكليف المشرف'); setAssignment(initialAssignment); setSelectedSupervisor(null); setShowAssignment(false); refresh() }, onError: message })
  const replaceAssignment = useMutation({ mutationFn: () => supervisionService.replaceAssignment(replaceId, { supervisorId: replacementId, effectiveAt: toIso(effectiveAt) }), onSuccess: () => { toast.success('تم التبديل وحفظ المسؤولية السابقة'); setReplaceId(null); setReplacementId(''); setEffectiveAt(''); refresh() }, onError: message })
  const savePerson = useMutation({ mutationFn: () => supervisionService.updatePerson(editingPerson, personForm), onSuccess: () => { toast.success('تم تحديث عضو الفريق'); setEditingPerson(null); setPersonForm(null); refresh() }, onError: message })

  return <div dir="rtl" className="space-y-5 pb-12">
    <div className="rounded-3xl bg-gradient-to-bl from-[#21113d] via-[#32175a] to-[#513087] p-5 text-white sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-wide text-violet-200">ترتيلة أونلاين · المرحلة الثالثة</p><h1 className="mt-2 font-heading text-2xl font-extrabold sm:text-3xl">{heading}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-violet-100">الفريق والشيفتات والتكليفات في مكان واحد. تظهر بيانات كل شخص حسب دوره والفترة المسندة إليه.</p></div><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold">{admin ? 'إدارة عامة' : isManager ? 'مدير فريق' : 'مشرف'}</span></div>
      {admin && !lockedTeam && <div className="mt-5 max-w-xs"><Field label="الفريق"><Select value={team} onValueChange={(value) => { setTeam(value); setTab('overview'); setShowShift(false); setShowAssignment(false); setEditingPerson(null); setReplaceId(null); setPeoplePage(1); setPeopleSearch(''); setMemberSearch(''); setSelectedSupervisor(null) }} options={[{ value: 'academic', label: 'الإشراف الأكاديمي' }, { value: 'administrative', label: 'الإشراف الإداري' }]} /></Field></div>}
    </div>

    <div role="tablist" aria-label="أقسام الإشراف" className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
      {[['overview', 'نظرة عامة'], ['daily', 'حلقات اليوم'], ['periodic-metrics', 'الإحصاءات'], ...(team === 'academic' ? [['academic-reports', 'تقارير المتابعة'], ['academic-learning', 'الطلاب والمناهج'], ['academic-directives', 'التوجيهات'], ['periodic-reports', 'التقارير الدورية'], ['academic-search', 'بحث أكاديمي']] : []), ['exceptions', 'الحالات والتعويضات'], ['handoff', 'تسليم الشيفت'], ...(team === 'administrative' ? [['new-students', 'الطلاب الجدد']] : []), ['coverage', 'تغطية الحلقات'], ['shifts', 'الشيفتات'], ['assignments', 'التكليفات'], ['people', 'الفريق'], ['activity', 'سجل التغييرات'], ['settings', 'السياسات']].filter(([key]) => canManage || !['coverage', 'activity', 'settings'].includes(key)).map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`min-h-11 rounded-xl px-4 text-sm font-bold transition-colors ${tab === key ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-violet-50'}`}>{label}</button>)}
    </div>

    {tab === 'daily' && <SupervisionDailySection team={team} user={user} initialTarget={dailyTarget} onOpenException={(sessionId) => { setExceptionSessionId(sessionId); setTab('exceptions') }} />}
    {team === 'academic' && tab === 'academic-reports' && <SupervisionAcademicReportsSection user={user} initialTarget={reportTarget} />}
    {team === 'academic' && tab === 'academic-learning' && <SupervisionAcademicLearningSection user={user} initialTarget={academicTarget} />}
    {team === 'academic' && tab === 'academic-directives' && <SupervisionAcademicDirectivesSection user={user} />}
    {['periodic-metrics', 'periodic-reports', 'academic-search'].includes(tab) && <SupervisionPeriodicSection user={user} team={team} mode={tab === 'periodic-metrics' ? 'metrics' : tab === 'periodic-reports' ? 'reports' : 'search'} onOpenLearning={(target) => { setAcademicTarget(target); setTab('academic-learning') }} onOpenReport={(target) => { if (team === 'academic') { setReportTarget(target); setTab('academic-reports') } else { setDailyTarget(target); setTab('daily') } }} />}
    {tab === 'exceptions' && <SupervisionExceptionsSection team={team} user={user} selectedSessionId={exceptionSessionId} />}
    {tab === 'handoff' && <SupervisionHandoffSection team={team} user={user} onOpenException={(sessionId) => { setExceptionSessionId(sessionId); setTab('exceptions') }} />}
    {team === 'administrative' && tab === 'new-students' && <SupervisionNewStudentsSection user={user} />}

    {tab === 'overview' && <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[[UsersRound, 'أعضاء الفريق', peopleTotalQuery.data?.total, 'مشرفون ومديرون'], [CalendarDays, 'الشيفتات', shiftsQuery.data?.total, 'شيفتات ظاهرة لك'], [UserRoundCheck, 'التكليفات الجارية', assignmentsQuery.data?.total, 'علاقة المعلم بمشرفه'], ...(canManage ? [[CalendarDays, 'حلقات اليوم', coverageTodayQuery.data?.total, 'من الجدول الفعلي']] : [])].map(([Icon, label, count, subtitle]) => <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon size={20} /></div><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-3xl font-extrabold text-gray-900">{count ?? '—'}</p><p className="mt-1 text-xs text-gray-400">{subtitle}</p></div>)}
      </div>
      <Section icon={CalendarDays} title="الشيفتات القادمة" description="تعدد المشرفين وتداخل المواعيد متاحان حسب الحاجة" action={<button onClick={() => setTab('shifts')} className="min-h-11 text-sm font-bold text-violet-700">عرض الكل</button>}>
        {shiftsQuery.isError ? <Error message="تعذّر تحميل الشيفتات" /> : shiftsQuery.isLoading ? <p className="text-sm text-gray-500">جارٍ تحميل الشيفتات...</p> : shifts.length ? <div className="space-y-2">{shifts.slice(0, 3).map((row) => <p key={row._id} className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700"><strong>{row.name}</strong> · {dateTime(row.startsAt)} — {dateTime(row.endsAt)} · {row.members?.length || 0} أعضاء</p>)}</div> : <Empty message="لا توجد شيفتات مسجلة للفريق بعد" />}
      </Section>
    </div>}

    {canManage && tab === 'coverage' && <CoverageSection team={team} onAssignments={() => setTab('assignments')} />}
    {canManage && tab === 'activity' && <ActivitySection team={team} />}
    {canManage && tab === 'settings' && <SettingsSection team={team} admin={admin && hasPermission('supervision.manage')} />}

    {tab === 'shifts' && <Section icon={CalendarDays} title="الشيفتات" description="أنشئ أي عدد من الشيفتات، ولو تداخلت، واختر أكثر من عضو للشيفت" action={canManage && <button onClick={() => { setEditingShiftId(null); setShift(initialShift); setShowShift(true) }} className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white"><Plus size={16} /> شيفت جديد</button>}>
      {showShift && <form className="mb-5 space-y-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4" onSubmit={(e) => { e.preventDefault(); saveShift.mutate() }}>
        <div className="grid gap-3 sm:grid-cols-3"><Field label="اسم الشيفت"><input required maxLength={100} value={shift.name} onChange={(e) => setShift({ ...shift, name: e.target.value })} className={inputClass} placeholder="مثال: شيفت المساء" /></Field><Field label="البداية"><input required type="datetime-local" value={shift.startsAt} onChange={(e) => setShift({ ...shift, startsAt: e.target.value })} className={inputClass} /></Field><Field label="النهاية"><input required type="datetime-local" value={shift.endsAt} onChange={(e) => setShift({ ...shift, endsAt: e.target.value })} className={inputClass} /></Field></div>
        <fieldset><legend className="mb-2 text-sm font-semibold text-gray-700">أعضاء الشيفت</legend><input aria-label="بحث عن عضو للشيفت" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className={`mb-3 ${inputClass}`} placeholder="ابحث عن المشرف بالاسم أو البريد" /><div className="flex flex-wrap gap-2">{availableMembers.filter((p) => p.isActive).map((p) => <label key={p._id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${shift.members.includes(p._id) ? 'border-violet-400 bg-violet-100 text-violet-900' : 'border-gray-200 bg-white text-gray-700'}`}><input type="checkbox" checked={shift.members.includes(p._id)} onChange={() => setShift((prev) => ({ ...prev, members: prev.members.includes(p._id) ? prev.members.filter((x) => x !== p._id) : [...prev.members, p._id] }))} />{name(p)}</label>)}</div>{selectableQuery.isError && <Error message="تعذّر البحث عن أعضاء الفريق" />}{!availableMembers.length && !selectableQuery.isLoading && <p className="text-sm text-gray-500">لا يوجد أعضاء مطابقون، جرّب البحث عن الاسم.</p>}</fieldset>
        {selectableQuery.isError && <Error message="تعذّر تحميل أعضاء الفريق؛ أعد فتح الصفحة أو حاول لاحقًا" />}
        <p className="text-xs text-gray-500">المواعيد بتوقيت جهازك، ويُحفظ التوقيت مع الشيفت.</p>
        <div className="flex gap-2"><button disabled={saveShift.isPending || !shift.members.length} className="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white disabled:opacity-50">{saveShift.isPending ? 'جارٍ الحفظ...' : editingShiftId ? 'تحديث الشيفت' : 'حفظ الشيفت'}</button><button type="button" onClick={() => { setShowShift(false); setEditingShiftId(null) }} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-gray-600">إلغاء</button></div>
      </form>}
      <label className="mb-4 flex min-h-11 items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={shiftHistory} onChange={(e) => setShiftHistory(e.target.checked)} /> عرض الشيفتات السابقة والملغاة</label>
      {shiftsQuery.isError ? <Error message="تعذّر تحميل الشيفتات" /> : shiftsQuery.isLoading ? <p className="text-sm text-gray-500">جارٍ التحميل...</p> : shifts.length ? <div className="space-y-3">{shifts.map((row) => <article key={row._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4"><div><h3 className="font-bold text-gray-900">{row.name}{row.cancelledAt && <span className="mr-2 text-xs text-red-600">ملغي</span>}</h3><p className="mt-1 text-sm text-gray-600">{dateTime(row.startsAt)} ← {dateTime(row.endsAt)}</p><p className="mt-1 text-xs text-gray-500">{row.members?.map(name).join('، ') || 'لا يوجد أعضاء'}</p></div>{canManage && !row.cancelledAt && <div className="flex gap-1"><button onClick={() => { setShift({ name: row.name, startsAt: toLocalInput(row.startsAt), endsAt: toLocalInput(row.endsAt), members: row.members.map((p) => p._id) }); setEditingShiftId(row._id); setShowShift(true) }} className="min-h-11 rounded-xl px-3 text-sm text-violet-700 hover:bg-violet-50">تعديل</button><button disabled={cancelShift.isPending} onClick={() => { if (window.confirm('إلغاء هذا الشيفت مع الاحتفاظ بسجله؟')) cancelShift.mutate(row._id) }} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm text-red-600 hover:bg-red-50"><XCircle size={16} /> إلغاء</button></div>}</article>)}</div> : <Empty message="لا توجد شيفتات بعد" />}
    </Section>}

    {tab === 'assignments' && <Section icon={UserRoundCheck} title="تكليفات المعلمين" description="كل تكليف مؤرخ؛ تغيير المشرف يحتفظ بسجل الفترة السابقة" action={canManage && <button onClick={() => setShowAssignment(!showAssignment)} className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white"><Plus size={16} /> تكليف جديد</button>}>
      {showAssignment && <form className="mb-5 space-y-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4" onSubmit={(e) => { e.preventDefault(); createAssignment.mutate() }}>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="ابحث عن المعلم"><input value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} className={inputClass} placeholder="اسم المعلم أو بريده" /></Field><Field label="المعلم"><Select value={assignment.teacherId} onValueChange={(teacherId) => setAssignment({ ...assignment, teacherId })} options={(teachersQuery.data?.data || []).map((p) => ({ value: p._id, label: name(p) }))} placeholder="اختر معلمًا" /></Field><Field label="ابحث عن المشرف"><input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className={inputClass} placeholder="اسم المشرف أو بريده" /></Field><Field label="المشرف المسؤول"><Select value={assignment.supervisorId} onValueChange={(supervisorId) => { setAssignment({ ...assignment, supervisorId }); setSelectedSupervisor(supervisors.find((p) => p._id === supervisorId) || null) }} options={supervisors.map((p) => ({ value: p._id, label: name(p) }))} placeholder="اختر مشرفًا" /></Field><Field label="بداية التكليف"><input required type="datetime-local" value={assignment.startsAt} onChange={(e) => setAssignment({ ...assignment, startsAt: e.target.value })} className={inputClass} /></Field><Field label="النهاية (اختيارية)"><input type="datetime-local" value={assignment.endsAt} onChange={(e) => setAssignment({ ...assignment, endsAt: e.target.value })} className={inputClass} /></Field></div>
        {teachersQuery.isError && <Error message="تعذّر تحميل المعلمين؛ حاول مرة أخرى" />}
        <button disabled={createAssignment.isPending || !assignment.teacherId || !assignment.supervisorId} className="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white disabled:opacity-50">{createAssignment.isPending ? 'جارٍ الحفظ...' : 'حفظ التكليف'}</button>
      </form>}
      <label className="mb-4 flex min-h-11 items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} /> عرض التكليفات السابقة والقادمة</label>
      {assignmentsQuery.isError ? <Error message="تعذّر تحميل التكليفات" /> : assignmentsQuery.isLoading ? <p className="text-sm text-gray-500">جارٍ التحميل...</p> : assignments.length ? <div className="space-y-3">{assignments.map((row) => <article key={row._id} className="rounded-2xl border border-gray-100 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-gray-900">{name(row.teacherId)} <span className="font-normal text-gray-400">←</span> {name(row.supervisorId)}</h3><p className="mt-1 text-sm text-gray-500">{dateTime(row.startsAt)} — {dateTime(row.endsAt)}</p><p className="mt-1 text-xs text-gray-400">{row.primary ? 'المسؤول الأساسي' : 'متابعة إضافية'}</p></div>{canManage && (!row.endsAt || new Date(row.endsAt) > new Date()) && <button onClick={() => { setReplaceId(row._id); setReplacementId('') }} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"><ArrowLeftRight size={16} /> تبديل المشرف</button>}</div>
          <button onClick={() => setExpandedAssignmentId((current) => current === row._id ? null : row._id)} className="mt-2 min-h-11 text-sm font-semibold text-violet-700">{expandedAssignmentId === row._id ? 'إخفاء الطلاب المرتبطين' : 'عرض طلاب المعلم المرتبطين'}</button>
          {expandedAssignmentId === row._id && <div className="mt-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{studentsQuery.isError ? <Error message="تعذّر تحميل الطلاب" /> : studentsQuery.isLoading ? 'جارٍ تحميل الطلاب...' : studentsQuery.data?.data?.length ? <><p className="mb-2 text-xs text-gray-500">{studentsQuery.data.total} طالبًا مرتبطًا بالمعلم عبر الجداول الحالية</p><div className="flex flex-wrap gap-2">{studentsQuery.data.data.map((student) => <span key={student._id} className="rounded-lg bg-white px-2 py-1">{name(student)}</span>)}</div></> : 'لا توجد جداول طلاب مرتبطة بهذا المعلم خلال فترة التكليف'}</div>}
          {replaceId === row._id && <form onSubmit={(e) => { e.preventDefault(); replaceAssignment.mutate() }} className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><Field label="ابحث عن المشرف"><input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className={inputClass} placeholder="اسم المشرف" /></Field><Field label="المشرف الجديد"><Select value={replacementId} onValueChange={(value) => { setReplacementId(value); setSelectedSupervisor(supervisors.find((p) => p._id === value) || null) }} options={supervisors.filter((p) => p._id !== row.supervisorId?._id).map((p) => ({ value: p._id, label: name(p) }))} placeholder="اختر مشرفًا" /></Field><Field label="بدء المسؤولية الجديدة"><input required type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} className={inputClass} /></Field><button disabled={!replacementId || replaceAssignment.isPending} className="min-h-11 self-end rounded-xl bg-violet-600 px-4 text-sm font-bold text-white disabled:opacity-50">تأكيد التبديل</button></form>}
        </article>)}</div> : <Empty message="لا توجد تكليفات في هذا النطاق" />}
    </Section>}

    {tab === 'people' && <Section icon={UsersRound} title={`فريق الإشراف ${TEAMS[team]}`} description="كل عضو له حساب مستقل وصلاحيات مرتبطة بالفريق" action={admin && hasPermission('users.view') && <Link to={ROUTES.ADMIN_ADMINS} className="flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white no-underline"><Plus size={16} /> إدارة الحسابات</Link>}>
      <label className="mb-4 block max-w-sm text-sm font-semibold text-gray-700">بحث في الفريق<input value={peopleSearch} onChange={(e) => { setPeopleSearch(e.target.value); setPeoplePage(1) }} className={`mt-2 ${inputClass}`} placeholder="اسم العضو أو بريده" /></label>
      {editingPerson && personForm && <form onSubmit={(e) => { e.preventDefault(); savePerson.mutate() }} className="mb-5 space-y-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4"><h3 className="font-bold text-gray-900">تعديل {name(members.find((p) => p._id === editingPerson))}</h3><div className="grid gap-3 sm:grid-cols-3"><Field label="الفريق"><select value={personForm.team} onChange={(e) => setPersonForm({ ...personForm, team: e.target.value })} className={inputClass}><option value="academic">أكاديمي</option><option value="administrative">إداري</option></select></Field><Field label="الوظيفة"><select value={personForm.position} onChange={(e) => setPersonForm({ ...personForm, position: e.target.value })} className={inputClass}><option value="supervisor">مشرف</option><option value="manager">مدير إشراف</option></select></Field><Field label="الحالة"><select value={String(personForm.isActive)} onChange={(e) => setPersonForm({ ...personForm, isActive: e.target.value === 'true' })} className={inputClass}><option value="true">نشط</option><option value="false">موقوف</option></select></Field></div><fieldset><legend className="mb-2 text-sm font-semibold text-gray-700">فئات المتابعة</legend><p className="mb-2 text-xs text-gray-500">للتنظيم فقط؛ التكليف المؤرخ هو الذي يحدد الحلقات المسؤولة عنه.</p>{subjectsQuery.isError ? <Error message="تعذّر تحميل الفئات" /> : <div className="flex flex-wrap gap-2">{(subjectsQuery.data?.data || []).map((subject) => <label key={subject.key} className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm"><input type="checkbox" checked={personForm.categories.includes(subject.key)} onChange={() => setPersonForm((old) => ({ ...old, categories: old.categories.includes(subject.key) ? old.categories.filter((x) => x !== subject.key) : [...old.categories, subject.key] }))} />{subject.nameAr}</label>)}</div>}</fieldset><p className="text-xs text-gray-600">نقل عضو أو إيقافه يتطلب أولًا نقل تكليفاته وإزالته من الشيفتات القادمة.</p><div className="flex gap-2"><button disabled={savePerson.isPending || subjectsQuery.isError} className="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white disabled:opacity-50">حفظ</button><button type="button" onClick={() => { setEditingPerson(null); setPersonForm(null) }} className="min-h-11 rounded-xl px-4 text-sm text-gray-600">إلغاء</button></div></form>}
      {peopleQuery.isError ? <Error message="تعذّر تحميل أعضاء الفريق" /> : peopleQuery.isLoading ? <p className="text-sm text-gray-500">جارٍ التحميل...</p> : members.length ? <div className="grid gap-3 sm:grid-cols-2">{members.map((p) => <article key={p._id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">{p.firstNameAr?.[0] || 'م'}</span><div><p className="font-bold text-gray-900">{name(p)}</p><p className="text-xs text-gray-500">{p.supervisionPosition === 'manager' ? 'مدير الإشراف' : 'مشرف'} · {p.isActive ? 'نشط' : 'موقوف'}</p>{p.supervisionCategories?.length > 0 && <p className="mt-1 text-xs text-violet-700">{p.supervisionCategories.map((key) => (subjectsQuery.data?.data || []).find((s) => s.key === key)?.nameAr || key).join('، ')}</p>}</div></div>{admin && hasPermission('admins.update') && hasPermission('permissions.assign') && <button onClick={() => { setEditingPerson(p._id); setPersonForm({ team: p.supervisionTeam, position: p.supervisionPosition, isActive: p.isActive, categories: p.supervisionCategories || [] }) }} className="min-h-11 rounded-xl px-3 text-sm font-bold text-violet-700 hover:bg-violet-50">تعديل</button>}</article>)}</div> : <Empty message="لم يُضف أعضاء لهذا الفريق بعد" />}
      {peopleQuery.data && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500"><span>{peopleQuery.data.total} عضو · الصفحة {peoplePage}</span><div className="flex gap-2"><button disabled={peoplePage === 1} onClick={() => setPeoplePage(peoplePage - 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">السابق</button><button disabled={peoplePage * 50 >= peopleQuery.data.total} onClick={() => setPeoplePage(peoplePage + 1)} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">التالي</button></div></div>}
    </Section>}
    <p className="text-xs text-gray-400">تُعرض أول 50 نتيجة في كل قسم. يمكن إدارة الحسابات من شاشة الفريق، ويُحفظ كل تبديل في سجل النشاط.</p>
  </div>
}
