import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

export default function AdminCoursesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ nameAr: '', name: '', descriptionAr: '', level: 'beginner', ageGroup: 'adults', durationWeeks: 12 })
  const qc = useQueryClient()

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: () => api.get('/courses').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/courses', { ...data, durationWeeks: Number(data.durationWeeks) }),
    onSuccess: () => { toast.success('تم إنشاء المقرر'); qc.invalidateQueries({ queryKey: ['admin', 'courses'] }); setShowCreate(false) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/courses/${id}`, { isActive }),
    onSuccess: () => { toast.success('تم تحديث الحالة'); qc.invalidateQueries({ queryKey: ['admin', 'courses'] }) },
  })

  const levelLabels = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' }
  const levelBadge = { beginner: 'success', intermediate: 'purple', advanced: 'gold' }
  const ageLabels = { children: 'أطفال', teens: 'مراهقون', adults: 'بالغون' }

  return (
    <div dir="rtl">
      <PageHeader
        title="المقررات الدراسية"
        subtitle={`${courses.length} مقرر`}
        actions={<Button variant="purple" onClick={() => setShowCreate(true)}>+ مقرر جديد</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div key={c._id} className="card-light p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-bold text-brand-textBody">{c.nameAr}</div>
                  <div className="text-xs text-[#9b7fd6] mt-0.5">{c.name}</div>
                </div>
                <Badge variant={levelBadge[c.level] || 'gray'}>{levelLabels[c.level] || c.level}</Badge>
              </div>
              {c.descriptionAr && <p className="text-sm text-[#9b7fd6] mb-3 line-clamp-2">{c.descriptionAr}</p>}
              <div className="flex items-center gap-3 text-xs text-[#9b7fd6] mb-4">
                <span>👶 {ageLabels[c.ageGroup]}</span>
                <span>⏱️ {c.durationWeeks} أسبوع</span>
                <span>🎓 {c.enrollmentCount || 0} طالب</span>
              </div>
              <button
                onClick={() => toggleMutation.mutate({ id: c._id, isActive: !c.isActive })}
                className="text-xs font-semibold text-brand-purple hover:text-brand-purpleDark transition-colors"
              >
                {c.isActive ? 'إيقاف تفعيل' : 'تفعيل'}
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إضافة مقرر جديد" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>إنشاء</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الاسم بالعربية</label><input name="nameAr" value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} className="field-light w-full" /></div>
            <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الاسم بالإنجليزية</label><input name="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="field-light w-full" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الوصف</label><textarea name="descriptionAr" value={form.descriptionAr} onChange={e => setForm(p => ({ ...p, descriptionAr: e.target.value }))} rows={3} className="field-light resize-none w-full" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-textBody mb-1">المستوى</label>
              <select name="level" value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} className="field-light w-full">
                <option value="beginner">مبتدئ</option>
                <option value="intermediate">متوسط</option>
                <option value="advanced">متقدم</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-textBody mb-1">الفئة العمرية</label>
              <select name="ageGroup" value={form.ageGroup} onChange={e => setForm(p => ({ ...p, ageGroup: e.target.value }))} className="field-light w-full">
                <option value="children">أطفال</option>
                <option value="teens">مراهقون</option>
                <option value="adults">بالغون</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-textBody mb-1">المدة (أسبوع)</label>
              <input type="number" name="durationWeeks" value={form.durationWeeks} onChange={e => setForm(p => ({ ...p, durationWeeks: e.target.value }))} className="field-light w-full" min="1" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
