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

const typeOptions = [
  { value: 'tajweed', label: 'التجويد' },
  { value: 'hifz', label: 'الحفظ' },
  { value: 'nazra', label: 'القراءة' },
  { value: 'behavior', label: 'السلوك' },
  { value: 'general', label: 'عام' },
]

export default function TeacherEvaluationsPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ studentId: '', type: 'general', score: 8, notesAr: '', strengths: '', improvements: '' })
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
      setShowModal(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  return (
    <div>
      <PageHeader
        title="التقييمات"
        subtitle="تقييم تقدم الطلاب"
        actions={<Button variant="gold" onClick={() => setShowModal(true)}>+ تقييم جديد</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !evals.length ? (
        <EmptyState
          title="لا توجد تقييمات"
          description="لم يتم إضافة أي تقييمات بعد"
          action={{ label: 'إضافة تقييم', onClick: () => setShowModal(true) }}
          dark
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evals.map((ev) => {
            const grade = scoreToGrade(ev.score)
            return (
              <div key={ev._id} className="rounded-card p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar src={ev.studentId?.avatar} name={`${ev.studentId?.firstNameAr} ${ev.studentId?.lastNameAr}`} size="sm" />
                  <div className="flex-1">
                    <div className="text-white font-semibold">{ev.studentId?.firstNameAr} {ev.studentId?.lastNameAr}</div>
                    <div className="text-xs" style={{ color: '#b3a4d0' }}>{typeOptions.find(t => t.value === ev.type)?.label} • {formatDateAr(ev.createdAt)}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-heading font-extrabold text-2xl" style={{ color: grade.color }}>{ev.score}</div>
                    <div className="text-xs" style={{ color: '#b3a4d0' }}>من ١٠</div>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${ev.score * 10}%`, background: grade.color }} />
                </div>
                {ev.notesAr && <p className="text-sm mt-3" style={{ color: '#b3a4d0' }}>{ev.notesAr}</p>}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة تقييم" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button variant="gold" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>حفظ التقييم</Button>
        </>}
      >
        <div className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">الطالب</label>
            <select name="studentId" value={form.studentId} onChange={change} className="field w-full">
              <option value="">اختر طالباً</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.firstNameAr} {s.lastNameAr}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">نوع التقييم</label>
              <select name="type" value={form.type} onChange={change} className="field w-full">
                {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">الدرجة (من ١٠)</label>
              <input type="number" name="score" min="1" max="10" value={form.score} onChange={change} className="field w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">الملاحظات</label>
            <textarea name="notesAr" value={form.notesAr} onChange={change} rows={3} className="field resize-none w-full" placeholder="أضف ملاحظاتك هنا..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">نقاط القوة (افصل بفاصلة عربية)</label>
            <input type="text" name="strengths" value={form.strengths} onChange={change} className="field w-full" placeholder="مثال: تجويد ممتاز، حفظ قوي" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">نقاط التحسين (افصل بفاصلة عربية)</label>
            <input type="text" name="improvements" value={form.improvements} onChange={change} className="field w-full" placeholder="مثال: التركيز، الالتزام" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
