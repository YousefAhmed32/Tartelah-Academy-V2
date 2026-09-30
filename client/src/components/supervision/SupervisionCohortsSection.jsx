import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderPlus, Plus, Search, UsersRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supervisionService } from '../../services/supervision.service.js'

const personName = (person) => [person?.firstNameAr, person?.lastNameAr].filter(Boolean).join(' ') || '—'
const input = 'min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100'
const button = 'min-h-11 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50'

export default function SupervisionCohortsSection({ team, canManage, onAssignments }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [memberPage, setMemberPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [supervisorSearch, setSupervisorSearch] = useState('')
  const [selectedSupervisor, setSelectedSupervisor] = useState('')
  const [editingMetadata, setEditingMetadata] = useState(false)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const panel = useRef(null)
  const closeRef = useRef(null)
  const list = useQuery({ queryKey: ['supervision', 'cohorts', team, page], queryFn: () => supervisionService.cohorts({ team, page, limit: 20 }) })
  const detail = useQuery({ queryKey: ['supervision', 'cohort', selectedId, memberPage], queryFn: () => supervisionService.cohort(selectedId, { page: memberPage, limit: 50 }), enabled: !!selectedId })
  const students = useQuery({ queryKey: ['supervision', 'students', team, search], queryFn: () => supervisionService.students({ team, search, limit: 50 }), enabled: canManage && (creating || !!selectedId) })
  const supervisors = useQuery({ queryKey: ['supervision', 'cohort-supervisors', team, supervisorSearch], queryFn: () => supervisionService.people({ team, active: true, search: supervisorSearch, limit: 50 }), enabled: canManage && creating })
  const refresh = () => qc.invalidateQueries({ queryKey: ['supervision'] })
  const error = (err) => toast.error(err.response?.data?.message || 'تعذّر حفظ التغيير')
  const create = useMutation({ mutationFn: async () => {
    const response = await supervisionService.createCohort({ team, name, notes, studentIds: selectedStudents })
    const cohortId = response.data.data._id
    if (selectedSupervisor) {
      try { await supervisionService.createAssignment({ team, scopeType: 'cohort', cohortId, supervisorId: selectedSupervisor, startsAt: new Date().toISOString(), primary: true }) }
      catch (err) { err.createdCohortId = cohortId; throw err }
    }
  }, onSuccess: () => { toast.success(selectedSupervisor ? 'تم إنشاء المجموعة وإسنادها' : 'تم إنشاء المجموعة'); setCreating(false); setName(''); setNotes(''); setSelectedStudents([]); setSelectedSupervisor(''); refresh() }, onError: (err) => {
    if (err.createdCohortId) { toast.error('أُنشئت المجموعة لكن تعذّر إسنادها. افتحها لإكمال التكليف.'); setCreating(false); setSelectedId(err.createdCohortId); refresh() }
    else error(err)
  } })
  const add = useMutation({ mutationFn: () => supervisionService.addCohortMembers(selectedId, selectedStudents), onSuccess: () => { toast.success('تمت إضافة الطلاب'); setSelectedStudents([]); refresh() }, onError: error })
  const remove = useMutation({ mutationFn: (studentId) => supervisionService.removeCohortMember(selectedId, studentId), onSuccess: () => { toast.success('أُزيل الطالب مع حفظ سجل عضويته'); refresh() }, onError: error })
  const deactivate = useMutation({ mutationFn: () => supervisionService.updateCohort(selectedId, { isActive: false }), onSuccess: () => { toast.success('تم إغلاق المجموعة والتكليف المرتبط بها'); refresh() }, onError: error })
  const reactivate = useMutation({ mutationFn: () => supervisionService.updateCohort(selectedId, { isActive: true }), onSuccess: () => { toast.success('أُعيد فتح المجموعة. أضف الطلاب والتكليف الجديد.'); refresh() }, onError: error })
  const saveMetadata = useMutation({ mutationFn: () => supervisionService.updateCohort(selectedId, { name: editName, notes: editNotes }), onSuccess: () => { toast.success('تم تحديث بيانات المجموعة'); setEditingMetadata(false); refresh() }, onError: error })
  const activeIds = new Set((detail.data?.members || []).map((member) => String(member.studentId?._id || member.studentId)))
  const close = () => { setCreating(false); setSelectedId(null); setMemberPage(1); setSelectedStudents([]); setSearch(''); setSupervisorSearch(''); setSelectedSupervisor(''); setEditingMetadata(false) }
  closeRef.current = close
  useEffect(() => {
    if (!creating && !selectedId) return undefined
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector('button')?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') closeRef.current?.()
      if (event.key !== 'Tab') return
      const elements = [...panel.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]')]
      if (!elements.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.() }
  }, [creating, selectedId])

  return <section dir="rtl" className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div><h2 className="font-heading text-lg font-extrabold text-gray-950">مجموعات الطلاب</h2><p className="mt-1 text-sm text-gray-600">اجمع طلابًا من معلمين مختلفين، ثم أسند المجموعة لمشرف من شاشة التكليفات.</p></div>{canManage && <button type="button" onClick={() => { close(); setCreating(true) }} className={button}><FolderPlus size={16} className="ml-2 inline" aria-hidden="true" />مجموعة جديدة</button>}</header>
    {list.isLoading && <p className="rounded-2xl bg-white p-6 text-sm text-gray-600">جارٍ تحميل المجموعات...</p>}
    {list.isError && <p role="alert" className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">تعذر تحميل المجموعات. <button onClick={() => list.refetch()} className="underline">إعادة المحاولة</button></p>}
    {!list.isLoading && !list.isError && !(list.data?.data || []).length && <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">لا توجد مجموعات بعد.</p>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(list.data?.data || []).map((row) => <button key={row._id} type="button" onClick={() => { close(); setSelectedId(row._id) }} className="rounded-2xl border border-gray-200 bg-white p-5 text-right shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700"><span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><UsersRound size={19} aria-hidden="true" /></span><strong className="block text-base text-gray-950">{row.name}</strong><span className="mt-2 block text-sm text-gray-600">{row.memberCount} طالب · {row.assignment ? personName(row.assignment.supervisorId) : 'لم تُسند بعد'}</span><span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${row.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>{row.isActive ? 'نشطة' : 'مغلقة'}</span></button>)}</div>
    {list.data?.totalPages > 1 && <nav aria-label="صفحات المجموعات" className="flex items-center gap-2 text-sm"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-40">السابق</button><span>صفحة {page} من {list.data.totalPages}</span><button disabled={!list.data.hasMore} onClick={() => setPage(page + 1)} className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-40">التالي</button></nav>}
    {(creating || selectedId) && <div className="fixed inset-0 z-50 bg-gray-950/40" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><aside ref={panel} role="dialog" aria-modal="true" aria-label={creating ? 'مجموعة جديدة' : 'تفاصيل المجموعة'} className="fixed inset-y-0 right-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-gray-100 p-5"><div><h3 className="font-heading text-xl font-extrabold text-gray-950">{creating ? 'مجموعة جديدة' : detail.data?.name || 'المجموعة'}</h3><p className="mt-1 text-sm text-gray-600">{creating ? 'يمكن إضافة الطلاب الآن أو لاحقًا' : `${detail.data?.total || 0} طالب في هذه المجموعة`}</p></div><button type="button" onClick={close} aria-label="إغلاق" className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200"><X size={19} /></button></header><div className="flex-1 space-y-5 overflow-y-auto p-5">
      {creating && <><label className="block text-sm font-bold text-gray-800">اسم المجموعة<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={`mt-2 ${input}`} placeholder="مثال: مجموعة التجويد المسائية" /></label><label className="block text-sm font-bold text-gray-800">ملاحظات اختيارية<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} className={`mt-2 ${input}`} rows={2} /></label><div className="space-y-2"><label className="block text-sm font-bold text-gray-800">إسناد المجموعة لمشرف عند إنشائها<input value={supervisorSearch} onChange={(event) => setSupervisorSearch(event.target.value)} className={`mt-2 ${input}`} placeholder="ابحث عن مشرف" /></label><select value={selectedSupervisor} onChange={(event) => setSelectedSupervisor(event.target.value)} className={input} aria-label="المشرف المسؤول عن المجموعة"><option value="">بدون إسناد الآن</option>{(supervisors.data?.data || []).filter((person) => person.supervisionPosition === 'supervisor').map((person) => <option key={person._id} value={person._id}>{personName(person)}</option>)}</select>{supervisors.isError && <p role="alert" className="text-sm text-red-700">تعذر تحميل المشرفين. يمكنك إنشاء المجموعة ثم إسنادها لاحقًا.</p>}</div></>}
      {detail.isError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">تعذّر تحميل تفاصيل المجموعة</p>}
      {selectedId && detail.data && canManage && <div>
        {editingMetadata ? <form onSubmit={(event) => { event.preventDefault(); saveMetadata.mutate() }} className="space-y-3">
          <label className="block text-sm font-bold text-gray-800">اسم المجموعة<input required maxLength={100} value={editName} onChange={(event) => setEditName(event.target.value)} className={`mt-2 ${input}`} /></label>
          <label className="block text-sm font-bold text-gray-800">الملاحظات<textarea maxLength={500} rows={2} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} className={`mt-2 ${input}`} /></label>
          <div className="flex gap-2"><button disabled={saveMetadata.isPending || !editName.trim()} className={button}>حفظ البيانات</button><button type="button" onClick={() => setEditingMetadata(false)} className="min-h-11 px-3 text-sm font-bold text-gray-600">إلغاء التعديل</button></div>
        </form> : <><p className="mb-2 text-sm text-gray-600">{detail.data.notes}</p><button type="button" onClick={() => { setEditName(detail.data.name); setEditNotes(detail.data.notes || ''); setEditingMetadata(true) }} className="min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-800">تعديل بيانات المجموعة</button></>}
        {!detail.data.isActive && <div className="mt-4 rounded-xl bg-amber-50 p-3"><p className="mb-2 text-sm text-amber-900">إعادة الفتح تحفظ السجل السابق. أضف الطلاب وأسند مشرفًا من جديد.</p><button type="button" disabled={reactivate.isPending} onClick={() => reactivate.mutate()} className={button}>إعادة فتح المجموعة</button></div>}
      </div>}
      {selectedId && detail.data?.members?.length > 0 && <div><h4 className="mb-2 text-sm font-bold text-gray-950">الطلاب الحاليون</h4><div className="space-y-2">{detail.data.members.map((member) => <div key={member._id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3 text-sm"><span>{personName(member.studentId)}</span>{canManage && detail.data.isActive && <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(member.studentId?._id)} className="min-h-11 px-2 font-bold text-red-700">إزالة</button>}</div>)}</div>{detail.data.total > 50 && <nav aria-label="صفحات أعضاء المجموعة" className="mt-3 flex items-center gap-3 text-xs text-gray-700"><button type="button" disabled={memberPage <= 1} onClick={() => setMemberPage((value) => value - 1)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">السابق</button><span>صفحة {memberPage} من {Math.ceil(detail.data.total / 50)}</span><button type="button" disabled={memberPage * 50 >= detail.data.total} onClick={() => setMemberPage((value) => value + 1)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">التالي</button></nav>}</div>}
      {canManage && (creating || detail.data?.isActive) && <div><label className="block text-sm font-bold text-gray-800">ابحث لإضافة طلاب<div className="relative mt-2"><Search size={17} className="absolute right-3 top-3.5 text-gray-400" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${input} pr-10`} placeholder="اسم الطالب أو بريده" /></div></label><p className="mt-2 text-xs text-gray-600">يمكن اختيار عدة طلاب. المجموعة الواحدة لكل فريق تحفظ تاريخ العضوية.</p>{students.isError && <p role="alert" className="mt-3 text-sm text-red-700">تعذر تحميل الطلاب</p>}<div className="mt-3 max-h-64 space-y-1 overflow-y-auto">{(students.data?.data || []).filter((student) => !activeIds.has(student._id)).map((student) => <label key={student._id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm hover:bg-gray-50"><input type="checkbox" checked={selectedStudents.includes(student._id)} onChange={() => setSelectedStudents((current) => current.includes(student._id) ? current.filter((value) => value !== student._id) : [...current, student._id])} /><span>{personName(student)}</span></label>)}</div></div>}
      {selectedId && canManage && detail.data?.isActive && <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { const cohortId = selectedId; const assignmentId = list.data?.data?.find((row) => row._id === cohortId)?.assignment?._id; close(); onAssignments?.({ cohortId, assignmentId }) }} className="min-h-11 rounded-xl border border-violet-200 px-4 text-sm font-bold text-violet-700">إسناد المجموعة أو تبديل مشرفها</button><button type="button" disabled={deactivate.isPending} onClick={() => { if (window.confirm('إغلاق المجموعة والتكليفات المرتبطة بها؟ سيبقى السجل محفوظًا.')) deactivate.mutate() }} className="min-h-11 text-sm font-bold text-red-700">إغلاق المجموعة</button></div>}
    </div>{canManage && (creating || detail.data?.isActive) && <footer className="flex gap-2 border-t border-gray-100 p-5"><button type="button" disabled={creating ? create.isPending || !name.trim() : add.isPending || !selectedStudents.length} onClick={() => creating ? create.mutate() : add.mutate()} className={button}><Plus size={16} className="ml-2 inline" aria-hidden="true" />{creating ? 'إنشاء المجموعة' : `إضافة ${selectedStudents.length} طالب`}</button><button type="button" onClick={close} className="min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-bold">إلغاء</button></footer>}</aside></div>}
  </section>
}
