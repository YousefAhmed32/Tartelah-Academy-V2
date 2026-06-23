import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import { formatDateAr } from '../../utils/date.js'

export default function TeacherHomeworkPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ titleAr: '', descriptionAr: '', dueDate: '', assignedTo: [] })
  const qc = useQueryClient()

  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['homework', 'teacher'],
    queryFn: () => api.get('/homework/teacher').then(r => r.data.data),
  })

  const { data: students = [] } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/homework', data),
    onSuccess: () => {
      toast.success('تم إنشاء الواجب بنجاح')
      qc.invalidateQueries({ queryKey: ['homework', 'teacher'] })
      setShowModal(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }
  function toggleStudent(id) {
    setForm(p => ({
      ...p,
      assignedTo: p.assignedTo.includes(id) ? p.assignedTo.filter(s => s !== id) : [...p.assignedTo, id]
    }))
  }

  return (
    <div>
      <PageHeader
        title="الواجبات"
        subtitle="إدارة وتعيين الواجبات للطلاب"
        actions={<Button variant="gold" onClick={() => setShowModal(true)}>+ واجب جديد</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !homework.length ? (
        <EmptyState
          title="لا توجد واجبات"
          description="لم يتم إنشاء أي واجبات بعد"
          action={{ label: 'إنشاء واجب', onClick: () => setShowModal(true) }}
          dark
        />
      ) : (
        <div className="space-y-3">
          {homework.map((hw) => (
            <div key={hw._id} className="rounded-card p-5 flex items-start justify-between gap-4 flex-wrap" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex-1 min-w-0">
                <div className="text-white font-heading font-bold">{hw.titleAr}</div>
                {hw.descriptionAr && <p className="text-sm mt-1 line-clamp-2" style={{ color: '#b3a4d0' }}>{hw.descriptionAr}</p>}
                <div className="text-xs mt-2 flex items-center gap-4" style={{ color: '#b3a4d0' }}>
                  <span>موعد التسليم: {formatDateAr(hw.dueDate)}</span>
                  <span>المعينون: {hw.assignedTo?.length || 0} طالب</span>
                  <span>المسلّمون: {hw.submissions?.length || 0}</span>
                </div>
              </div>
              <Badge variant={hw.status === 'active' ? 'gold' : 'gray'}>
                {hw.status === 'active' ? 'نشط' : 'منتهي'}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="إنشاء واجب جديد" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button variant="gold" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending} disabled={!form.titleAr || !form.dueDate || !form.assignedTo.length}>إنشاء</Button>
        </>}
      >
        <div className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">عنوان الواجب</label>
            <input type="text" name="titleAr" value={form.titleAr} onChange={change} className="field w-full" placeholder="مثال: مراجعة سورة الكهف" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">الوصف</label>
            <textarea name="descriptionAr" value={form.descriptionAr} onChange={change} rows={3} className="field resize-none w-full" placeholder="تفاصيل الواجب..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">تاريخ التسليم</label>
            <input type="date" name="dueDate" value={form.dueDate} onChange={change} className="field w-full" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">الطلاب المعيّنون</label>
            <div className="max-h-40 overflow-y-auto custom-scroll space-y-2 rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
              {students.map(s => (
                <label key={s._id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.assignedTo.includes(s._id)} onChange={() => toggleStudent(s._id)} className="w-4 h-4 accent-brand-gold" />
                  <span className="text-sm text-white">{s.firstNameAr} {s.lastNameAr}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
