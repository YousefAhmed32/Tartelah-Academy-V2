import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr } from '../../utils/date.js'

const SURAH_NAMES = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه']
const qualityOptions = [
  { value: 'excellent', label: 'ممتاز', color: '#22c55e' },
  { value: 'good', label: 'جيد', color: '#7c3aed' },
  { value: 'fair', label: 'مقبول', color: '#f59e0b' },
  { value: 'weak', label: 'ضعيف', color: '#ef4444' },
]

export default function TeacherProgressPage() {
  const [activeTab, setActiveTab] = useState('memorization')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ studentId: '', surahNumber: 1, fromAyah: 1, toAyah: 7, quality: 'good', teacherNotes: '' })
  const qc = useQueryClient()

  const { data: records = [], isLoading } = useQuery({
    queryKey: [activeTab, 'teacher'],
    queryFn: () => api.get(`/${activeTab}/teacher`).then(r => r.data.data),
  })

  const { data: students = [] } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/${activeTab}`, data),
    onSuccess: () => {
      toast.success('تم تسجيل التقدم بنجاح')
      qc.invalidateQueries({ queryKey: [activeTab, 'teacher'] })
      setShowModal(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  const qualityColor = { excellent: '#22c55e', good: '#7c3aed', fair: '#f59e0b', weak: '#ef4444' }
  const qualityLabel = { excellent: 'ممتاز', good: 'جيد', fair: 'مقبول', weak: 'ضعيف' }

  return (
    <div>
      <PageHeader
        title="التقدم الدراسي"
        subtitle="تسجيل الحفظ والمراجعة"
        actions={<Button variant="gold" onClick={() => setShowModal(true)}>+ تسجيل تقدم</Button>}
      />

      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {[['memorization', 'الحفظ'], ['revision', 'المراجعة']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2 rounded-[10px] text-sm font-semibold transition-all ${activeTab === key ? 'bg-brand-gold text-brand-goldText' : 'text-white/60 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !records.length ? (
        <div className="text-center py-16" style={{ color: '#b3a4d0' }}>
          <div className="text-4xl mb-3">📖</div>
          <p>لا توجد سجلات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r._id} className="rounded-card p-4 flex items-center gap-4 flex-wrap" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Avatar src={r.studentId?.avatar} name={`${r.studentId?.firstNameAr} ${r.studentId?.lastNameAr}`} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold">{r.studentId?.firstNameAr} {r.studentId?.lastNameAr}</div>
                <div className="text-xs mt-0.5" style={{ color: '#b3a4d0' }}>
                  {SURAH_NAMES[r.surahNumber - 1] || `سورة ${r.surahNumber}`} • آية {r.fromAyah} - {r.toAyah} • {formatDateAr(r.recordedAt)}
                </div>
              </div>
              <span className="text-sm font-bold" style={{ color: qualityColor[r.quality] }}>{qualityLabel[r.quality]}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`تسجيل ${activeTab === 'memorization' ? 'حفظ' : 'مراجعة'}`} size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button variant="gold" onClick={() => createMutation.mutate({ ...form, surahNumber: Number(form.surahNumber), fromAyah: Number(form.fromAyah), toAyah: Number(form.toAyah) })} loading={createMutation.isPending}>حفظ</Button>
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">السورة</label>
              <input type="number" name="surahNumber" min="1" max="114" value={form.surahNumber} onChange={change} className="field w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">من آية</label>
              <input type="number" name="fromAyah" min="1" value={form.fromAyah} onChange={change} className="field w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">إلى آية</label>
              <input type="number" name="toAyah" min="1" value={form.toAyah} onChange={change} className="field w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">الجودة</label>
            <div className="flex gap-2 flex-wrap">
              {qualityOptions.map(q => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, quality: q.value }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={form.quality === q.value ? { background: `${q.color}25`, color: q.color, border: `1px solid ${q.color}60` } : { border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">ملاحظات</label>
            <textarea name="teacherNotes" value={form.teacherNotes} onChange={change} rows={2} className="field resize-none w-full" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
