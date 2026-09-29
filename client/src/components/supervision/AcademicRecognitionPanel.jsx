import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supervisionService } from '../../services/supervision.service.js'

const name = (row) => row ? `${row.firstNameAr || ''} ${row.lastNameAr || ''}`.trim() : '—'
const input = 'min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm'
const key = (row) => `${row.personId}:${row.sourceReportId}`

export default function AcademicRecognitionPanel({ start }) {
  const qc = useQueryClient()
  const [students, setStudents] = useState([])
  const [maleTeacher, setMaleTeacher] = useState('')
  const [femaleTeacher, setFemaleTeacher] = useState('')
  const [note, setNote] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const query = useQuery({ queryKey: ['supervision', 'academic-recognition', start], queryFn: () => supervisionService.academicRecognition(start) })
  useEffect(() => {
    const row = query.data?.row
    if (!row) { setStudents([]); setMaleTeacher(''); setFemaleTeacher(''); setNote(''); return }
    setStudents(row.students?.map(key) || [])
    setMaleTeacher(row.maleTeacher ? key(row.maleTeacher) : '')
    setFemaleTeacher(row.femaleTeacher ? key(row.femaleTeacher) : '')
    setNote(row.note || '')
  }, [query.data])
  const candidates = query.data?.candidates
  const selection = (value, rows) => rows.find((row) => key(row) === value)
  const save = useMutation({ mutationFn: () => supervisionService.saveAcademicRecognition({ start,
    students: students.map((value) => selection(value, candidates.students)).filter(Boolean).map(({ personId, sourceReportId, reason }) => ({ personId, sourceReportId, reason })),
    maleTeacher: maleTeacher ? selection(maleTeacher, candidates.teachers) : null,
    femaleTeacher: femaleTeacher ? selection(femaleTeacher, candidates.teachers) : null,
    note, changeReason,
  }), onSuccess: () => { toast.success('حُفظ اختيار المدير بسجل النسخ'); setChangeReason(''); qc.invalidateQueries({ queryKey: ['supervision', 'academic-recognition', start] }) },
  onError: (err) => toast.error(err.response?.data?.message || 'تعذر حفظ الاختيارات') })
  return <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><h3 className="text-lg font-bold text-gray-900">اختيارات التميز الشهرية</h3><p className="mt-1 text-sm leading-6 text-gray-600">مدير الأكاديمي يختار حتى 10 طلاب ومعلمًا ومعلمة من ترشيحات R4 المعتمدة. لا يجري النظام ترتيب نقاط ولا ينشر هذه القائمة تلقائيًا.</p>
    {query.data?.sourcesChanged && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">تغيّرت نسخة تقرير R4 أو ترشيح مصدر اختيار سابق. الاختيار المحفوظ لم يتغير؛ راجعه قبل تعديله.</p>}
    {query.isLoading && <p className="mt-4 text-sm">جارٍ تحميل الترشيحات...</p>}{query.isError && <p role="alert" className="mt-4 text-sm text-red-700">تعذر تحميل الترشيحات.</p>}
    {candidates && <div className="mt-4 space-y-4"><div><h4 className="font-bold">الطلاب المختارون ({students.length}/10)</h4><div className="mt-2 grid gap-2 sm:grid-cols-2">{candidates.students.map((row) => <label key={key(row)} className="flex min-h-11 items-center gap-2 rounded-xl border p-3 text-sm"><input type="checkbox" checked={students.includes(key(row))} disabled={!students.includes(key(row)) && students.length >= 10} onChange={() => setStudents(students.includes(key(row)) ? students.filter((value) => value !== key(row)) : [...students, key(row)])} /><span><strong>{name(row.person)}</strong> · {row.reason}{row.evidence && <small className="block text-gray-600">الدليل: {row.evidence}</small>}</span></label>)}</div>{!candidates.students.length && <p className="mt-2 text-sm text-gray-500">لا توجد ترشيحات طلاب معتمدة لهذا الشهر.</p>}</div>
      {[['male', 'المعلم المتميز', maleTeacher, setMaleTeacher], ['female', 'المعلمة المتميزة', femaleTeacher, setFemaleTeacher]].map(([gender, label, value, setter]) => <label key={gender} className="block text-sm font-semibold">{label}<select className={input} value={value} onChange={(event) => setter(event.target.value)}><option value="">لم يُحدد</option>{candidates.teachers.filter((row) => row.person?.gender === gender).map((row) => <option key={key(row)} value={key(row)}>{name(row.person)} · {row.reason}</option>)}</select></label>)}
      <label className="block text-sm font-semibold">ملاحظة المدير<textarea className={input} rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {query.data.row && <label className="block text-sm font-semibold">سبب تعديل الاختيار السابق<input className={input} value={changeReason} maxLength={1000} onChange={(event) => setChangeReason(event.target.value)} /></label>}
      <button className="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white disabled:opacity-50" disabled={save.isPending || !students.length || !!query.data.row && !changeReason.trim()} onClick={() => save.mutate()}>اعتماد الاختيارات</button>
      {query.data.row && <p className="text-xs text-gray-600">النسخة {query.data.row.version} · أي تعديل يحتفظ بالاختيارات السابقة وسبب التغيير ({query.data.row.revisions?.length || 0} تعديلات).</p>}</div>}
  </section>
}
