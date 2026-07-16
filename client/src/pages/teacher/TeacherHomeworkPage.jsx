import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckSquare, Users, Clock, Star, Paperclip } from 'lucide-react'
import api from '../../utils/api.js'
import { downloadPrivateFile } from '../../utils/privateMedia.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import { formatDateAr } from '../../utils/date.js'
import { toArray } from '../../utils/format.js'

const LABEL = 'block text-sm font-semibold text-brand-textBody mb-1.5'

// ── Grade Submissions Modal ───────────────────────────────────────────────────

function GradeSubmissionsModal({ hw, students, onClose }) {
  const qc = useQueryClient()
  const [grades, setGrades] = useState({}) // submissionId → { grade, feedback }

  const setGrade = (subId, field, val) => {
    setGrades(p => ({ ...p, [subId]: { ...p[subId], [field]: val } }))
  }

  const gradeMut = useMutation({
    mutationFn: ({ subId, grade, teacherFeedback }) =>
      api.patch(`/homework/${hw._id}/grade`, { submissionId: subId, grade, teacherFeedback }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homework', 'teacher'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const handleGrade = async (subId) => {
    const g = grades[subId]
    if (!g?.grade) return toast.error('أدخل الدرجة')
    await gradeMut.mutateAsync({ subId, grade: g.grade, teacherFeedback: g.feedback || '' })
    toast.success('تم التصحيح')
  }

  const getStudentName = (studentId) => {
    const s = students.find(st => st._id === (studentId?._id || studentId))
    return s ? `${s.firstNameAr} ${s.lastNameAr}` : 'طالب'
  }

  const submissions = hw.submissions || []
  const assignedCount = hw.assignedTo?.length || 0
  const submittedCount = submissions.length

  return (
    <Modal open onClose={onClose} title={`تصحيح: ${hw.titleAr}`} size="md"
      footer={<Button variant="ghost" className="!bg-gray-100 !text-gray-600 hover:!bg-gray-200 !border-transparent" onClick={onClose}>إغلاق</Button>}>
      <div className="space-y-4" dir="rtl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl">
            <div className="font-bold text-xl text-gray-900">{assignedCount}</div>
            <div className="text-xs text-gray-500">معيّن</div>
          </div>
          <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-xl">
            <div className="font-bold text-xl text-emerald-700">{submittedCount}</div>
            <div className="text-xs text-emerald-600">سلّم</div>
          </div>
          <div className="flex flex-col items-center p-3 bg-amber-50 rounded-xl">
            <div className="font-bold text-xl text-amber-600">{assignedCount - submittedCount}</div>
            <div className="text-xs text-amber-500">لم يسلّم</div>
          </div>
        </div>

        {/* Submissions */}
        {submissions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckSquare size={32} className="mx-auto mb-2 opacity-40" />
            <p>لا توجد تسليمات حتى الآن</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {submissions.map((sub) => {
              const isGraded = !!sub.grade
              const localGrade = grades[sub._id]
              return (
                <div key={sub._id} className={`p-4 rounded-xl border ${isGraded ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-gray-900 text-sm">{getStudentName(sub.studentId)}</div>
                    </div>
                    {isGraded && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                        <Star size={11} /> {sub.grade}/10
                      </span>
                    )}
                  </div>

                  {/* Submission content */}
                  {sub.content && (
                    <div className="text-sm text-gray-600 bg-white rounded-lg p-3 mb-3 border border-gray-100">
                      {sub.content}
                    </div>
                  )}

                  {/* Attachments — private files, downloaded with an authenticated request */}
                  {sub.attachments?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sub.attachments.map((att, i) => (
                        <button
                          key={i}
                          onClick={() => downloadPrivateFile(att.fileId, att.originalName)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                          <Paperclip size={12} />
                          {att.originalName || `ملف ${i + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Teacher feedback display */}
                  {isGraded && sub.teacherFeedback && (
                    <div className="text-xs text-emerald-600 mb-3">
                      <span className="font-semibold">ملاحظاتك: </span>{sub.teacherFeedback}
                    </div>
                  )}

                  {/* Grade form */}
                  {!isGraded && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="number" min="0" max="10" step="0.5"
                          className="w-24 h-9 bg-white border border-gray-200 rounded-lg px-3 text-sm text-gray-800 outline-none focus:border-violet-400 text-center"
                          placeholder="درجة/10"
                          value={localGrade?.grade || ''}
                          onChange={e => setGrade(sub._id, 'grade', e.target.value)} />
                        <input
                          className="flex-1 h-9 bg-white border border-gray-200 rounded-lg px-3 text-sm text-gray-800 outline-none focus:border-violet-400"
                          placeholder="ملاحظات (اختياري)"
                          value={localGrade?.feedback || ''}
                          onChange={e => setGrade(sub._id, 'feedback', e.target.value)} />
                        <button onClick={() => handleGrade(sub._id)} disabled={gradeMut.isPending}
                          className="h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-60">
                          {gradeMut.isPending ? <Spinner size="xs" color="border-white" /> : <CheckSquare size={13} />}
                          تصحيح
                        </button>
                      </div>
                    </div>
                  )}

                  {isGraded && (
                    <div className="text-xs text-gray-400 mt-1">صُحِّح في {formatDateAr(sub.gradedAt)}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeacherHomeworkPage() {
  const [showModal, setShowModal] = useState(false)
  const [gradeHw, setGradeHw] = useState(null)
  const [form, setForm] = useState({ titleAr: '', descriptionAr: '', dueDate: '', assignedTo: [] })
  const qc = useQueryClient()

  const { data: homework = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['homework', 'teacher'],
    queryFn: () => api.get('/homework/teacher').then(r => toArray(r.data?.data)),
  })

  const { data: students = [] } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => toArray(r.data?.data)),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/homework', data),
    onSuccess: () => {
      toast.success('تم إنشاء الواجب بنجاح')
      qc.invalidateQueries({ queryKey: ['homework', 'teacher'] })
      setShowModal(false)
      setForm({ titleAr: '', descriptionAr: '', dueDate: '', assignedTo: [] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }
  function toggleStudent(id) {
    setForm(p => ({
      ...p,
      assignedTo: p.assignedTo.includes(id) ? p.assignedTo.filter(s => s !== id) : [...p.assignedTo, id],
    }))
  }

  const now = new Date()

  return (
    <div>
      <PageHeader
        title="الواجبات"
        subtitle={`${homework.length} واجب`}
        actions={<Button variant="purple" onClick={() => setShowModal(true)}>+ واجب جديد</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : isError ? (
        <ErrorState onRetry={refetch} isRetrying={isFetching} />
      ) : !homework.length ? (
        <EmptyState
          title="لا توجد واجبات"
          description="عيّن واجبات لمتابعة تقدم طلابك"
          action={{ label: '+ واجب جديد', onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="space-y-3">
          {homework.map((hw) => {
            const isOverdue = new Date(hw.dueDate) < now && hw.status !== 'completed'
            const submittedCount = hw.submissions?.length || 0
            const assignedCount = hw.assignedTo?.length || 0
            const ungradedCount = hw.submissions?.filter(s => !s.grade).length || 0
            return (
              <div
                key={hw._id}
                className="rounded-2xl p-5 flex items-start justify-between gap-4 flex-wrap bg-white border border-gray-100 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-heading font-bold">{hw.titleAr}</div>
                  {hw.descriptionAr && (
                    <p className="text-sm mt-1 line-clamp-2 text-gray-500">{hw.descriptionAr}</p>
                  )}
                  <div className="text-xs mt-2 flex items-center gap-4 flex-wrap text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      التسليم: <span className={isOverdue ? 'text-red-500 font-semibold' : ''}>{formatDateAr(hw.dueDate)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {assignedCount} طالب
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckSquare size={11} />
                      {submittedCount}/{assignedCount} سلّم
                    </span>
                    {ungradedCount > 0 && (
                      <span className="text-amber-600 font-semibold">{ungradedCount} بانتظار التصحيح</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  {submittedCount > 0 && (
                    <button onClick={() => setGradeHw(hw)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors border border-amber-200">
                      <Star size={12} />
                      {ungradedCount > 0 ? `تصحيح (${ungradedCount})` : 'عرض التسليمات'}
                    </button>
                  )}
                  <Badge variant={isOverdue ? 'danger' : hw.status === 'active' ? 'purple' : 'gray'}>
                    {isOverdue ? 'منتهية' : hw.status === 'active' ? 'نشط' : 'منتهٍ'}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Grade Modal */}
      {gradeHw && <GradeSubmissionsModal hw={gradeHw} students={students} onClose={() => setGradeHw(null)} />}

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إنشاء واجب جديد" size="md"
        footer={<>
          <Button variant="ghost" className="!bg-gray-100 !text-gray-600 hover:!bg-gray-200 !border-transparent" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}
            disabled={!form.titleAr || !form.dueDate || !form.assignedTo.length}>
            إنشاء الواجب
          </Button>
        </>}>
        <div className="space-y-4" dir="rtl">
          <div>
            <label className={LABEL}>عنوان الواجب <span className="text-red-500">*</span></label>
            <input type="text" name="titleAr" value={form.titleAr} onChange={change}
              className="field-light w-full" placeholder="مثال: مراجعة سورة الكهف" />
          </div>
          <div>
            <label className={LABEL}>الوصف</label>
            <textarea name="descriptionAr" value={form.descriptionAr} onChange={change} rows={3}
              className="field-light resize-none w-full" placeholder="تفاصيل الواجب والتعليمات..." />
          </div>
          <div>
            <label className={LABEL}>تاريخ التسليم <span className="text-red-500">*</span></label>
            <input type="date" name="dueDate" value={form.dueDate} onChange={change} className="field-light w-full" />
          </div>
          <div>
            <label className={LABEL}>
              الطلاب المعيّنون <span className="text-red-500">*</span>
              {form.assignedTo.length > 0 && <span className="font-normal text-[#9b7fd6] mr-1">({form.assignedTo.length} محدد)</span>}
            </label>
            {!students.length ? (
              <p className="text-sm text-amber-600 py-2">لا يوجد طلاب مُعيَّنون لك بعد</p>
            ) : (
              <div className="max-h-44 overflow-y-auto custom-scroll space-y-2 rounded-xl p-3 border"
                style={{ background: '#faf8ff', borderColor: '#e8e0f5' }}>
                {students.map(s => (
                  <label key={s._id} className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-[#f0eaff] transition-colors">
                    <input type="checkbox" checked={form.assignedTo.includes(s._id)} onChange={() => toggleStudent(s._id)}
                      className="w-4 h-4 accent-brand-purple rounded" />
                    <span className="text-sm font-medium text-brand-textBody">{s.firstNameAr} {s.lastNameAr}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
