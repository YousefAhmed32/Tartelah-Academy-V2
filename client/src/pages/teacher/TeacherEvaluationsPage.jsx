import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import { formatDateAr } from '../../utils/date.js'
import { scoreToGrade } from '../../utils/format.js'

const LABEL = 'block text-sm font-semibold text-brand-textBody mb-1.5'

const TYPE_OPTIONS = [
  { value: 'tajweed', label: 'التجويد' },
  { value: 'hifz', label: 'الحفظ' },
  { value: 'nazra', label: 'القراءة' },
  { value: 'behavior', label: 'السلوك' },
  { value: 'general', label: 'عام' },
]

const SCORE_LABELS = {
  1: 'ضعيف جداً', 2: 'ضعيف', 3: 'مقبول', 4: 'مقبول+', 5: 'جيد',
  6: 'جيد+', 7: 'جيد جداً', 8: 'جيد جداً+', 9: 'ممتاز', 10: 'ممتاز+',
}

export default function TeacherEvaluationsPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    studentId: '', type: 'general', score: 8, notesAr: '', strengths: '', improvements: '',
  })
  const qc = useQueryClient()

  const { data: evals = [], isLoading } = useQuery({
    queryKey: ['evaluations', 'teacher'],
    queryFn: () => api.get('/evaluations/teacher').then(r => r.data.data),
  })

  const { data: students = [] } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/evaluations', {
      ...data,
      score: Number(data.score),
      strengths: data.strengths ? data.strengths.split('،').map(s => s.trim()).filter(Boolean) : [],
      improvements: data.improvements ? data.improvements.split('،').map(s => s.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      toast.success('تم إضافة التقييم بنجاح')
      qc.invalidateQueries({ queryKey: ['evaluations', 'teacher'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      setShowModal(false)
      setForm({ studentId: '', type: 'general', score: 8, notesAr: '', strengths: '', improvements: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  return (
    <div>
      <PageHeader
        title="التقييمات"
        subtitle={`${evals.length} تقييم`}
        actions={<Button variant="gold" onClick={() => setShowModal(true)}>+ تقييم جديد</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !evals.length ? (
        <EmptyState
          title="لا توجد تقييمات"
          description="قيّم طلابك لمتابعة تقدمهم الدراسي"
          action={{ label: '+ تقييم جديد', onClick: () => setShowModal(true) }}
          dark
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evals.map((ev) => {
            const grade = scoreToGrade(ev.score)
            const typeLabel = TYPE_OPTIONS.find(t => t.value === ev.type)?.label || ev.type
            return (
              <div
                key={ev._id}
                className="rounded-card p-5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Avatar
                    src={ev.studentId?.avatar}
                    name={`${ev.studentId?.firstNameAr} ${ev.studentId?.lastNameAr}`}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">
                      {ev.studentId?.firstNameAr} {ev.studentId?.lastNameAr}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: '#b3a4d0' }}>
                      <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(124,58,237,0.2)', color: '#c4b5fd' }}>
                        {typeLabel}
                      </span>
                      <span>{formatDateAr(ev.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-center flex-none">
                    <div className="font-heading font-extrabold text-2xl" style={{ color: grade.color }}>{ev.score}</div>
                    <div className="text-[10px]" style={{ color: '#b3a4d0' }}>من ١٠</div>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full mb-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${ev.score * 10}%`, background: grade.color }} />
                </div>
                <div className="text-xs font-semibold" style={{ color: grade.color }}>{grade.label}</div>
                {ev.notesAr && (
                  <p className="text-sm mt-3 pt-3 line-clamp-2" style={{ color: '#b3a4d0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {ev.notesAr}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="إضافة تقييم جديد"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button
              variant="gold"
              onClick={() => createMutation.mutate(form)}
              loading={createMutation.isPending}
              disabled={!form.studentId}
            >
              حفظ التقييم
            </Button>
          </>
        }
      >
        <div className="space-y-5" dir="rtl">
          <div>
            <label className={LABEL}>الطالب <span className="text-red-500">*</span></label>
            <select name="studentId" value={form.studentId} onChange={change} className="field-light w-full">
              <option value="">اختر طالباً...</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>{s.firstNameAr} {s.lastNameAr}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>نوع التقييم</label>
              <select name="type" value={form.type} onChange={change} className="field-light w-full">
                {TYPE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>
                الدرجة:&nbsp;
                <span className="font-extrabold" style={{ color: scoreToGrade(form.score).color }}>
                  {form.score}/١٠
                </span>
                &nbsp;<span className="text-xs text-[#9b7fd6]">({SCORE_LABELS[form.score]})</span>
              </label>
              <input
                type="range"
                name="score"
                min="1"
                max="10"
                step="1"
                value={form.score}
                onChange={change}
                className="w-full h-2 rounded-full accent-brand-purple mt-2"
              />
              <div className="flex justify-between text-xs mt-1 text-[#9b7fd6]">
                <span>١</span><span>٥</span><span>١٠</span>
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL}>الملاحظات</label>
            <textarea
              name="notesAr"
              value={form.notesAr}
              onChange={change}
              rows={3}
              className="field-light resize-none w-full"
              placeholder="أضف ملاحظاتك هنا..."
            />
          </div>

          <div>
            <label className={LABEL}>نقاط القوة</label>
            <input
              type="text"
              name="strengths"
              value={form.strengths}
              onChange={change}
              className="field-light w-full"
              placeholder="مثال: تجويد ممتاز، حفظ قوي — افصل بـ ،"
            />
          </div>

          <div>
            <label className={LABEL}>نقاط التحسين</label>
            <input
              type="text"
              name="improvements"
              value={form.improvements}
              onChange={change}
              className="field-light w-full"
              placeholder="مثال: التركيز، الالتزام — افصل بـ ،"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
